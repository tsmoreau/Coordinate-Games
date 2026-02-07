"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, RotateCcw } from 'lucide-react';

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

    const chars = Array.from(sampleText);
    const totalWidth = chars.reduce((sum, char, i) => {
      const idx = fd.charSet.indexOf(char);
      if (idx < 0) return sum;
      let w = fd.widths[idx];
      if (i > 0) {
        const pair = chars[i - 1] + char;
        if (fd.kerning[pair]) w += fd.kerning[pair];
      }
      return sum + w;
    }, 0);

    canvas.width = Math.max(totalWidth + Math.abs(fd.tracking), 1);
    canvas.height = fd.cellSizeY;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const numCellsX = Math.ceil(Math.sqrt(fd.charSet.length));
    let x = 0;
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const idx = fd.charSet.indexOf(char);
      if (idx < 0) continue;

      if (i > 0) {
        const pair = chars[i - 1] + char;
        if (fd.kerning[pair]) x += fd.kerning[pair];
      }

      const srcCol = idx % numCellsX;
      const srcRow = Math.floor(idx / numCellsX);
      const srcX = srcCol * fd.cellSizeX;
      const srcY = srcRow * fd.cellSizeY;

      ctx.drawImage(
        fontCanvas,
        srcX, srcY, fd.cellSizeX, fd.cellSizeY,
        x + fd.tracking, 0, fd.cellSizeX, fd.cellSizeY,
      );

      x += fd.widths[idx];
    }

    const scale = displayScale / (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
    canvas.style.setProperty('width', `${Math.floor(canvas.width * scale)}px`);
    canvas.style.setProperty('height', `${Math.floor(canvas.height * scale)}px`);
  }, [sampleText, displayScale]);

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
  }, [fontLoaded, sampleText, displayScale, fontInput.fontSize, fontInput.opacityThreshold, fontInput.charSet, renderSampleText]);

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
    const lines: string[] = [];
    lines.push('-- Generated using pdfontconv: https://pdfontconv.frozenfractal.com');
    lines.push(`tracking=${fd.tracking}`);
    for (let i = 0; i < fd.charSet.length; i++) {
      let char = fd.charSet[i];
      if (char === ' ') char = 'space';
      lines.push(`${char} ${fd.widths[i]}`);
    }
    for (const pair in fd.kerning) {
      lines.push(`${pair} ${fd.kerning[pair]}`);
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase">Font Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase block mb-1">Font File (TTF, OTF, WOFF, WOFF2)</label>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  onChange={handleFontFile}
                  className="block w-full text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground file:cursor-pointer cursor-pointer text-muted-foreground"
                  data-testid="input-font-file"
                />
              </div>
              {fontLoaded && (
                <Badge variant="outline" className="mt-2 text-[10px]">
                  {fontInput.baseName}
                </Badge>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase block mb-1">Base Name</label>
              <Input
                type="text"
                value={fontInput.baseName}
                onChange={(e) => setFontInput(prev => ({ ...prev, baseName: e.target.value }))}
                data-testid="input-base-name"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase block mb-1">Font Size</label>
              <Input
                type="number"
                min={5}
                value={fontInput.fontSize}
                onChange={(e) => setFontInput(prev => ({ ...prev, fontSize: parseInt(e.target.value) || 24 }))}
                data-testid="input-font-size"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase block mb-1">Opacity Threshold</label>
              <Input
                type="number"
                min={1}
                max={255}
                value={fontInput.opacityThreshold}
                onChange={(e) => setFontInput(prev => ({ ...prev, opacityThreshold: parseInt(e.target.value) || 128 }))}
                data-testid="input-opacity-threshold"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase block mb-1">Character Set</label>
              <textarea
                rows={4}
                value={fontInput.charSet.join('')}
                onChange={(e) => handleCharSetChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                data-testid="input-charset"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase block mb-1">Display Scale</label>
              <Input
                type="number"
                min={1}
                max={4}
                value={displayScale}
                onChange={(e) => setDisplayScale(parseInt(e.target.value) || 2)}
                data-testid="input-display-scale"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={handleReset}
                data-testid="button-reset"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-sm font-medium uppercase">Output PNG</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleDownloadFnt}
                  disabled={!fontLoaded || isConverting}
                  data-testid="button-download-fnt"
                >
                  <Download className="w-4 h-4 mr-2" />
                  .fnt
                </Button>
                <Button
                  onClick={handleDownloadPng}
                  disabled={!fontLoaded || isConverting}
                  data-testid="button-download-png"
                >
                  <Download className="w-4 h-4 mr-2" />
                  .png
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!fontLoaded ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Upload className="w-8 h-8 mb-3" />
                  <p className="text-sm uppercase font-medium">Upload a font file to begin</p>
                  <p className="text-xs mt-1">Supports TTF, OTF, WOFF, and WOFF2</p>
                </div>
              ) : (
                <>
                  <div className="overflow-auto max-h-[50vh] relative rounded-md border border-border">
                    <canvas
                      ref={debugCanvasRef}
                      className="absolute top-0 left-0"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <canvas
                      ref={fontCanvasRef}
                      className="relative"
                      style={{ imageRendering: 'pixelated' }}
                      data-testid="canvas-font"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Background is informational only; actual output is transparent. Red: glyph bounding box. Blue: negative tracking. Green: character extent.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {fontLoaded && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium uppercase">Sample Text</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="text"
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  data-testid="input-sample-text"
                />
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-1">Browser Rendering</p>
                    <div className="bg-muted p-3 rounded-md overflow-auto">
                      <span
                        className="whitespace-nowrap text-foreground"
                        style={{ fontFamily: getFontFamily(), fontSize: `${fontInput.fontSize}px` }}
                        data-testid="text-sample-browser"
                      >
                        {sampleText}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-1">Playdate Rendering</p>
                    <div className="bg-muted p-3 rounded-md overflow-auto">
                      <canvas
                        ref={sampleTextCanvasRef}
                        className="block"
                        style={{ imageRendering: 'pixelated' }}
                        data-testid="canvas-sample-playdate"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Due to negative tracking, there may be blank space at the start/end of rendered text.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
