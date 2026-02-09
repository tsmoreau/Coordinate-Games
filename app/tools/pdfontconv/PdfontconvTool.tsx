"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, RotateCcw, ChevronDown, ChevronRight, Plus, Trash2, Type } from 'lucide-react';

const FONT_FAMILY = 'pdfontconv';
const DEFAULT_CHARSET = Array.from(' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~');

interface FontInput {
  fontDataBytes: Uint8Array | null;
  baseName: string;
  fontSize: number;
  opacityThreshold: number;
  charSet: string[];
}

interface FontData {
  charSet: string[];
  widths: number[];
  offsetX: number;
  tracking: number;
  cellSizeX: number;
  cellSizeY: number;
  kerning: Record<string, number>;
}

function encodeBase64(array: Uint8Array): string {
  const bytesAsChars: string[] = [];
  for (let i = 0; i < array.length; i++) {
    bytesAsChars.push(String.fromCharCode(array[i]));
  }
  return btoa(bytesAsChars.join(''));
}

function decodeBase64(str: string): Uint8Array {
  const bytesAsString = atob(str);
  const array = new Uint8Array(bytesAsString.length);
  for (let i = 0; i < bytesAsString.length; i++) {
    array[i] = bytesAsString.charCodeAt(i);
  }
  return array;
}

function stripExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.substring(0, dotIndex) : fileName;
}

function extractFilename(path: string): string {
  let p = path;
  const slashIndex = p.lastIndexOf('/');
  if (slashIndex >= 0) p = p.substring(slashIndex + 1);
  const backslashIndex = p.lastIndexOf('\\');
  if (backslashIndex >= 0) p = p.substring(backslashIndex + 1);
  return p;
}

function computeKerning(context: CanvasRenderingContext2D, charSet: string[]): Record<string, number> {
  const kerning: Record<string, number> = {};
  for (const left of charSet) {
    const leftWidth = context.measureText(left).width;
    for (const right of charSet) {
      const pair = left + right;
      const rightWidth = context.measureText(right).width;
      const pairWidth = context.measureText(pair).width;
      const kern = Math.round(pairWidth - leftWidth - rightWidth);
      if (kern !== 0) {
        kerning[pair] = kern;
      }
    }
  }
  return kerning;
}

