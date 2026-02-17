"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, RotateCcw, ChevronDown, ChevronRight, Copy, Check, Grid3X3 } from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const PD_WIDTH = 400;
const PD_HEIGHT = 240;

const BAYER_8X8 = [
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
];

function bayerPattern(density: number): number[] {
  const threshold = density * 64;
  const rows: number[] = [];
  for (let row = 0; row < 8; row++) {
    let byte = 0;
    for (let col = 0; col < 8; col++) {
      if (BAYER_8X8[row * 8 + col] >= threshold) byte |= (1 << (7 - col));
    }
    rows.push(byte);
  }
  return rows;
}

function patternDensity(pattern: number[]): number {
  let black = 0;
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 8; col++)
      if (!(pattern[row] & (1 << (7 - col)))) black++;
  return black / 64;
}

function patternToHex(pattern: number[]): string {
  return pattern.map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(', ');
}

// ─── GFXP Presets ────────────────────────────────────────────────────────────

interface PatternPreset { name: string; pattern: number[]; category: string; }

const GFXP_PRESETS: PatternPreset[] = [
  { name: 'white', pattern: [0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF], category: 'Grayscale' },
  { name: 'lightgray', pattern: [0xFF,0xDD,0xFF,0x77,0xFF,0xDD,0xFF,0x77], category: 'Grayscale' },
  { name: 'lightgray-1', pattern: [0x77,0x77,0xDD,0xDD,0x77,0x77,0xDD,0xDD], category: 'Grayscale' },
  { name: 'lightgray-2', pattern: [0x77,0x77,0x77,0x77,0xDD,0xDD,0xDD,0xDD], category: 'Grayscale' },
  { name: 'gray', pattern: [0x55,0xAA,0x55,0xAA,0x55,0xAA,0x55,0xAA], category: 'Grayscale' },
  { name: 'gray-1', pattern: [0x33,0x33,0xCC,0xCC,0x33,0x33,0xCC,0xCC], category: 'Grayscale' },
  { name: 'gray-2', pattern: [0x33,0x33,0x33,0x33,0xCC,0xCC,0xCC,0xCC], category: 'Grayscale' },
  { name: 'gray-3', pattern: [0x55,0x55,0x55,0x55,0xAA,0xAA,0xAA,0xAA], category: 'Grayscale' },
  { name: 'gray-4', pattern: [0xAA,0xAA,0x55,0x55,0xAA,0xAA,0x55,0x55], category: 'Grayscale' },
  { name: 'gray-5', pattern: [0xD2,0x5A,0x4B,0x69,0x2D,0xA5,0xB4,0x96], category: 'Grayscale' },
  { name: 'darkgray', pattern: [0x00,0x22,0x00,0x88,0x00,0x22,0x00,0x88], category: 'Grayscale' },
  { name: 'darkgray-1', pattern: [0x88,0x88,0x22,0x22,0x88,0x88,0x22,0x22], category: 'Grayscale' },
  { name: 'darkgray-2', pattern: [0x88,0x88,0x88,0x88,0x22,0x22,0x22,0x22], category: 'Grayscale' },
  { name: 'black', pattern: [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00], category: 'Grayscale' },
  { name: 'dot-1', pattern: [0x7F,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF], category: 'Dots' },
  { name: 'dot-2', pattern: [0x7F,0xFF,0xFF,0xFF,0xF7,0xFF,0xFF,0xFF], category: 'Dots' },
  { name: 'dot-3', pattern: [0x3F,0x3F,0xFF,0xFF,0xF3,0xF3,0xFF,0xFF], category: 'Dots' },
  { name: 'dot-4', pattern: [0x66,0xFF,0xFF,0x66,0x66,0xFF,0xFF,0x66], category: 'Dots' },
  { name: 'dot-7', pattern: [0xFF,0xFF,0xE7,0xDB,0xDB,0xE7,0xFF,0xFF], category: 'Dots' },
  { name: 'dot-16', pattern: [0xBD,0x5A,0xA5,0xDB,0xDB,0xA5,0x5A,0xBD], category: 'Dots' },
  { name: 'dot-18', pattern: [0x7F,0xB6,0x6B,0xF7,0xDF,0xAD,0xDA,0xFD], category: 'Dots' },
  { name: 'vline-1', pattern: [0x7F,0x7F,0x7F,0x7F,0x7F,0x7F,0x7F,0x7F], category: 'Lines' },
  { name: 'vline-2', pattern: [0x77,0x77,0x77,0x77,0x77,0x77,0x77,0x77], category: 'Lines' },
  { name: 'vline-4', pattern: [0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55], category: 'Lines' },
  { name: 'hline-1', pattern: [0x00,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF], category: 'Lines' },
  { name: 'hline-2', pattern: [0x00,0xFF,0xFF,0xFF,0x00,0xFF,0xFF,0xFF], category: 'Lines' },
  { name: 'hline-4', pattern: [0x00,0xFF,0x00,0xFF,0x00,0xFF,0x00,0xFF], category: 'Lines' },
  { name: 'dline-1', pattern: [0xFE,0xFD,0xFB,0xF7,0xEF,0xDF,0xBF,0x7F], category: 'Lines' },
  { name: 'dline-7', pattern: [0xEE,0xDD,0xBB,0x77,0xEE,0xDD,0xBB,0x77], category: 'Lines' },
  { name: 'dline-8', pattern: [0x77,0xBB,0xDD,0xEE,0x77,0xBB,0xDD,0xEE], category: 'Lines' },
  { name: 'noise-1', pattern: [0xFB,0xDF,0x7D,0xEF,0xFF,0xBB,0xEF,0xFE], category: 'Texture' },
  { name: 'noise-3', pattern: [0xFB,0x7F,0xDD,0xEF,0x7E,0xF7,0xBE,0xF7], category: 'Texture' },
  { name: 'noise-5', pattern: [0xEB,0xBE,0xF7,0xBA,0xDF,0xB6,0xFB,0x6D], category: 'Texture' },
  { name: 'noise-6', pattern: [0x66,0x99,0xA5,0x5A,0x5A,0xA5,0x99,0x66], category: 'Texture' },
  { name: 'wave-1', pattern: [0xBB,0xDD,0xEE,0x77,0xEE,0xDD,0xBB,0x77], category: 'Texture' },
  { name: 'grid-1', pattern: [0xAA,0x77,0xAA,0xDD,0xAA,0x77,0xAA,0xDD], category: 'Texture' },
  { name: 'grid-4', pattern: [0xE7,0xDB,0xBD,0x7E,0x7E,0xBD,0xDB,0xE7], category: 'Texture' },
  { name: 'brick-1', pattern: [0x00,0xDF,0xDF,0xDF,0x00,0xFD,0xFD,0xFD], category: 'Texture' },
  { name: 'cross-2', pattern: [0xFF,0xBE,0xDD,0xEB,0xF7,0xEB,0xDD,0xBE], category: 'Texture' },
];