function downloadFile(fileName: string, mimeType: string, data: Uint8Array) {
  const a = document.createElement('a');
  a.href = `data:${mimeType};base64,${encodeBase64(data)}`;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Common kerning pairs worth checking
const COMMON_KERN_PAIRS = [
  'AV', 'AW', 'AY', 'AT', 'AC', 'AG', 'AO', 'AQ', 'AU',
  'FA', 'FO', 'Fe', 'Fo', 'Fr', 'Fi',
  'LT', 'LV', 'LW', 'LY',
  'PA', 'Po',
  'TA', 'TO', 'Ta', 'Te', 'Ti', 'To', 'Tr', 'Tu', 'Tw', 'Ty',
  'VA', 'Va', 'Ve', 'Vi', 'Vo', 'Vu',
  'WA', 'Wa', 'We', 'Wi', 'Wo',
  'YA', 'Ya', 'Ye', 'Yi', 'Yo', 'Yu',
  'ov', 'ow', 'ox',
  'we', 'wo',
  'yo', 'ya',
];

export default function PdfontconvTool() {
  const [fontInput, setFontInput] = useState<FontInput>({
    fontDataBytes: null,
    baseName: '',
    fontSize: 24,
    opacityThreshold: 128,
    charSet: [...DEFAULT_CHARSET],
  });

  const [displayScale, setDisplayScale] = useState(2);
  const [sampleText, setSampleText] = useState('The quick brown fox jumps over the lazy dog.');
  const [fontLoaded, setFontLoaded] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // --- Kerning manipulation state ---
  const [kerningOffset, setKerningOffset] = useState(0);       // Global offset applied to ALL kern pairs
  const [trackingAdjust, setTrackingAdjust] = useState(0);     // Additional tracking adjustment
  const [kerningOverrides, setKerningOverrides] = useState<Record<string, number>>({}); // Per-pair overrides
  const [kerningPanelOpen, setKerningPanelOpen] = useState(false);
  const [kernFilterText, setKernFilterText] = useState('');
  const [newPairLeft, setNewPairLeft] = useState('');
  const [newPairRight, setNewPairRight] = useState('');
  const [newPairValue, setNewPairValue] = useState(0);
  const [selectedPairIdx, setSelectedPairIdx] = useState<number | null>(null); // index into sampleText chars — pair is [i, i+1]

  // Stores rendered character positions for click hit-testing
  const charPositionsRef = useRef<{ x: number; drawX: number; width: number; char: string }[]>([]);

  const fontDataRef = useRef<FontData>({
    charSet: [],
    widths: [],
    offsetX: 0,
    tracking: 0,
    cellSizeX: 0,
    cellSizeY: 0,
    kerning: {},
  });

  const fontCanvasRef = useRef<HTMLCanvasElement>(null);
  const debugCanvasRef = useRef<HTMLCanvasElement>(null);
  const sampleTextCanvasRef = useRef<HTMLCanvasElement>(null);
  const sampleOverlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFontFamily = useCallback(() => {
    return fontInput.fontDataBytes ? FONT_FAMILY : 'serif';
  }, [fontInput.fontDataBytes]);

  const getCssFont = useCallback(() => {
    return `${fontInput.fontSize}px ${getFontFamily()}`;
  }, [fontInput.fontSize, getFontFamily]);

  const activeFontFaceRef = useRef<FontFace | null>(null);

  const createFontFace = useCallback(async (fontDataBytes: Uint8Array) => {
    const fontFace = new FontFace(FONT_FAMILY, fontDataBytes.buffer);
    try {
      await fontFace.load();
    } catch (ex) {
      alert(`Failed to load font. Is it a valid TTF, OTF, WOFF or WOFF2 file?\n\n${ex}`);
      return false;
    }
    if (activeFontFaceRef.current) {
      document.fonts.delete(activeFontFaceRef.current);
    }
    document.fonts.add(fontFace);
    activeFontFaceRef.current = fontFace;
    return true;
  }, []);

  // For .fnt export: kerningOffset applied uniformly = tracking, so fold it in
  const getEffectiveKerning = useCallback((): Record<string, number> => {
    const base = fontDataRef.current.kerning;
    const effective: Record<string, number> = {};

    // Base pairs: export raw values (kerningOffset is folded into tracking)
    for (const pair in base) {
      if (base[pair] !== 0) effective[pair] = base[pair];
    }

    // Overrides: stored as absolute values, but tracking already includes kerningOffset,
    // so we compensate by subtracting it
    for (const pair in kerningOverrides) {
      const adjusted = kerningOverrides[pair] - kerningOffset;
      if (adjusted === 0) {
        delete effective[pair];
      } else {
        effective[pair] = adjusted;
      }
    }

    return effective;
  }, [kerningOffset, kerningOverrides]);

  // Tracking for .fnt export: base + user adjust + global kerning offset (uniform = tracking)
  const getEffectiveTracking = useCallback((): number => {
    return fontDataRef.current.tracking + trackingAdjust + kerningOffset;
  }, [trackingAdjust, kerningOffset]);

  const convertFont = useCallback(() => {
    const fontCanvas = fontCanvasRef.current;
    const debugCanvas = debugCanvasRef.current;
    if (!fontCanvas || !debugCanvas) return;

    setIsConverting(true);

    let context = fontCanvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    context.font = getCssFont();

    const charSet = fontInput.charSet;
    const measures = charSet.map((char) => {
      const m = context!.measureText(char);
      return {
        advance: Math.round(m.width),
        left: Math.ceil(m.actualBoundingBoxLeft),
        right: Math.ceil(m.actualBoundingBoxRight),
        ascent: Math.ceil(m.actualBoundingBoxAscent),
        descent: Math.ceil(m.actualBoundingBoxDescent),
      };
    });

    const maxLeft = Math.max(0, ...measures.map(m => m.left));
    const maxRight = Math.max(0, ...measures.map(m => m.right));
    const maxAscent = Math.max(0, ...measures.map(m => m.ascent));
    const maxDescent = Math.max(0, ...measures.map(m => m.descent));
    const maxAdvance = Math.max(0, ...measures.map(m => m.advance));

    const offsetX = Math.max(maxLeft, 0);
    const offsetY = maxAscent;
    let tracking = -offsetX;

    const overflow = Math.max(0, ...measures.map(m => offsetX + m.right - m.advance + tracking));
    tracking -= overflow;
    const widths = measures.map(m => m.advance - tracking);

    const numChars = charSet.length;
    const numCellsX = Math.ceil(Math.sqrt(numChars));
    const numCellsY = Math.ceil(numChars / numCellsX);
    const cellSizeX = Math.max(maxAdvance + maxLeft, maxLeft + maxRight);
    const cellSizeY = maxAscent + maxDescent;
    const canvasWidth = numCellsX * cellSizeX;
    const canvasHeight = numCellsY * cellSizeY;

    fontCanvas.width = canvasWidth;
    fontCanvas.height = canvasHeight;
    context = fontCanvas.getContext('2d', { willReadFrequently: true })!;
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.font = getCssFont();

    debugCanvas.width = canvasWidth;
    debugCanvas.height = canvasHeight;
    const debugContext = debugCanvas.getContext('2d')!;
    debugContext.clearRect(0, 0, canvasWidth, canvasHeight);

    for (let row = 0; row < numCellsY; row++) {
      for (let col = 0; col < numCellsX; col++) {
        const cellX = col * cellSizeX;
        const cellY = row * cellSizeY;
        debugContext.fillStyle = (row + col) % 2 === 0 ? 'hsl(var(--muted))' : 'hsl(var(--background))';
        debugContext.fillRect(cellX, cellY, cellSizeX, cellSizeY);
        const i = row * numCellsX + col;
        if (i < numChars) {
          const measure = measures[i];
          context.fillText(charSet[i], cellX + offsetX, cellY + offsetY);
          debugContext.fillStyle = 'rgba(59, 130, 246, 0.08)';
          debugContext.fillRect(cellX, cellY, -tracking, cellSizeY);
          debugContext.fillStyle = 'rgba(34, 197, 94, 0.1)';
          debugContext.fillRect(cellX - tracking, cellY, widths[i] + tracking, cellSizeY);
          debugContext.fillStyle = 'rgba(239, 68, 68, 0.2)';
          debugContext.fillRect(
            cellX + offsetX - measure.left,
            cellY + offsetY - measure.ascent,
            measure.left + measure.right,
            measure.ascent + measure.descent,
          );
        }
      }
    }

    const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i + 0] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = data[i + 3] < fontInput.opacityThreshold ? 0 : 255;
    }
    context.putImageData(imageData, 0, 0);

    const scale = displayScale / (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
    fontCanvas.style.setProperty('width', `${Math.floor(canvasWidth * scale)}px`);
    fontCanvas.style.setProperty('height', `${Math.floor(canvasHeight * scale)}px`);
    debugCanvas.style.setProperty('width', `${Math.floor(canvasWidth * scale)}px`);
    debugCanvas.style.setProperty('height', `${Math.floor(canvasHeight * scale)}px`);

    const kerning = computeKerning(context, charSet);

    fontDataRef.current = {
      charSet,
      widths,
      offsetX,
      tracking,
      cellSizeX,
      cellSizeY,
      kerning,
    };

    setIsConverting(false);
  }, [fontInput, displayScale, getCssFont]);

  const renderSampleText = useCallback(() => {
    const canvas = sampleTextCanvasRef.current;
    if (!canvas) return;
    const fd = fontDataRef.current;
    if (fd.charSet.length === 0 || fd.cellSizeX === 0) return;

    const fontCanvas = fontCanvasRef.current;
    if (!fontCanvas) return;

    // Compute effective kerning inline to avoid stale closure issues
    const effectiveKerning: Record<string, number> = {};
    for (const pair in fd.kerning) {
      const val = fd.kerning[pair] + kerningOffset;
      if (val !== 0) effectiveKerning[pair] = val;
    }
    for (const pair in kerningOverrides) {
      if (kerningOverrides[pair] === 0) {
        delete effectiveKerning[pair];
      } else {
        effectiveKerning[pair] = kerningOverrides[pair];
      }
    }

    const chars = Array.from(sampleText);

    // First pass: compute positions
    // Tracking in Playdate is a per-glyph draw offset. Widths are computed relative to base tracking.
    // trackingAdjust changes the per-glyph offset, so each character accumulates the delta.
    const positions: { x: number; drawX: number; width: number; char: string }[] = [];
    let totalWidth = 0;
    {
      let x = 0;
      let charCount = 0;
      let prevChar = '';
      for (let i = 0; i < chars.length; i++) {
        const idx = fd.charSet.indexOf(chars[i]);
        if (idx < 0) continue;
        let kern = 0;
        if (charCount > 0 && prevChar) {
          const pair = prevChar + chars[i];
          if (pair in kerningOverrides) {
            // Override replaces everything
            kern = kerningOverrides[pair];
          } else if (pair in effectiveKerning) {
            // Has a computed value (already includes kerningOffset)
            kern = effectiveKerning[pair];
          } else {
            // No computed pair — still apply global offset
            kern = kerningOffset;
          }
        }
        x += kern;
        const w = fd.widths[idx];
        // Each character's draw position uses base tracking plus the cumulative tracking adjustment
        const drawX = x + fd.tracking + (trackingAdjust * charCount);
        positions.push({ x, drawX, width: w, char: chars[i] });
        x += w;
        prevChar = chars[i];
        charCount++;
      }
      totalWidth = x;
    }
    charPositionsRef.current = positions;

    // Find the min drawX (could be negative due to tracking) and max right edge
    const minDrawX = positions.length > 0 ? Math.min(...positions.map(p => p.drawX)) : 0;
    const maxRight = positions.length > 0 ? Math.max(...positions.map(p => p.drawX + p.width)) : 0;
    // If minDrawX is negative, we shift everything right so nothing is clipped
    const shiftX = minDrawX < 0 ? -minDrawX : 0;
    if (shiftX > 0) {
      for (const pos of positions) {
        pos.drawX += shiftX;
      }
    }

    const canvasW = Math.max(maxRight + shiftX + 4, 1);
    canvas.width = canvasW;
    canvas.height = fd.cellSizeY;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const numCellsX = Math.ceil(Math.sqrt(fd.charSet.length));
    for (const pos of positions) {
      const idx = fd.charSet.indexOf(pos.char);
      if (idx < 0) continue;
      const srcCol = idx % numCellsX;
      const srcRow = Math.floor(idx / numCellsX);
      const srcX = srcCol * fd.cellSizeX;
      const srcY = srcRow * fd.cellSizeY;

      ctx.drawImage(
        fontCanvas,
        srcX, srcY, fd.cellSizeX, fd.cellSizeY,
        pos.drawX, 0, fd.cellSizeX, fd.cellSizeY,
      );
    }

    const scale = displayScale / (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
    canvas.style.setProperty('width', `${Math.floor(canvas.width * scale)}px`);
    canvas.style.setProperty('height', `${Math.floor(canvas.height * scale)}px`);

    // Size overlay to match
    const overlay = sampleOverlayCanvasRef.current;
    if (overlay) {
      overlay.width = canvas.width;
      overlay.height = canvas.height;
      overlay.style.setProperty('width', `${Math.floor(canvas.width * scale)}px`);
      overlay.style.setProperty('height', `${Math.floor(canvas.height * scale)}px`);
    }
  }, [sampleText, displayScale, kerningOffset, trackingAdjust, kerningOverrides]);

  // Draw the pair selection highlight on the overlay canvas
  const drawPairHighlight = useCallback(() => {
    const overlay = sampleOverlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const positions = charPositionsRef.current;
    if (selectedPairIdx === null || selectedPairIdx < 0 || selectedPairIdx >= positions.length - 1) return;

    const left = positions[selectedPairIdx];
    const right = positions[selectedPairIdx + 1];
    const fd = fontDataRef.current;

    // Draw highlight box spanning both characters
    const hlX = left.drawX;
    const hlW = (right.drawX + right.width) - hlX;

    // Outer glow
    ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
    ctx.fillRect(hlX, 0, hlW, fd.cellSizeY);

    // Bracket lines on left and right edges of the pair
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    // Left bracket
    ctx.beginPath();
    ctx.moveTo(hlX + 0.5, 0);
    ctx.lineTo(hlX + 0.5, fd.cellSizeY);
    ctx.stroke();

    // Right bracket
    ctx.beginPath();
    ctx.moveTo(hlX + hlW - 0.5, 0);
    ctx.lineTo(hlX + hlW - 0.5, fd.cellSizeY);
    ctx.stroke();

    // Kern gap indicator: dashed line at the boundary between the two chars
    const gapX = left.drawX + left.width;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(gapX + 0.5, 0);
    ctx.lineTo(gapX + 0.5, fd.cellSizeY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Small label at top showing the pair and value
    const pair = left.char + right.char;
    let kernVal = 0;
    if (pair in kerningOverrides) {
      kernVal = kerningOverrides[pair];
    } else {
      kernVal = (fd.kerning[pair] ?? 0) + kerningOffset;
    }

    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
    const label = `"${left.char}${right.char}" kern: ${kernVal}`;
    const labelW = ctx.measureText(label).width;
    const labelX = Math.min(Math.max(gapX - labelW / 2, 2), overlay.width - labelW - 2);
    ctx.fillText(label, labelX, 10);
  }, [selectedPairIdx, kerningOffset, kerningOverrides]);

  // Redraw highlight whenever selection or kerning changes
  useEffect(() => {
    drawPairHighlight();
  }, [selectedPairIdx, kerningOffset, trackingAdjust, kerningOverrides, sampleText, drawPairHighlight]);

  // Also redraw after renderSampleText runs (overlay gets cleared when resized)
  useEffect(() => {
    if (fontLoaded && fontDataRef.current.charSet.length > 0) {
      // Small delay to ensure renderSampleText has completed
      const timer = setTimeout(() => drawPairHighlight(), 0);
      return () => clearTimeout(timer);
    }
  }, [fontLoaded, sampleText, displayScale, kerningOffset, trackingAdjust, kerningOverrides, drawPairHighlight]);

  // Click handler for the sample text canvas
  const handleSampleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const overlay = sampleOverlayCanvasRef.current;
    if (!overlay) return;

    const rect = overlay.getBoundingClientRect();
    const scaleX = overlay.width / rect.width;
    const clickX = (e.clientX - rect.left) * scaleX;

    const positions = charPositionsRef.current;
    if (positions.length < 2) return;

    // Find which gap the click is closest to
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < positions.length - 1; i++) {
      const gapX = positions[i].drawX + positions[i].width;
      const dist = Math.abs(clickX - gapX);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    setSelectedPairIdx(bestIdx);
  }, []);

  // Keyboard handler for arrow keys to adjust kerning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPairIdx === null) return;
      const positions = charPositionsRef.current;
      if (selectedPairIdx < 0 || selectedPairIdx >= positions.length - 1) return;

      const left = positions[selectedPairIdx];
      const right = positions[selectedPairIdx + 1];
      const pair = left.char + right.char;
      const fd = fontDataRef.current;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const delta = e.key === 'ArrowLeft' ? -1 : 1;
        const step = e.shiftKey ? 5 : 1; // shift for bigger jumps

        // Current effective value for this pair
        const baseVal = (fd.kerning[pair] ?? 0) + kerningOffset;
        const currentVal = pair in kerningOverrides ? kerningOverrides[pair] : baseVal;
        const newVal = currentVal + delta * step;

        setKerningOverrides(prev => ({ ...prev, [pair]: newVal }));
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Navigate between pairs
        e.preventDefault();
        const delta = e.key === 'ArrowUp' ? -1 : 1;
        const newIdx = Math.max(0, Math.min(positions.length - 2, selectedPairIdx + delta));
        setSelectedPairIdx(newIdx);
      } else if (e.key === 'Escape') {
        setSelectedPairIdx(null);
      } else if (e.key === '0' && (e.metaKey || e.ctrlKey)) {
        // Cmd/Ctrl+0 to reset the selected pair
        e.preventDefault();
        setKerningOverrides(prev => {
          const next = { ...prev };
          delete next[pair];
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPairIdx, kerningOffset, kerningOverrides]);

  useEffect(() => {
    return () => {
      if (activeFontFaceRef.current) {
        document.fonts.delete(activeFontFaceRef.current);
        activeFontFaceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (fontLoaded) {
      convertFont();
    }
  }, [fontLoaded, fontInput.fontSize, fontInput.opacityThreshold, fontInput.charSet, displayScale, convertFont]);

  useEffect(() => {
    if (fontLoaded && fontDataRef.current.charSet.length > 0) {
      renderSampleText();
    }
  }, [fontLoaded, sampleText, displayScale, fontInput.fontSize, fontInput.opacityThreshold, fontInput.charSet, kerningOffset, trackingAdjust, kerningOverrides, renderSampleText]);

  const handleFontFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const baseName = stripExtension(extractFilename(file.name));

    const success = await createFontFace(bytes);
    if (success) {
      setFontInput(prev => ({
        ...prev,
        fontDataBytes: bytes,
        baseName,
      }));
      setFontLoaded(true);
      // Reset kerning adjustments on new font load
      setKerningOffset(0);
      setTrackingAdjust(0);
      setKerningOverrides({});
      setSelectedPairIdx(null);
    }
  };

  const handleCharSetChange = (value: string) => {
    const chars = Array.from(value);
    chars.sort();
    const unique: string[] = [];
    for (const c of chars) {
      if (c.charCodeAt(0) >= 32 && (unique.length === 0 || unique[unique.length - 1] !== c)) {
        unique.push(c);
      }
    }
    setFontInput(prev => ({ ...prev, charSet: unique }));
  };

  const generatePng = (): Uint8Array | null => {
    const canvas = fontCanvasRef.current;
    if (!canvas) return null;
    const dataBase64 = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
    return decodeBase64(dataBase64);
  };

  const generateFnt = (): Uint8Array => {
    const fd = fontDataRef.current;
    const effectiveKerning = getEffectiveKerning();
    const effectiveTracking = getEffectiveTracking();
    const lines: string[] = [];
    lines.push('-- Generated using pdfontconv: https://pdfontconv.frozenfractal.com');
    lines.push(`tracking=${effectiveTracking}`);
    for (let i = 0; i < fd.charSet.length; i++) {
      let char = fd.charSet[i];
      if (char === ' ') char = 'space';
      lines.push(`${char}\t${fd.widths[i]}`);
    }
    for (const pair in effectiveKerning) {
      lines.push(`${pair}\t${effectiveKerning[pair]}`);
    }
    return new TextEncoder().encode(lines.join('\n'));
  };

  const handleDownloadFnt = () => {
    const data = generateFnt();
    downloadFile(`${fontInput.baseName}-table-${fontInput.fontSize}-${fontInput.opacityThreshold}.fnt`, 'application/octet-stream', data);
  };

  const handleDownloadPng = () => {
    const data = generatePng();
    if (data) {
      downloadFile(`${fontInput.baseName}-table-${fontInput.fontSize}-${fontInput.opacityThreshold}.png`, 'image/png', data);
    }
  };

  const handleReset = () => {
    setFontInput({
      fontDataBytes: null,
      baseName: '',
      fontSize: 24,
      opacityThreshold: 128,
      charSet: [...DEFAULT_CHARSET],
    });
    setFontLoaded(false);
    setSampleText('The quick brown fox jumps over the lazy dog.');
    setKerningOffset(0);
    setTrackingAdjust(0);
    setKerningOverrides({});
    setSelectedPairIdx(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Kerning pair management ---
  const handleAddKernPair = () => {
    if (newPairLeft.length === 1 && newPairRight.length === 1) {
      const pair = newPairLeft + newPairRight;
      setKerningOverrides(prev => ({ ...prev, [pair]: newPairValue }));
      setNewPairLeft('');
      setNewPairRight('');
      setNewPairValue(0);
    }
  };

  const handleRemoveOverride = (pair: string) => {
    setKerningOverrides(prev => {
      const next = { ...prev };
      delete next[pair];
      return next;
    });
  };

  const handleOverrideValueChange = (pair: string, value: number) => {
    setKerningOverrides(prev => ({ ...prev, [pair]: value }));
  };

  // Build a merged view of all kerning pairs for the table
  const allKernPairs = useMemo(() => {
    const base = fontDataRef.current.kerning;
    const pairSet = new Set<string>();
    for (const p in base) pairSet.add(p);
    for (const p in kerningOverrides) pairSet.add(p);

    const pairs = Array.from(pairSet).map(pair => {
      const baseVal = base[pair] ?? 0;
      const hasOverride = pair in kerningOverrides;
      const overrideVal = hasOverride ? kerningOverrides[pair] : undefined;
      const effectiveVal = hasOverride ? overrideVal! : baseVal + kerningOffset;
      return { pair, baseVal, hasOverride, overrideVal, effectiveVal };
    });

    // Filter
    if (kernFilterText) {
      const lower = kernFilterText.toLowerCase();
      return pairs.filter(p => p.pair.toLowerCase().includes(lower));
    }
    return pairs.sort((a, b) => a.pair.localeCompare(b.pair));
  }, [fontDataRef.current.kerning, kerningOverrides, kerningOffset, kernFilterText]);

  const totalKernPairs = Object.keys(fontDataRef.current.kerning).length;
  const totalOverrides = Object.keys(kerningOverrides).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="border-muted/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Font Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Upload Font
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/5 rounded-md border-2 border-dashed border-primary/20 group-hover:border-primary/40 transition-colors pointer-events-none" />
                  <Input
                    type="file"
                    ref={fileInputRef}
                    className="opacity-0 absolute inset-0 cursor-pointer z-10 h-full"
                    accept=".ttf,.otf,.woff,.woff2"
                    onChange={handleFontFile}
                    data-testid="input-font-file"
                  />
                  <div className="py-8 flex flex-col items-center justify-center text-center">
                    <div className="p-3 bg-primary/10 rounded-full mb-3">
                      <Upload className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-xs font-medium text-foreground px-4 truncate max-w-full">
                      {fontInput.baseName ? fontInput.baseName : "Click or drag to upload"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      TTF, OTF, WOFF, WOFF2
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex justify-between">
                    Size <span>{fontInput.fontSize}px</span>
                  </label>
                  <Input
                    type="range"
                    min="8"
                    max="128"
                    step="1"
                    value={fontInput.fontSize}
                    onChange={(e) => setFontInput(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                    className="h-8 accent-primary cursor-pointer"
                    data-testid="input-font-size"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex justify-between">
                    Threshold <span>{fontInput.opacityThreshold}</span>
                  </label>
                  <Input
                    type="range"
                    min="0"
                    max="255"
                    step="1"
                    value={fontInput.opacityThreshold}
                    onChange={(e) => setFontInput(prev => ({ ...prev, opacityThreshold: parseInt(e.target.value) }))}
                    className="h-8 accent-primary cursor-pointer"
                    data-testid="input-opacity-threshold"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Export Options</label>
                <div className="flex gap-2">
                  <Button
                    onClick={exportFnt}
                    disabled={!fontLoaded || isConverting}
                    className="flex-1 font-bold uppercase tracking-tight"
                    data-testid="button-export-fnt"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export .fnt
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setKerningOffset(0);
                      setTrackingAdjust(0);
                      setKerningOverrides({});
                      setSelectedPairIdx(null);
                    }}
                    disabled={!fontLoaded}
                    className="hover-elevate"
                    title="Reset all adjustments"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {fontLoaded && (
            <Card className="border-muted/40 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">Adjustment Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Base Tracking</span>
                  <span className="font-mono">{fontDataRef.current.tracking}px</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Adjusted Tracking</span>
                  <span className={`font-mono font-bold ${getEffectiveTracking() !== fontDataRef.current.tracking ? 'text-primary' : ''}`}>
                    {getEffectiveTracking()}px
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Manual Overrides</span>
                  <span className="font-mono">{Object.keys(kerningOverrides).length}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Cell Size</span>
                  <span className="font-mono">{fontDataRef.current.cellSizeX}x{fontDataRef.current.cellSizeY}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-2 space-y-6">
          {fontLoaded && (
            <Card className="border-muted/40 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">Preview & Refining</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sample Text</label>
                  <Input
                    type="text"
                    value={sampleText}
                    onChange={(e) => { setSampleText(e.target.value); setSelectedPairIdx(null); }}
                    className="h-10 text-base"
                    data-testid="input-sample-text"
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Playdate Rendering
                      </label>
                      <span className="text-[10px] text-muted-foreground opacity-70 italic mb-0.5">
                        Click between characters to adjust kerning
                      </span>
                    </div>
                    <div
                      className="bg-muted/30 p-8 rounded-md border border-muted/40 overflow-auto flex justify-center items-center min-h-[140px] relative no-default-hover-elevate"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <div className="relative inline-block" style={{ cursor: 'crosshair' }}>
                        <canvas
                          ref={sampleTextCanvasRef}
                          className="block"
                          style={{ imageRendering: 'pixelated' }}
                          data-testid="canvas-sample-playdate"
                        />
                        <canvas
                          ref={sampleOverlayCanvasRef}
                          className="absolute top-0 left-0 block pointer-events-auto"
                          style={{ imageRendering: 'pixelated', cursor: 'crosshair' }}
                          onClick={handleSampleCanvasClick}
                        />
                      </div>
                    </div>
                  </div>

                  {selectedPairIdx !== null && charPositionsRef.current.length > selectedPairIdx + 1 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-md p-4 flex flex-wrap items-center gap-6 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Selected Pair</span>
                        <span className="font-mono font-bold text-xl bg-background border border-primary/20 px-3 py-1 rounded shadow-sm">
                          {charPositionsRef.current[selectedPairIdx].char === ' ' ? '⎵' : charPositionsRef.current[selectedPairIdx].char}
                          {charPositionsRef.current[selectedPairIdx + 1].char === ' ' ? '⎵' : charPositionsRef.current[selectedPairIdx + 1].char}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Current Kern</span>
                        <span className="font-mono font-bold text-xl text-primary">
                          {(() => {
                            const pair = charPositionsRef.current[selectedPairIdx].char + charPositionsRef.current[selectedPairIdx + 1].char;
                            const fd = fontDataRef.current;
                            const baseVal = (fd.kerning[pair] ?? 0) + kerningOffset;
                            return pair in kerningOverrides ? kerningOverrides[pair] : baseVal;
                          })()}px
                        </span>
                      </div>
                      <div className="flex-1 min-w-[200px] flex items-center gap-3 justify-end">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                          <kbd className="px-2 py-1 rounded bg-background border border-border shadow-sm font-mono text-xs text-foreground">←→</kbd>
                          <span>±1px</span>
                          <kbd className="px-2 py-1 rounded bg-background border border-border shadow-sm font-mono text-xs text-foreground ml-2">⇧←→</kbd>
                          <span>±5px</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b border-muted/40 pb-2">
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-wider">Global Adjustments</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex justify-between">
                        Kerning Offset <span>{kerningOffset > 0 ? '+' : ''}{kerningOffset}px</span>
                      </label>
                      <Input
                        type="range"
                        min="-20"
                        max="20"
                        step="1"
                        value={kerningOffset}
                        onChange={(e) => setKerningOffset(parseInt(e.target.value))}
                        className="h-8 accent-primary cursor-pointer"
                      />
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Applied to all detected pairs. Folded into tracking in the .fnt file.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex justify-between">
                        Extra Tracking <span>{trackingAdjust > 0 ? '+' : ''}{trackingAdjust}px</span>
                      </label>
                      <Input
                        type="range"
                        min="-20"
                        max="20"
                        step="1"
                        value={trackingAdjust}
                        onChange={(e) => setTrackingAdjust(parseInt(e.target.value))}
                        className="h-8 accent-primary cursor-pointer"
                      />
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Additional spacing applied between every character.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!fontLoaded && (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-muted/20 rounded-xl bg-muted/5 p-12 text-center shadow-inner">
              <div className="p-6 bg-muted/20 rounded-full mb-6">
                <Type className="w-16 h-16 text-muted-foreground/20" />
              </div>
              <h3 className="text-xl font-bold uppercase tracking-tight mb-3">No Font Loaded</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Upload a font file to start generating Playdate compatible font assets with pixel-perfect kerning controls.
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="mt-8 px-8 font-bold uppercase tracking-tight hover-elevate shadow-sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                Select Font File
              </Button>
            </div>
          )}

          {fontLoaded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-muted/40 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-muted/40 py-2">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Atlas Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-4 bg-black/95">
                  <div className="overflow-auto flex justify-center py-4">
                    <canvas
                      ref={fontCanvasRef}
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted/40 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-muted/40 py-2">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Debug Overlay</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="overflow-auto flex justify-center py-4">
                    <canvas
                      ref={debugCanvasRef}
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}