// ─── Shared utilities ────────────────────────────────────────────────────────

type CurvePoint = [number, number]; // [x, y] both 0..1

// Piecewise linear interpolation through sorted control points
function evaluateCurve(points: CurvePoint[], t: number): number {
  if (points.length === 0) return t;
  if (t <= points[0][0]) return points[0][1];
  if (t >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (t >= x0 && t <= x1) {
      const frac = x1 === x0 ? 0 : (t - x0) / (x1 - x0);
      return y0 + frac * (y1 - y0);
    }
  }
  return t;
}

// Curve presets — each defines a set of control points
const CURVE_PRESETS: Record<string, CurvePoint[]> = {
  linear:    [[0, 0], [1, 1]],
  easeIn:    [[0, 0], [0.4, 0.08], [0.7, 0.35], [1, 1]],
  easeOut:   [[0, 0], [0.3, 0.65], [0.6, 0.92], [1, 1]],
  easeInOut: [[0, 0], [0.3, 0.05], [0.5, 0.5], [0.7, 0.95], [1, 1]],
  step:      [[0, 0], [0.49, 0], [0.51, 1], [1, 1]],
  crush:     [[0, 0], [0.2, 0], [0.8, 1], [1, 1]],
  expand:    [[0, 0], [0.15, 0.3], [0.85, 0.7], [1, 1]],
};

type GradientType = 'linear' | 'radial';

function gradientT(
  x: number, y: number, w: number, h: number,
  type: GradientType, angle: number, centerX: number, centerY: number,
): number {
  if (type === 'linear') {
    const rad = (angle * Math.PI) / 180;
    const dx = Math.cos(rad), dy = Math.sin(rad);
    const nx = x / w, ny = y / h;
    const proj = nx * dx + ny * dy;
    const minProj = Math.min(0, dx, dy, dx + dy);
    const maxProj = Math.max(0, dx, dy, dx + dy);
    if (maxProj === minProj) return 0;
    return Math.max(0, Math.min(1, (proj - minProj) / (maxProj - minProj)));
  } else {
    const cx = centerX * w, cy = centerY * h;
    const ddx = x - cx, ddy = y - cy;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy);
    const maxDist = Math.max(
      Math.sqrt(cx * cx + cy * cy),
      Math.sqrt((w - cx) * (w - cx) + cy * cy),
      Math.sqrt(cx * cx + (h - cy) * (h - cy)),
      Math.sqrt((w - cx) * (w - cx) + (h - cy) * (h - cy)),
    );
    if (maxDist === 0) return 0;
    return Math.min(1, dist / maxDist);
  }
}

// ─── Curve editor component ──────────────────────────────────────────────────

const CURVE_SIZE = 180;
const CURVE_PAD = 16;

function CurveEditor({
  points, onChange,
}: {
  points: CurvePoint[];
  onChange: (pts: CurvePoint[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  // Convert curve coords (0..1) to canvas pixel coords
  const toPixel = (pt: CurvePoint): [number, number] => [
    CURVE_PAD + pt[0] * (CURVE_SIZE - 2 * CURVE_PAD),
    CURVE_SIZE - CURVE_PAD - pt[1] * (CURVE_SIZE - 2 * CURVE_PAD),
  ];

  // Convert canvas pixel coords to curve coords (0..1)
  const fromPixel = (px: number, py: number): CurvePoint => [
    Math.max(0, Math.min(1, (px - CURVE_PAD) / (CURVE_SIZE - 2 * CURVE_PAD))),
    Math.max(0, Math.min(1, (CURVE_SIZE - CURVE_PAD - py) / (CURVE_SIZE - 2 * CURVE_PAD))),
  ];

  // Find nearest point within grab radius
  const findNearest = (px: number, py: number): number | null => {
    const grabR = 10;
    let best: number | null = null;
    let bestDist = grabR * grabR;
    for (let i = 0; i < points.length; i++) {
      const [cx, cy] = toPixel(points[i]);
      const d = (px - cx) * (px - cx) + (py - cy) * (py - cy);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  };

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = CURVE_SIZE; canvas.height = CURVE_SIZE;

    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, CURVE_SIZE, CURVE_SIZE);

    // Grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    const area = CURVE_SIZE - 2 * CURVE_PAD;
    for (let i = 0; i <= 4; i++) {
      const v = CURVE_PAD + (i / 4) * area;
      ctx.beginPath(); ctx.moveTo(v, CURVE_PAD); ctx.lineTo(v, CURVE_SIZE - CURVE_PAD); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CURVE_PAD, v); ctx.lineTo(CURVE_SIZE - CURVE_PAD, v); ctx.stroke();
    }

    // Diagonal reference
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(...toPixel([0, 0]));
    ctx.lineTo(...toPixel([1, 1]));
    ctx.stroke();
    ctx.setLineDash([]);

    // Curve line (sample at every pixel)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px <= area; px++) {
      const t = px / area;
      const v = evaluateCurve(points, t);
      const [sx, sy] = toPixel([t, v]);
      if (px === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Control points
    for (let i = 0; i < points.length; i++) {
      const [cx, cy] = toPixel(points[i]);
      const isEndpoint = i === 0 || i === points.length - 1;
      ctx.beginPath();
      ctx.arc(cx, cy, isEndpoint ? 4 : 5, 0, Math.PI * 2);
      ctx.fillStyle = dragging === i ? '#6cf' : isEndpoint ? '#888' : '#fff';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [points, dragging]);

  useEffect(() => { draw(); }, [draw]);

  const getCanvasPos = (e: React.MouseEvent): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CURVE_SIZE / rect.width;
    const scaleY = CURVE_SIZE / rect.height;
    return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY];
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const [px, py] = getCanvasPos(e);

    // Right-click: remove point (not endpoints)
    if (e.button === 2) {
      const idx = findNearest(px, py);
      if (idx !== null && idx !== 0 && idx !== points.length - 1) {
        const next = [...points];
        next.splice(idx, 1);
        onChange(next);
      }
      return;
    }

    // Left-click: grab existing or add new
    const idx = findNearest(px, py);
    if (idx !== null) {
      setDragging(idx);
    } else {
      // Add new point
      const [cx, cy] = fromPixel(px, py);
      const next = [...points, [cx, cy] as CurvePoint].sort((a, b) => a[0] - b[0]);
      onChange(next);
      // Find the index of the newly added point to start dragging it
      const newIdx = next.findIndex(p => p[0] === cx && p[1] === cy);
      setDragging(newIdx >= 0 ? newIdx : null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging === null) return;
    const [px, py] = getCanvasPos(e);
    const [cx, cy] = fromPixel(px, py);
    const next = [...points.map(p => [...p] as CurvePoint)];

    if (dragging === 0) {
      // First endpoint: x locked at 0
      next[0] = [0, cy];
    } else if (dragging === points.length - 1) {
      // Last endpoint: x locked at 1
      next[next.length - 1] = [1, cy];
    } else {
      // Interior point: clamp x between neighbors
      const minX = next[dragging - 1][0] + 0.01;
      const maxX = next[dragging + 1][0] - 0.01;
      next[dragging] = [Math.max(minX, Math.min(maxX, cx)), cy];
    }
    onChange(next);
  };

  const handleMouseUp = () => { setDragging(null); };

  return (
    <canvas
      ref={canvasRef}
      className="block rounded-sm border border-border cursor-crosshair w-full"
      style={{ aspectRatio: '1', maxWidth: `${CURVE_SIZE}px` }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
      data-testid="curve-editor"
    />
  );
}

// ─── Shared settings panel ───────────────────────────────────────────────────

interface GradientSettings {
  canvasW: number; canvasH: number; displayScale: number;
  gradientType: GradientType; angle: number;
  centerX: number; centerY: number;
  invert: boolean; curvePoints: CurvePoint[];
}

function SettingsPanel({
  s, setS, extraControls, onReset,
}: {
  s: GradientSettings;
  setS: (patch: Partial<GradientSettings>) => void;
  extraControls?: React.ReactNode;
  onReset: () => void;
}) {
  const anglePresets = [
    { label: '\u2192', value: 0 }, { label: '\u2198', value: 45 },
    { label: '\u2193', value: 90 }, { label: '\u2199', value: 135 },
    { label: '\u2190', value: 180 }, { label: '\u2196', value: 225 },
    { label: '\u2191', value: 270 }, { label: '\u2197', value: 315 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium uppercase">Gradient Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground uppercase block mb-1">Type</label>
          <div className="flex gap-1">
            {(['linear', 'radial'] as GradientType[]).map(t => (
              <Button key={t} variant={s.gradientType === t ? 'default' : 'outline'} size="sm"
                onClick={() => setS({ gradientType: t })} className="flex-1 uppercase text-xs"
                data-testid={`button-type-${t}`}>{t}</Button>
            ))}
          </div>
        </div>

        {s.gradientType === 'linear' && (
          <div>
            <label className="text-xs text-muted-foreground uppercase block mb-1">Angle</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {anglePresets.map(p => (
                <Button key={p.value} variant={s.angle === p.value ? 'default' : 'outline'} size="sm"
                  onClick={() => setS({ angle: p.value })} className="w-8 h-8 p-0 text-sm">{p.label}</Button>
              ))}
            </div>
            <Input type="number" min={0} max={360} value={s.angle}
              onChange={(e) => setS({ angle: parseInt(e.target.value) || 0 })} data-testid="input-angle" />
          </div>
        )}

        {s.gradientType === 'radial' && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground uppercase block mb-1">Center X</label>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={100} value={Math.round(s.centerX * 100)}
                  onChange={(e) => setS({ centerX: parseInt(e.target.value) / 100 })} className="flex-1" />
                <span className="text-xs text-muted-foreground w-10 text-right">{Math.round(s.centerX * 100)}%</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase block mb-1">Center Y</label>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={100} value={Math.round(s.centerY * 100)}
                  onChange={(e) => setS({ centerY: parseInt(e.target.value) / 100 })} className="flex-1" />
                <span className="text-xs text-muted-foreground w-10 text-right">{Math.round(s.centerY * 100)}%</span>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={s.invert} onChange={(e) => setS({ invert: e.target.checked })}
              className="rounded border-input" data-testid="input-invert" />
            <span className="text-xs text-muted-foreground uppercase">Invert Direction</span>
          </label>
        </div>

        <div>
          <label className="text-xs text-muted-foreground uppercase block mb-1">Brightness Curve</label>
          <CurveEditor points={s.curvePoints} onChange={(pts) => setS({ curvePoints: pts })} />
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(CURVE_PRESETS).map(([name, pts]) => {
              const isActive = JSON.stringify(s.curvePoints) === JSON.stringify(pts);
              return (
                <Button key={name} variant={isActive ? 'default' : 'outline'} size="sm"
                  onClick={() => setS({ curvePoints: pts.map(p => [...p] as CurvePoint) })}
                  className="text-[10px] uppercase" data-testid={`button-curve-${name}`}>{name}</Button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Click to add points. Drag to move. Right-click to remove.
          </p>
        </div>

        {extraControls}

        <div>
          <label className="text-xs text-muted-foreground uppercase block mb-1">Canvas Size</label>
          <div className="flex items-center gap-1">
            <Input type="number" min={8} max={400} value={s.canvasW}
              onChange={(e) => setS({ canvasW: Math.max(8, parseInt(e.target.value) || PD_WIDTH) })} className="w-20" data-testid="input-canvas-w" />
            <span className="text-xs text-muted-foreground">{'\u00D7'}</span>
            <Input type="number" min={8} max={240} value={s.canvasH}
              onChange={(e) => setS({ canvasH: Math.max(8, parseInt(e.target.value) || PD_HEIGHT) })} className="w-20" data-testid="input-canvas-h" />
          </div>
          <div className="flex gap-1 mt-1">
            <Button variant="outline" size="sm" onClick={() => setS({ canvasW: 400, canvasH: 240 })} className="text-[10px]">400{'\u00D7'}240</Button>
            <Button variant="outline" size="sm" onClick={() => setS({ canvasW: 200, canvasH: 120 })} className="text-[10px]">200{'\u00D7'}120</Button>
            <Button variant="outline" size="sm" onClick={() => setS({ canvasW: 100, canvasH: 100 })} className="text-[10px]">100{'\u00D7'}100</Button>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground uppercase block mb-1">Display Scale</label>
          <Input type="number" min={1} max={4} value={s.displayScale}
            onChange={(e) => setS({ displayScale: parseInt(e.target.value) || 2 })} data-testid="input-display-scale" />
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="ghost" onClick={onReset} data-testid="button-reset">
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1: SMOOTH DITHER
// Per-pixel Bayer threshold — each pixel compared individually against the
// gradient's t value at that position. Output: PNG (pre-baked image asset).
// ═══════════════════════════════════════════════════════════════════════════════

function SmoothDitherTab({ s }: { s: GradientSettings }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = s.canvasW; canvas.height = s.canvasH;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(s.canvasW, s.canvasH);
    const data = imageData.data;

    for (let y = 0; y < s.canvasH; y++) {
      for (let x = 0; x < s.canvasW; x++) {
        let t = gradientT(x, y, s.canvasW, s.canvasH, s.gradientType, s.angle, s.centerX, s.centerY);
        if (s.invert) t = 1 - t;
        t = evaluateCurve(s.curvePoints, t);

        // Per-pixel Bayer threshold: compare gradient density against matrix
        const bayerVal = BAYER_8X8[(y % 8) * 8 + (x % 8)] / 64; // 0..~0.984
        // t=0 is white, t=1 is black. Pixel is black when t > bayerVal
        const bit = t <= bayerVal ? 1 : 0;

        const px = (y * s.canvasW + x) * 4;
        const val = bit ? 255 : 0;
        data[px] = val; data[px+1] = val; data[px+2] = val; data[px+3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    const scale = s.displayScale / (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
    canvas.style.setProperty('width', `${Math.floor(s.canvasW * scale)}px`);
    canvas.style.setProperty('height', `${Math.floor(s.canvasH * scale)}px`);
  }, [s.canvasW, s.canvasH, s.displayScale, s.gradientType, s.angle, s.centerX, s.centerY, s.invert, s.curvePoints]);

  useEffect(() => { renderCanvas(); }, [renderCanvas]);

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `gradient-smooth-${s.canvasW}x${s.canvasH}.png`; a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-medium uppercase">Preview</CardTitle>
          <Button onClick={handleDownloadPng} data-testid="button-download-smooth-png">
            <Download className="w-4 h-4 mr-2" /> .png
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-md border border-border bg-muted p-2">
            <canvas ref={canvasRef} className="block" style={{ imageRendering: 'pixelated' }} data-testid="canvas-smooth" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {s.canvasW}{'\u00D7'}{s.canvasH} {'\u00B7'} smooth Bayer dither {'\u00B7'} {s.gradientType}{s.gradientType === 'linear' ? ` ${s.angle}\u00B0` : ''}{s.invert ? ' inverted' : ''}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase">About Smooth Dither</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Each pixel is individually compared against the Bayer 8{'\u00D7'}8 ordered dither matrix.
            This produces the smoothest possible gradient for a given resolution — 64 density levels
            with no visible band boundaries. Output is a pre-baked 1-bit PNG image asset.
            On Playdate, load with <code className="text-xs font-mono bg-muted px-1 rounded">playdate.graphics.image.new("gradient-smooth")</code> and
            draw with <code className="text-xs font-mono bg-muted px-1 rounded">:draw(x, y)</code>.
            Zero runtime cost, but static — each size/angle variant is a separate asset.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2: PATTERN BANDS
// Discrete bands of GFXP-compatible 8x8 patterns. Output: Lua table + PNG.
// ═══════════════════════════════════════════════════════════════════════════════

interface Band { pattern: number[]; source: 'bayer' | 'preset' | 'custom'; presetName?: string; }

function PatternBandsTab({ s }: { s: GradientSettings }) {
  const [bandCount, setBandCount] = useState(8);
  const [patternMode, setPatternMode] = useState<'bayer' | 'manual'>('bayer');
  const [bands, setBands] = useState<Band[]>([]);
  const [editingBandIdx, setEditingBandIdx] = useState<number | null>(null);
  const [editorPattern, setEditorPattern] = useState<number[]>([0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF]);
  const [presetPanelOpen, setPresetPanelOpen] = useState(false);
  const [presetFilter, setPresetFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bandPreviewRef = useRef<HTMLCanvasElement>(null);

  const generateBands = useCallback((): Band[] => {
    const newBands: Band[] = [];
    for (let i = 0; i < bandCount; i++) {
      const t = bandCount <= 1 ? 0 : i / (bandCount - 1);
      newBands.push({ pattern: bayerPattern(evaluateCurve(s.curvePoints, t)), source: 'bayer' });
    }
    return newBands;
  }, [bandCount, s.curvePoints]);

  useEffect(() => {
    if (patternMode === 'bayer') setBands(generateBands());
  }, [patternMode, bandCount, s.curvePoints, generateBands]);

  const switchToManual = useCallback(() => {
    if (patternMode === 'bayer') setBands(generateBands());
    setPatternMode('manual');
  }, [patternMode, generateBands]);

  // Render main canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || bands.length === 0) return;
    canvas.width = s.canvasW; canvas.height = s.canvasH;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(s.canvasW, s.canvasH);
    const data = imageData.data;
    for (let y = 0; y < s.canvasH; y++) {
      for (let x = 0; x < s.canvasW; x++) {
        let t = gradientT(x, y, s.canvasW, s.canvasH, s.gradientType, s.angle, s.centerX, s.centerY);
        if (s.invert) t = 1 - t;
        const bandIdx = Math.min(bands.length - 1, Math.max(0, Math.floor(t * bands.length)));
        const patRow = bands[bandIdx].pattern[y % 8];
        const bit = (patRow >> (7 - (x % 8))) & 1;
        const px = (y * s.canvasW + x) * 4;
        const val = bit ? 255 : 0;
        data[px] = val; data[px+1] = val; data[px+2] = val; data[px+3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    const scale = s.displayScale / (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
    canvas.style.setProperty('width', `${Math.floor(s.canvasW * scale)}px`);
    canvas.style.setProperty('height', `${Math.floor(s.canvasH * scale)}px`);
  }, [s.canvasW, s.canvasH, s.displayScale, bands, s.gradientType, s.angle, s.centerX, s.centerY, s.invert]);

  useEffect(() => { renderCanvas(); }, [renderCanvas]);

  // Band strip preview
  const renderBandPreview = useCallback(() => {
    const canvas = bandPreviewRef.current;
    if (!canvas || bands.length === 0) return;
    const bW = 32, bH = 32, totalW = bands.length * bW;
    canvas.width = totalW; canvas.height = bH;
    const ctx = canvas.getContext('2d')!;
    for (let b = 0; b < bands.length; b++) {
      const pattern = bands[b].pattern;
      for (let y = 0; y < bH; y++)
        for (let x = 0; x < bW; x++) {
          ctx.fillStyle = (pattern[y % 8] >> (7 - (x % 8))) & 1 ? '#ffffff' : '#000000';
          ctx.fillRect(b * bW + x, y, 1, 1);
        }
    }
    const scale = s.displayScale / (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
    canvas.style.setProperty('width', `${Math.floor(totalW * scale)}px`);
    canvas.style.setProperty('height', `${Math.floor(bH * scale)}px`);
  }, [bands, s.displayScale]);

  useEffect(() => { renderBandPreview(); }, [renderBandPreview]);

  // Editor actions
  const toggleEditorPixel = (row: number, col: number) => {
    setEditorPattern(prev => { const next = [...prev]; next[row] ^= (1 << (7 - col)); return next; });
  };
  const applyEditorPattern = () => {
    if (editingBandIdx === null) return;
    setBands(prev => { const next = [...prev]; next[editingBandIdx] = { pattern: [...editorPattern], source: 'custom' }; return next; });
  };
  const applyPreset = (preset: PatternPreset) => {
    if (editingBandIdx === null) return;
    setEditorPattern([...preset.pattern]);
    setBands(prev => { const next = [...prev]; next[editingBandIdx] = { pattern: [...preset.pattern], source: 'preset', presetName: preset.name }; return next; });
  };
  const openBandEditor = (idx: number) => {
    setEditingBandIdx(idx);
    setEditorPattern([...bands[idx].pattern]);
    if (patternMode === 'bayer') switchToManual();
  };

  // Lua generation
  const generateLua = useCallback((): string => {
    const lines: string[] = [];
    lines.push('-- Generated by coordinate.games dither gradient tool');
    lines.push('-- GFXP-compatible: 8 bytes per pattern, MSB = leftmost pixel, 1=white 0=black');
    lines.push('');
    lines.push('local gradient = {');
    lines.push(`  type = "${s.gradientType}",`);
    if (s.gradientType === 'linear') {
      lines.push(`  angle = ${s.angle},`);
    } else {
      lines.push(`  centerX = ${s.centerX},`);
      lines.push(`  centerY = ${s.centerY},`);
    }
    lines.push(`  invert = ${s.invert},`);
    lines.push(`  width = ${s.canvasW},`);
    lines.push(`  height = ${s.canvasH},`);
    lines.push('  bands = {');
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i];
      const hex = b.pattern.map(v => '0x' + v.toString(16).toUpperCase().padStart(2, '0')).join(', ');
      const comment = b.source === 'preset' && b.presetName
        ? `  -- ${b.presetName}`
        : b.source === 'bayer'
        ? `  -- bayer ${Math.round(patternDensity(b.pattern) * 100)}%`
        : '  -- custom';
      lines.push(`    {${hex}},${comment}`);
    }
    lines.push('  },');
    lines.push('}');
    lines.push('');
    lines.push('-- Usage: drawGradient(gradient, x, y, w, h)');
    lines.push('function drawGradient(g, x, y, w, h)');
    lines.push('  local gfx <const> = playdate.graphics');
    lines.push('  local n = #g.bands');
    if (s.gradientType === 'linear') {
      lines.push('  local bandH = h / n');
      lines.push('  for i = 1, n do');
      lines.push('    gfx.setPattern(g.bands[i])');
      lines.push('    local by = y + math.floor((i - 1) * bandH)');
      lines.push('    local bh = (i == n) and (y + h - by) or math.ceil(bandH)');
      lines.push('    gfx.fillRect(x, by, w, bh)');
      lines.push('  end');
    } else {
      lines.push('  local cx, cy = x + w * g.centerX, y + h * g.centerY');
      lines.push('  local maxDist = math.max(');
      lines.push('    math.sqrt(cx * cx + cy * cy),');
      lines.push('    math.sqrt((x + w - cx) ^ 2 + cy ^ 2),');
      lines.push('    math.sqrt(cx ^ 2 + (y + h - cy) ^ 2),');
      lines.push('    math.sqrt((x + w - cx) ^ 2 + (y + h - cy) ^ 2)');
      lines.push('  )');
      lines.push('  for i = n, 1, -1 do');
      lines.push('    local r = maxDist * (i / n)');
      lines.push('    gfx.setPattern(g.bands[i])');
      lines.push('    gfx.fillCircleAtPoint(cx, cy, math.ceil(r))');
      lines.push('  end');
    }
    lines.push('end');
    lines.push('');
    lines.push('return gradient');
    return lines.join('\n');
  }, [bands, s.gradientType, s.angle, s.centerX, s.centerY, s.invert, s.canvasW, s.canvasH]);

  // Download / copy
  const handleDownloadLua = () => {
    const lua = generateLua();
    const blob = new Blob([lua], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'gradient.lua'; a.click();
    URL.revokeObjectURL(url);
  };
  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `gradient-bands-${s.canvasW}x${s.canvasH}.png`; a.click();
      URL.revokeObjectURL(url);
    });
  };
  const handleCopyLua = async () => {
    await navigator.clipboard.writeText(generateLua());
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const filteredPresets = useMemo(() => {
    if (!presetFilter) return GFXP_PRESETS;
    const lower = presetFilter.toLowerCase();
    return GFXP_PRESETS.filter(p => p.name.toLowerCase().includes(lower) || p.category.toLowerCase().includes(lower));
  }, [presetFilter]);

  const presetCategories = useMemo(() => {
    const cats: Record<string, PatternPreset[]> = {};
    for (const p of filteredPresets) { if (!cats[p.category]) cats[p.category] = []; cats[p.category].push(p); }
    return cats;
  }, [filteredPresets]);

  return (
    <div className="space-y-4">
      {/* Band-specific controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase">Band Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs text-muted-foreground uppercase block mb-1">
                Bands <span className="text-[10px] normal-case ml-1 opacity-60">({bandCount})</span>
              </label>
              <div className="flex items-center gap-2">
                <input type="range" min={2} max={32} value={bandCount}
                  onChange={(e) => setBandCount(parseInt(e.target.value))} className="flex-1" data-testid="input-band-count" />
                <Input type="number" min={2} max={64} value={bandCount}
                  onChange={(e) => setBandCount(Math.max(2, Math.min(64, parseInt(e.target.value) || 8)))} className="w-16" />
              </div>
            </div>
            <div className="min-w-[160px]">
              <label className="text-xs text-muted-foreground uppercase block mb-1">Pattern Source</label>
              <div className="flex gap-1">
                <Button variant={patternMode === 'bayer' ? 'default' : 'outline'} size="sm"
                  onClick={() => setPatternMode('bayer')} className="flex-1 text-xs uppercase">Bayer Auto</Button>
                <Button variant={patternMode === 'manual' ? 'default' : 'outline'} size="sm"
                  onClick={switchToManual} className="flex-1 text-xs uppercase">Manual</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canvas preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-medium uppercase">Preview</CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handleCopyLua} data-testid="button-copy-lua">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied' : 'Copy Lua'}
            </Button>
            <Button onClick={handleDownloadLua} data-testid="button-download-lua">
              <Download className="w-4 h-4 mr-2" /> .lua
            </Button>
            <Button onClick={handleDownloadPng} variant="outline" data-testid="button-download-png">
              <Download className="w-4 h-4 mr-2" /> .png
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-md border border-border bg-muted p-2">
            <canvas ref={canvasRef} className="block" style={{ imageRendering: 'pixelated' }} data-testid="canvas-gradient" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {s.canvasW}{'\u00D7'}{s.canvasH} {'\u00B7'} {bands.length} bands {'\u00B7'} {s.gradientType}{s.gradientType === 'linear' ? ` ${s.angle}\u00B0` : ''}{s.invert ? ' inverted' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Band strip */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase flex items-center gap-2">
            <Grid3X3 className="w-4 h-4" /> Bands
            <Badge variant="outline" className="text-[10px] ml-2">
              {bands.length} bands {'\u00B7'} {patternMode === 'bayer' ? 'Bayer auto' : 'Manual'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-auto rounded-md border border-border bg-muted p-2">
            <canvas ref={bandPreviewRef} className="block" style={{ imageRendering: 'pixelated' }} data-testid="canvas-band-strip" />
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(bands.length, 16)}, 1fr)` }}>
            {bands.map((band, idx) => (
              <button key={idx} onClick={() => openBandEditor(idx)}
                className={`relative aspect-square rounded border transition-colors ${
                  editingBandIdx === idx ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-muted-foreground'
                }`}
                title={`Band ${idx + 1}: ${Math.round(patternDensity(band.pattern) * 100)}% density`}>
                <canvas className="absolute inset-0 w-full h-full rounded-sm" style={{ imageRendering: 'pixelated' }}
                  ref={(el) => {
                    if (!el) return;
                    el.width = 8; el.height = 8;
                    const ctx = el.getContext('2d')!;
                    for (let y = 0; y < 8; y++)
                      for (let x = 0; x < 8; x++) {
                        ctx.fillStyle = (band.pattern[y] >> (7 - x)) & 1 ? '#ffffff' : '#000000';
                        ctx.fillRect(x, y, 1, 1);
                      }
                  }} />
                <span className="absolute bottom-0 left-0 right-0 text-[8px] text-center bg-black/40 text-white leading-tight">{idx + 1}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Click a band to edit its pattern. {patternMode === 'bayer' ? 'Editing a band switches to manual mode.' : 'Switch to Bayer to regenerate all bands.'}
          </p>
        </CardContent>
      </Card>

      {/* Pattern editor */}
      {editingBandIdx !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase flex items-center gap-2">
              Pattern Editor
              <Badge variant="outline" className="text-[10px] ml-2">
                Band {editingBandIdx + 1} {'\u00B7'} {Math.round(patternDensity(editorPattern) * 100)}% density
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-6 flex-wrap">
              <div>
                <label className="text-xs text-muted-foreground uppercase block mb-2">8{'\u00D7'}8 Pattern</label>
                <div className="inline-grid gap-0 border border-border rounded-sm" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
                  {Array.from({ length: 8 }).map((_, row) =>
                    Array.from({ length: 8 }).map((_, col) => {
                      const bit = (editorPattern[row] >> (7 - col)) & 1;
                      return (
                        <button key={`${row}-${col}`} onClick={() => toggleEditorPixel(row, col)}
                          className={`w-7 h-7 border border-border/30 transition-colors ${bit ? 'bg-white hover:bg-gray-200' : 'bg-black hover:bg-gray-800'}`}
                          data-testid={`pixel-${row}-${col}`} />
                      );
                    })
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={applyEditorPattern} data-testid="button-apply-pattern">Apply</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditorPattern([0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF])}>Clear White</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditorPattern([0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00])}>Fill Black</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditorPattern(prev => prev.map(b => b ^ 0xFF))}>Invert</Button>
                </div>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground uppercase block mb-2">Hex Values</label>
                <code className="text-xs font-mono block bg-muted p-2 rounded-md break-all">
                  {'{' + patternToHex(editorPattern) + '}'}
                </code>

                <label className="text-xs text-muted-foreground uppercase block mb-1 mt-4">Bayer Quick-Fill</label>
                <div className="flex items-center gap-2">
                  <input type="range" min={0} max={100}
                    value={Math.round(patternDensity(editorPattern) * 100)}
                    onChange={(e) => {
                      const d = parseInt(e.target.value) / 100;
                      const p = bayerPattern(d);
                      setEditorPattern(p);
                      if (editingBandIdx !== null) {
                        setBands(prev => { const next = [...prev]; next[editingBandIdx] = { pattern: [...p], source: 'bayer' }; return next; });
                      }
                    }} className="flex-1" />
                  <span className="text-xs text-muted-foreground w-10 text-right">{Math.round(patternDensity(editorPattern) * 100)}%</span>
                </div>

                <label className="text-xs text-muted-foreground uppercase block mb-1 mt-4">Tiled Preview</label>
                <div className="border border-border rounded-sm overflow-hidden inline-block">
                  <canvas className="block" style={{ imageRendering: 'pixelated', width: '128px', height: '128px' }}
                    ref={(el) => {
                      if (!el) return;
                      el.width = 64; el.height = 64;
                      const ctx = el.getContext('2d')!;
                      for (let y = 0; y < 64; y++)
                        for (let x = 0; x < 64; x++) {
                          ctx.fillStyle = (editorPattern[y % 8] >> (7 - (x % 8))) & 1 ? '#ffffff' : '#000000';
                          ctx.fillRect(x, y, 1, 1);
                        }
                    }} />
                </div>
              </div>
            </div>

            <div>
              <button className="flex items-center gap-2 w-full text-left" onClick={() => setPresetPanelOpen(prev => !prev)}>
                {presetPanelOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="text-xs text-muted-foreground uppercase font-medium">GFXP Presets</span>
                <Badge variant="outline" className="text-[10px]">{GFXP_PRESETS.length}</Badge>
              </button>
              {presetPanelOpen && (
                <div className="mt-2 space-y-3">
                  <Input type="text" placeholder="Filter presets..." value={presetFilter}
                    onChange={(e) => setPresetFilter(e.target.value)} className="h-7 text-xs" />
                  {Object.entries(presetCategories).map(([cat, presets]) => (
                    <div key={cat}>
                      <label className="text-[10px] text-muted-foreground uppercase block mb-1">{cat}</label>
                      <div className="flex flex-wrap gap-1">
                        {presets.map(preset => (
                          <button key={preset.name} onClick={() => applyPreset(preset)} className="group relative"
                            title={`${preset.name} (${Math.round(patternDensity(preset.pattern) * 100)}%)`}>
                            <canvas className="block border border-border rounded-sm group-hover:border-primary transition-colors"
                              style={{ imageRendering: 'pixelated', width: '32px', height: '32px' }}
                              ref={(el) => {
                                if (!el) return;
                                el.width = 8; el.height = 8;
                                const ctx = el.getContext('2d')!;
                                for (let y = 0; y < 8; y++)
                                  for (let x = 0; x < 8; x++) {
                                    ctx.fillStyle = (preset.pattern[y] >> (7 - x)) & 1 ? '#ffffff' : '#000000';
                                    ctx.fillRect(x, y, 1, 1);
                                  }
                              }} />
                            <span className="absolute -bottom-3 left-0 right-0 text-[7px] text-center text-muted-foreground truncate opacity-0 group-hover:opacity-100 transition-opacity">
                              {preset.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lua output */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase">Lua Output</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-auto max-h-[400px] whitespace-pre">{generateLua()}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT — Tab container with shared settings
// ═══════════════════════════════════════════════════════════════════════════════

type TabMode = 'smooth' | 'bands';

export default function DitherGradientTool() {
  const [tab, setTab] = useState<TabMode>('smooth');

  const [settings, setSettings] = useState<GradientSettings>({
    canvasW: PD_WIDTH,
    canvasH: PD_HEIGHT,
    displayScale: 2,
    gradientType: 'linear',
    angle: 0,
    centerX: 0.5,
    centerY: 0.5,
    invert: false,
    curvePoints: [[0, 0], [1, 1]],
  });

  const patchSettings = useCallback((patch: Partial<GradientSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  const handleReset = useCallback(() => {
    setSettings({
      canvasW: PD_WIDTH, canvasH: PD_HEIGHT, displayScale: 2,
      gradientType: 'linear', angle: 0, centerX: 0.5, centerY: 0.5,
      invert: false, curvePoints: [[0, 0], [1, 1]],
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border pb-0">
        <button
          onClick={() => setTab('smooth')}
          className={`px-4 py-2 text-xs uppercase font-medium border-b-2 transition-colors ${
            tab === 'smooth'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          data-testid="tab-smooth"
        >
          Smooth Dither
        </button>
        <button
          onClick={() => setTab('bands')}
          className={`px-4 py-2 text-xs uppercase font-medium border-b-2 transition-colors ${
            tab === 'bands'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          data-testid="tab-bands"
        >
          Pattern Bands
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Shared settings panel */}
        <SettingsPanel s={settings} setS={patchSettings} onReset={handleReset} />

        {/* Tab content */}
        <div className="lg:col-span-3">
          {tab === 'smooth' && <SmoothDitherTab s={settings} />}
          {tab === 'bands' && <PatternBandsTab s={settings} />}
        </div>
      </div>
    </div>
  );
}