"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, RotateCcw, Play, Pause, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

// ─── PRNG (deterministic replay from seed) ───────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ─── Value noise ─────────────────────────────────────────────────────────────

function hash2d(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function noise2d(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2d(ix, iy), b = hash2d(ix + 1, iy);
  const c = hash2d(ix, iy + 1), d = hash2d(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function randRange(rng: () => number, min: number, max: number): number { return lerp(min, max, rng()); }

// ─── Types ───────────────────────────────────────────────────────────────────

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  age: number; lifetime: number;
  size: number; startSize: number; endSize: number;
  rotation: number; angularVel: number;
  // emission origin (for orbital)
  ox: number; oy: number;
}

interface ParticleSettings {
  name: string;
  frameWidth: number; frameHeight: number;
  frameCount: number; duration: number;
  preWarm: number; seed: number;

  lifetimeMin: number; lifetimeMax: number;
  speedMin: number; speedMax: number;
  gravity: number;

  emissionType: 'overtime' | 'burst';
  emissionAmount: number;
  emissionShape: 'point' | 'circle' | 'rectangle';
  emissionRadius: number;
  emissionWidth: number; emissionHeight: number;
  emissionAngle: number; emissionSpread: number;
  emitterX: number; emitterY: number;

  orbitalZ: number;
  radialVelocity: number;
  dampen: number;
  speedShift: number;

  sizeStartMin: number; sizeStartMax: number;
  sizeEndMin: number; sizeEndMax: number;

  rotationMin: number; rotationMax: number;
  angularVelMin: number; angularVelMax: number;

  noiseStrength: number; noiseFrequency: number;

  collisionActive: boolean;
  collisionDampenMin: number; collisionDampenMax: number;
  collisionBounceMin: number; collisionBounceMax: number;
  collisionPlaneY: number;

  particleShape: 'square' | 'circle' | 'triangle';
  particleColor: 'white' | 'black';
  displayScale: number;
  loopMode: 'off' | 'prewarm' | 'pingpong' | 'crossfade';
}

const MAX_PARTICLES = 2000;

const DEFAULT_SETTINGS: ParticleSettings = {
  name: 'particle',
  frameWidth: 32, frameHeight: 32,
  frameCount: 12, duration: 1.0,
  preWarm: 0, seed: 42,

  lifetimeMin: 0.4, lifetimeMax: 1.0,
  speedMin: 30, speedMax: 60,
  gravity: 0,

  emissionType: 'burst',
  emissionAmount: 20,
  emissionShape: 'point',
  emissionRadius: 4,
  emissionWidth: 8, emissionHeight: 8,
  emissionAngle: 270, emissionSpread: 360,

  orbitalZ: 0,
  radialVelocity: 0,
  dampen: 0,
  speedShift: 1,

  sizeStartMin: 2, sizeStartMax: 3,
  sizeEndMin: 0, sizeEndMax: 1,

  rotationMin: 0, rotationMax: 0,
  angularVelMin: 0, angularVelMax: 0,

  noiseStrength: 0, noiseFrequency: 0.5,

  collisionActive: false,
  collisionDampenMin: 0.1, collisionDampenMax: 0.3,
  collisionBounceMin: 0.3, collisionBounceMax: 0.6,
  collisionPlaneY: 10,

  particleShape: 'square',
  particleColor: 'white',
  displayScale: 6,
  loopMode: 'off',
};

// ─── Presets ─────────────────────────────────────────────────────────────────

const PRESETS: Record<string, Partial<ParticleSettings>> = {
  explosion: {
    emissionType: 'burst', emissionAmount: 30, emissionShape: 'point',
    emissionAngle: 270, emissionSpread: 360,
    speedMin: 40, speedMax: 80, gravity: 60,
    lifetimeMin: 0.3, lifetimeMax: 0.8,
    sizeStartMin: 2, sizeStartMax: 4, sizeEndMin: 0, sizeEndMax: 1,
    dampen: 1.5, duration: 0.8, frameCount: 10,
  },
  fire: {
    emissionType: 'overtime', emissionAmount: 40, emissionShape: 'circle', emissionRadius: 3,
    emissionAngle: 270, emissionSpread: 30,
    speedMin: 15, speedMax: 35, gravity: -20,
    lifetimeMin: 0.3, lifetimeMax: 0.7,
    sizeStartMin: 3, sizeStartMax: 5, sizeEndMin: 0, sizeEndMax: 1,
    noiseStrength: 80, noiseFrequency: 1.2, duration: 1.0, frameCount: 12,
  },
  fountain: {
    emissionType: 'overtime', emissionAmount: 25, emissionShape: 'point',
    emissionAngle: 270, emissionSpread: 20,
    speedMin: 50, speedMax: 70, gravity: 80,
    lifetimeMin: 0.5, lifetimeMax: 1.2,
    sizeStartMin: 1, sizeStartMax: 2, sizeEndMin: 1, sizeEndMax: 1,
    duration: 1.5, frameCount: 16,
  },
  sparks: {
    emissionType: 'burst', emissionAmount: 40, emissionShape: 'point',
    emissionAngle: 270, emissionSpread: 120,
    speedMin: 60, speedMax: 120, gravity: 100,
    lifetimeMin: 0.2, lifetimeMax: 0.6,
    sizeStartMin: 1, sizeStartMax: 1, sizeEndMin: 1, sizeEndMax: 1,
    dampen: 0.5, particleShape: 'square',
    collisionActive: true, collisionBounceMin: 0.2, collisionBounceMax: 0.5,
    collisionDampenMin: 0.3, collisionDampenMax: 0.5, collisionPlaneY: 12,
    duration: 1.0, frameCount: 12,
  },
  dust: {
    emissionType: 'burst', emissionAmount: 15, emissionShape: 'rectangle',
    emissionWidth: 12, emissionHeight: 2,
    emissionAngle: 270, emissionSpread: 60,
    speedMin: 8, speedMax: 20, gravity: -5,
    lifetimeMin: 0.4, lifetimeMax: 1.0,
    sizeStartMin: 1, sizeStartMax: 2, sizeEndMin: 0, sizeEndMax: 0,
    noiseStrength: 30, noiseFrequency: 0.8,
    duration: 1.0, frameCount: 10,
  },
  thruster: {
    emissionType: 'overtime', emissionAmount: 50, emissionShape: 'point',
    emissionAngle: 90, emissionSpread: 15,
    speedMin: 40, speedMax: 60, gravity: 0,
    lifetimeMin: 0.15, lifetimeMax: 0.3,
    sizeStartMin: 2, sizeStartMax: 3, sizeEndMin: 0, sizeEndMax: 1,
    duration: 0.5, frameCount: 8,
  },
  vortex: {
    emissionType: 'overtime', emissionAmount: 20, emissionShape: 'circle', emissionRadius: 2,
    emissionAngle: 0, emissionSpread: 360,
    speedMin: 5, speedMax: 15, gravity: 0,
    lifetimeMin: 0.6, lifetimeMax: 1.2,
    sizeStartMin: 1, sizeStartMax: 2, sizeEndMin: 0, sizeEndMax: 1,
    orbitalZ: 300, radialVelocity: -10,
    duration: 1.5, frameCount: 16,
  },
  rain: {
    emissionType: 'overtime', emissionAmount: 60, emissionShape: 'rectangle',
    emissionWidth: 32, emissionHeight: 1,
    emissionAngle: 170, emissionSpread: 5,
    speedMin: 80, speedMax: 100, gravity: 20,
    lifetimeMin: 0.3, lifetimeMax: 0.5,
    sizeStartMin: 1, sizeStartMax: 1, sizeEndMin: 1, sizeEndMax: 1,
    particleShape: 'square',
    collisionActive: true, collisionBounceMin: 0.05, collisionBounceMax: 0.15,
    collisionDampenMin: 0.5, collisionDampenMax: 0.8, collisionPlaneY: 14,
    duration: 1.0, frameCount: 12,
  },
};

// ─── Simulation engine ───────────────────────────────────────────────────────

function createParticle(s: ParticleSettings, rng: () => number, cx: number, cy: number): Particle {
  // Emission position
  let x = cx, y = cy;
  if (s.emissionShape === 'circle') {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * s.emissionRadius;
    x += Math.cos(a) * r;
    y += Math.sin(a) * r;
  } else if (s.emissionShape === 'rectangle') {
    x += (rng() - 0.5) * s.emissionWidth;
    y += (rng() - 0.5) * s.emissionHeight;
  }

  // Direction from emission angle + spread
  const baseAngle = (s.emissionAngle * Math.PI) / 180;
  const spreadRad = (s.emissionSpread * Math.PI) / 180;
  const angle = baseAngle + (rng() - 0.5) * spreadRad;
  const speed = randRange(rng, s.speedMin, s.speedMax);

  const lifetime = randRange(rng, s.lifetimeMin, s.lifetimeMax);
  const startSize = randRange(rng, s.sizeStartMin, s.sizeStartMax);
  const endSize = randRange(rng, s.sizeEndMin, s.sizeEndMax);

  return {
    x, y, ox: cx, oy: cy,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    age: 0, lifetime,
    size: startSize, startSize, endSize,
    rotation: randRange(rng, s.rotationMin, s.rotationMax) * Math.PI / 180,
    angularVel: randRange(rng, s.angularVelMin, s.angularVelMax) * Math.PI / 180,
  };
}

function simulateStep(particles: Particle[], s: ParticleSettings, dt: number, time: number): Particle[] {
  const alive: Particle[] = [];
  for (const p of particles) {
    p.age += dt;
    if (p.age >= p.lifetime) continue;

    const t = p.age / p.lifetime;
    p.size = lerp(p.startSize, p.endSize, t);

    // Gravity
    p.vy += s.gravity * dt;

    // Dampen (drag)
    if (s.dampen > 0) {
      const factor = Math.max(0, 1 - s.dampen * dt);
      p.vx *= factor;
      p.vy *= factor;
    }

    // Speed shift (accelerate/decelerate over lifetime)
    if (s.speedShift !== 1) {
      const shift = Math.pow(s.speedShift, dt);
      p.vx *= shift;
      p.vy *= shift;
    }

    // Orbital Z (revolution around emission origin)
    if (s.orbitalZ !== 0) {
      const dx = p.x - p.ox, dy = p.y - p.oy;
      const angSpeed = (s.orbitalZ * Math.PI / 180) * dt;
      const cosA = Math.cos(angSpeed), sinA = Math.sin(angSpeed);
      p.x = p.ox + dx * cosA - dy * sinA;
      p.y = p.oy + dx * sinA + dy * cosA;
    }

    // Radial velocity (expand/contract from origin)
    if (s.radialVelocity !== 0) {
      const dx = p.x - p.ox, dy = p.y - p.oy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.001) {
        p.vx += (dx / dist) * s.radialVelocity * dt;
        p.vy += (dy / dist) * s.radialVelocity * dt;
      }
    }

    // Noise
    if (s.noiseStrength > 0) {
      const nx = noise2d(p.x * s.noiseFrequency * 0.05, time * 0.5) * 2 - 1;
      const ny = noise2d(time * 0.5, p.y * s.noiseFrequency * 0.05) * 2 - 1;
      p.vx += nx * s.noiseStrength * dt;
      p.vy += ny * s.noiseStrength * dt;
    }

    // Integrate position
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Rotation
    p.rotation += p.angularVel * dt;

    // Collision with plane
    if (s.collisionActive) {
      const planeWorldY = s.frameHeight / 2 + s.collisionPlaneY;
      if (p.y >= planeWorldY && p.vy > 0) {
        p.y = planeWorldY;
        const bounce = randRange(mulberry32(Math.floor(p.x * 1000 + p.y * 7)), s.collisionBounceMin, s.collisionBounceMax);
        const damp = randRange(mulberry32(Math.floor(p.y * 1000 + p.x * 7)), s.collisionDampenMin, s.collisionDampenMax);
        p.vy = -p.vy * bounce;
        p.vx *= (1 - damp);
      }
    }

    alive.push(p);
  }
  return alive;
}

function emitParticles(
  particles: Particle[], s: ParticleSettings, rng: () => number,
  dt: number, emitAccum: number, frame: number,
): { particles: Particle[]; emitAccum: number } {
  const cx = s.frameWidth / 2;
  const cy = s.frameHeight / 2;

  if (s.emissionType === 'burst') {
    if (frame === 0) {
      for (let i = 0; i < Math.min(s.emissionAmount, MAX_PARTICLES); i++) {
        particles.push(createParticle(s, rng, cx, cy));
      }
    }
  } else {
    emitAccum += s.emissionAmount * dt;
    while (emitAccum >= 1 && particles.length < MAX_PARTICLES) {
      particles.push(createParticle(s, rng, cx, cy));
      emitAccum -= 1;
    }
  }
  return { particles, emitAccum };
}

function renderFrame(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  particles: Particle[], s: ParticleSettings,
): void {
  ctx.clearRect(0, 0, w, h);
  const fillColor = s.particleColor === 'white' ? '#ffffff' : '#000000';

  for (const p of particles) {
    if (p.size < 0.5) continue;
    const sz = Math.max(1, Math.round(p.size));
    const px = Math.round(p.x - sz / 2);
    const py = Math.round(p.y - sz / 2);

    ctx.fillStyle = fillColor;

    if (s.particleShape === 'square') {
      if (p.rotation !== 0) {
        ctx.save();
        ctx.translate(Math.round(p.x), Math.round(p.y));
        ctx.rotate(p.rotation);
        ctx.fillRect(-Math.floor(sz / 2), -Math.floor(sz / 2), sz, sz);
        ctx.restore();
      } else {
        ctx.fillRect(px, py, sz, sz);
      }
    } else if (s.particleShape === 'circle') {
      ctx.beginPath();
      ctx.arc(Math.round(p.x), Math.round(p.y), sz / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.particleShape === 'triangle') {
      const cx = Math.round(p.x), cy = Math.round(p.y);
      ctx.save();
      ctx.translate(cx, cy);
      if (p.rotation !== 0) ctx.rotate(p.rotation);
      const r = sz / 2;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(-r, r);
      ctx.lineTo(r, r);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

// ─── Full simulation run (produces all frames) ──────────────────────────────

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

function simulateRaw(s: ParticleSettings, frameCount: number, preWarmOverride?: number): ImageData[] {
  const rng = mulberry32(s.seed);
  const dt = s.duration / s.frameCount;
  let particles: Particle[] = [];
  let emitAccum = 0;
  const frames: ImageData[] = [];

  const warmTime = preWarmOverride !== undefined ? preWarmOverride : s.preWarm;
  if (warmTime > 0) {
    const warmSteps = Math.ceil(warmTime / dt);
    for (let i = 0; i < warmSteps; i++) {
      const emResult = emitParticles(particles, s, rng, dt, emitAccum, i);
      particles = emResult.particles; emitAccum = emResult.emitAccum;
      particles = simulateStep(particles, s, dt, i * dt);
    }
  }

  const offscreen = document.createElement('canvas');
  offscreen.width = s.frameWidth; offscreen.height = s.frameHeight;
  const ctx = offscreen.getContext('2d')!;

  for (let f = 0; f < frameCount; f++) {
    const emResult = emitParticles(particles, s, rng, dt, emitAccum, f);
    particles = emResult.particles; emitAccum = emResult.emitAccum;
    particles = simulateStep(particles, s, dt, f * dt);
    renderFrame(ctx, s.frameWidth, s.frameHeight, particles, s);
    frames.push(ctx.getImageData(0, 0, s.frameWidth, s.frameHeight));
  }

  return frames;
}

function bayerCrossfade(frameA: ImageData, frameB: ImageData, blend: number, w: number, h: number): ImageData {
  const out = new ImageData(w, h);
  const threshold = blend * 64;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const bayerVal = BAYER_8X8[(y % 8) * 8 + (x % 8)];
      const src = bayerVal < threshold ? frameB : frameA;
      const i = (y * w + x) * 4;
      out.data[i] = src.data[i];
      out.data[i + 1] = src.data[i + 1];
      out.data[i + 2] = src.data[i + 2];
      out.data[i + 3] = src.data[i + 3];
    }
  }
  return out;
}

function simulateAll(s: ParticleSettings): ImageData[] {
  if (s.loopMode === 'off') {
    return simulateRaw(s, s.frameCount);
  }

  if (s.loopMode === 'prewarm') {
    // Auto-calculate pre-warm: max lifetime ensures population is at steady state
    const autoWarm = Math.max(s.preWarm, s.lifetimeMax * 2);
    return simulateRaw(s, s.frameCount, autoWarm);
  }

  if (s.loopMode === 'pingpong') {
    const forward = simulateRaw(s, s.frameCount);
    // Reverse middle frames (skip first and last to avoid duplicate frames at seam)
    const reversed = forward.slice(1, -1).reverse();
    return [...forward, ...reversed];
  }

  if (s.loopMode === 'crossfade') {
    // Simulate 2× frames, then Bayer-dither crossfade the two halves
    const n = s.frameCount;
    const raw = simulateRaw(s, n * 2);
    const passA = raw.slice(0, n);
    const passB = raw.slice(n, n * 2);
    const out: ImageData[] = [];
    for (let i = 0; i < n; i++) {
      const blend = i / n; // 0 at start (all A), 1 at end (all B)
      out.push(bayerCrossfade(passA[i], passB[i], blend, s.frameWidth, s.frameHeight));
    }
    return out;
  }

  return simulateRaw(s, s.frameCount);
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

function MinMax({ label, min, max, onMinChange, onMaxChange, step = 1, minVal = 0, maxVal = 9999 }: {
  label: string; min: number; max: number;
  onMinChange: (v: number) => void; onMaxChange: (v: number) => void;
  step?: number; minVal?: number; maxVal?: number;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground uppercase block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground w-6">min</span>
        <Input type="number" step={step} min={minVal} max={maxVal} value={min}
          onChange={(e) => onMinChange(parseFloat(e.target.value) || 0)} className="h-7 text-xs flex-1" />
        <span className="text-[10px] text-muted-foreground w-6 text-right">max</span>
        <Input type="number" step={step} min={minVal} max={maxVal} value={max}
          onChange={(e) => onMaxChange(parseFloat(e.target.value) || 0)} className="h-7 text-xs flex-1" />
      </div>
    </div>
  );
}

function NumField({ label, value, onChange, step = 1, min, max }: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; max?: number;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground uppercase block mb-1">{label}</label>
      <Input type="number" step={step} min={min} max={max} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="h-7 text-xs" />
    </div>
  );
}

function Section({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border pt-2">
      <button className="flex items-center gap-2 w-full text-left mb-2" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span className="text-xs text-muted-foreground uppercase font-medium">{title}</span>
      </button>
      {open && <div className="space-y-3 pb-2">{children}</div>}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ParticleSizzlerTool() {
  const [settings, setSettings] = useState<ParticleSettings>({ ...DEFAULT_SETTINGS });
  const [frames, setFrames] = useState<ImageData[]>([]);
  const [playing, setPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [blackBg, setBlackBg] = useState(true);

  const previewRef = useRef<HTMLCanvasElement>(null);
  const thumbRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef(0);

  const patch = useCallback((p: Partial<ParticleSettings>) => {
    setSettings(prev => ({ ...prev, ...p }));
    setRendered(false);
  }, []);

  const applyPreset = useCallback((name: string) => {
    const preset = PRESETS[name];
    if (!preset) return;
    setSettings({ ...DEFAULT_SETTINGS, ...preset, name: name });
    setRendered(false);
    setFrames([]);
    setCurrentFrame(0);
  }, []);

  // ─── Live preview (re-simulate on any setting change) ───────────────────

  const liveFrames = useMemo(() => simulateAll(settings), [settings]);

  // Draw current frame to preview canvas
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || liveFrames.length === 0) return;
    const f = Math.min(currentFrame, liveFrames.length - 1);
    canvas.width = settings.frameWidth;
    canvas.height = settings.frameHeight;
    const ctx = canvas.getContext('2d')!;

    // Background + composite (putImageData replaces pixels, so use drawImage)
    ctx.fillStyle = blackBg ? '#000000' : '#e0e0e0';
    ctx.fillRect(0, 0, settings.frameWidth, settings.frameHeight);

    const tmp = document.createElement('canvas');
    tmp.width = settings.frameWidth; tmp.height = settings.frameHeight;
    tmp.getContext('2d')!.putImageData(liveFrames[f], 0, 0);
    ctx.drawImage(tmp, 0, 0);

    // Scale display
    const scale = settings.displayScale;
    canvas.style.width = `${settings.frameWidth * scale}px`;
    canvas.style.height = `${settings.frameHeight * scale}px`;
  }, [liveFrames, currentFrame, settings.frameWidth, settings.frameHeight, settings.displayScale, settings.particleColor, blackBg]);

  // Playback animation loop
  useEffect(() => {
    if (!playing || liveFrames.length === 0) return;
    const frameDuration = (settings.duration / settings.frameCount) * 1000;
    let last = performance.now();

    const tick = (now: number) => {
      if (now - last >= frameDuration) {
        setCurrentFrame(prev => (prev + 1) % liveFrames.length);
        last = now;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing, liveFrames.length, settings.duration, settings.frameCount]);

  // Draw thumbnails
  useEffect(() => {
    liveFrames.forEach((frame, i) => {
      const canvas = thumbRefs.current[i];
      if (!canvas) return;
      canvas.width = settings.frameWidth;
      canvas.height = settings.frameHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = blackBg ? '#000000' : '#e0e0e0';
      ctx.fillRect(0, 0, settings.frameWidth, settings.frameHeight);
      const tmp = document.createElement('canvas');
      tmp.width = settings.frameWidth; tmp.height = settings.frameHeight;
      tmp.getContext('2d')!.putImageData(frame, 0, 0);
      ctx.drawImage(tmp, 0, 0);
    });
  }, [liveFrames, settings.frameWidth, settings.frameHeight, settings.particleColor, blackBg]);

  // ─── Export ─────────────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    if (liveFrames.length === 0) return;
    setRendering(true);

    requestAnimationFrame(() => {
      const cols = liveFrames.length;
      const w = settings.frameWidth * cols;
      const h = settings.frameHeight;
      const sheet = document.createElement('canvas');
      sheet.width = w; sheet.height = h;
      const ctx = sheet.getContext('2d')!;

      // Transparent background
      for (let i = 0; i < liveFrames.length; i++) {
        ctx.putImageData(liveFrames[i], i * settings.frameWidth, 0);
      }

      sheet.toBlob((blob) => {
        if (!blob) { setRendering(false); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${settings.name}-table-${settings.frameWidth}-${settings.frameHeight}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setRendering(false);
        setRendered(true);
      });
    });
  }, [liveFrames, settings]);

  const handleExportGif = useCallback(() => {
    // Single-frame strip PNG is the Playdate standard; GIF is bonus.
    // For now, same as spritesheet export.
    handleExport();
  }, [handleExport]);

  const handleReset = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    setFrames([]);
    setCurrentFrame(0);
    setPlaying(false);
    setRendered(false);
  }, []);

  const exportFilename = `${settings.name}-table-${settings.frameWidth}-${settings.frameHeight}.png`;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* ── Settings panel ── */}
        <Card className="lg:col-span-1 overflow-y-auto" style={{ maxHeight: '85vh' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase">Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Presets */}
            <div>
              <label className="text-xs text-muted-foreground uppercase block mb-1">Presets</label>
              <div className="flex flex-wrap gap-1">
                {Object.keys(PRESETS).map(name => (
                  <Button key={name} variant="outline" size="sm" onClick={() => applyPreset(name)}
                    className="text-[10px] uppercase" data-testid={`button-preset-${name}`}>{name}</Button>
                ))}
              </div>
            </div>

            {/* Output */}
            <Section title="Output" defaultOpen={true}>
              <div>
                <label className="text-xs text-muted-foreground uppercase block mb-1">Name</label>
                <Input value={settings.name} onChange={(e) => patch({ name: e.target.value || 'particle' })}
                  className="h-7 text-xs" data-testid="input-name" />
                <p className="text-[10px] text-muted-foreground mt-1">Export: {exportFilename}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumField label="Frame Width" value={settings.frameWidth} onChange={(v) => patch({ frameWidth: Math.max(8, Math.round(v)) })} step={1} min={8} max={400} />
                <NumField label="Frame Height" value={settings.frameHeight} onChange={(v) => patch({ frameHeight: Math.max(8, Math.round(v)) })} step={1} min={8} max={240} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumField label="Frames" value={settings.frameCount} onChange={(v) => patch({ frameCount: Math.max(1, Math.round(v)) })} step={1} min={1} max={120} />
                <NumField label="Duration (s)" value={settings.duration} onChange={(v) => patch({ duration: Math.max(0.05, v) })} step={0.1} min={0.05} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumField label="Pre-Warm (s)" value={settings.preWarm} onChange={(v) => patch({ preWarm: Math.max(0, v) })} step={0.1} min={0} />
                <NumField label="Seed" value={settings.seed} onChange={(v) => patch({ seed: Math.round(v) })} step={1} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase block mb-1">Loop Mode</label>
                <div className="flex flex-wrap gap-1">
                  {(['off', 'prewarm', 'pingpong', 'crossfade'] as const).map(m => (
                    <Button key={m} variant={settings.loopMode === m ? 'default' : 'outline'} size="sm"
                      onClick={() => patch({ loopMode: m })} className="text-[10px] uppercase"
                      data-testid={`button-loop-${m}`}>{m === 'prewarm' ? 'pre-warm' : m}</Button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {settings.loopMode === 'off' && 'No looping — one-shot playback.'}
                  {settings.loopMode === 'prewarm' && 'Auto pre-warm to steady state. Best for continuous emitters.'}
                  {settings.loopMode === 'pingpong' && 'Play forward then reversed. Simple but visible on directional effects.'}
                  {settings.loopMode === 'crossfade' && 'Bayer dither crossfade between two passes. Seamless loop for any effect.'}
                </p>
              </div>
            </Section>

            {/* Particle */}
            <Section title="Particle" defaultOpen={true}>
              <MinMax label="Lifetime" min={settings.lifetimeMin} max={settings.lifetimeMax}
                onMinChange={(v) => patch({ lifetimeMin: v })} onMaxChange={(v) => patch({ lifetimeMax: v })} step={0.05} />
              <MinMax label="Speed" min={settings.speedMin} max={settings.speedMax}
                onMinChange={(v) => patch({ speedMin: v })} onMaxChange={(v) => patch({ speedMax: v })} step={1} />
              <NumField label="Gravity" value={settings.gravity} onChange={(v) => patch({ gravity: v })} step={5} />
            </Section>

            {/* Emission */}
            <Section title="Emission" defaultOpen={true}>
              <div>
                <label className="text-xs text-muted-foreground uppercase block mb-1">Type</label>
                <div className="flex gap-1">
                  {(['burst', 'overtime'] as const).map(t => (
                    <Button key={t} variant={settings.emissionType === t ? 'default' : 'outline'} size="sm"
                      onClick={() => patch({ emissionType: t })} className="flex-1 text-[10px] uppercase">{t}</Button>
                  ))}
                </div>
              </div>
              <NumField label="Amount" value={settings.emissionAmount} onChange={(v) => patch({ emissionAmount: Math.max(1, Math.round(v)) })} step={1} min={1} />
              <div>
                <label className="text-xs text-muted-foreground uppercase block mb-1">Shape</label>
                <div className="flex gap-1">
                  {(['point', 'circle', 'rectangle'] as const).map(s => (
                    <Button key={s} variant={settings.emissionShape === s ? 'default' : 'outline'} size="sm"
                      onClick={() => patch({ emissionShape: s })} className="flex-1 text-[10px] uppercase">{s}</Button>
                  ))}
                </div>
              </div>
              {settings.emissionShape === 'circle' && (
                <NumField label="Radius" value={settings.emissionRadius} onChange={(v) => patch({ emissionRadius: Math.max(0, v) })} step={1} />
              )}
              {settings.emissionShape === 'rectangle' && (
                <div className="grid grid-cols-2 gap-2">
                  <NumField label="Width" value={settings.emissionWidth} onChange={(v) => patch({ emissionWidth: Math.max(1, v) })} step={1} />
                  <NumField label="Height" value={settings.emissionHeight} onChange={(v) => patch({ emissionHeight: Math.max(1, v) })} step={1} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <NumField label="Angle" value={settings.emissionAngle} onChange={(v) => patch({ emissionAngle: v })} step={5} min={0} max={360} />
                <NumField label="Spread" value={settings.emissionSpread} onChange={(v) => patch({ emissionSpread: Math.max(0, Math.min(360, v)) })} step={5} min={0} max={360} />
              </div>
            </Section>

            {/* Velocity */}
            <Section title="Velocity">
              <NumField label="Orbital Z" value={settings.orbitalZ} onChange={(v) => patch({ orbitalZ: v })} step={10} />
              <NumField label="Radial Velocity" value={settings.radialVelocity} onChange={(v) => patch({ radialVelocity: v })} step={5} />
              <NumField label="Dampen" value={settings.dampen} onChange={(v) => patch({ dampen: Math.max(0, v) })} step={0.1} min={0} />
              <NumField label="Speed Shift" value={settings.speedShift} onChange={(v) => patch({ speedShift: Math.max(0.01, v) })} step={0.1} min={0.01} />
            </Section>

            {/* Size */}
            <Section title="Size">
              <MinMax label="Start Size" min={settings.sizeStartMin} max={settings.sizeStartMax}
                onMinChange={(v) => patch({ sizeStartMin: v })} onMaxChange={(v) => patch({ sizeStartMax: v })} step={0.5} minVal={0} />
              <MinMax label="End Size" min={settings.sizeEndMin} max={settings.sizeEndMax}
                onMinChange={(v) => patch({ sizeEndMin: v })} onMaxChange={(v) => patch({ sizeEndMax: v })} step={0.5} minVal={0} />
            </Section>

            {/* Rotation */}
            <Section title="Rotation">
              <MinMax label="Initial Rotation" min={settings.rotationMin} max={settings.rotationMax}
                onMinChange={(v) => patch({ rotationMin: v })} onMaxChange={(v) => patch({ rotationMax: v })} step={5} />
              <MinMax label="Angular Velocity" min={settings.angularVelMin} max={settings.angularVelMax}
                onMinChange={(v) => patch({ angularVelMin: v })} onMaxChange={(v) => patch({ angularVelMax: v })} step={10} />
            </Section>

            {/* Noise */}
            <Section title="Noise">
              <NumField label="Strength" value={settings.noiseStrength} onChange={(v) => patch({ noiseStrength: Math.max(0, v) })} step={5} min={0} />
              <NumField label="Frequency" value={settings.noiseFrequency} onChange={(v) => patch({ noiseFrequency: Math.max(0.01, v) })} step={0.1} min={0.01} />
            </Section>

            {/* Collision */}
            <Section title="Collision">
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={settings.collisionActive} onChange={(e) => patch({ collisionActive: e.target.checked })}
                    className="rounded border-input" />
                  <span className="text-xs text-muted-foreground uppercase">Active</span>
                </label>
              </div>
              {settings.collisionActive && (
                <>
                  <MinMax label="Dampen" min={settings.collisionDampenMin} max={settings.collisionDampenMax}
                    onMinChange={(v) => patch({ collisionDampenMin: v })} onMaxChange={(v) => patch({ collisionDampenMax: v })} step={0.05} minVal={0} maxVal={1} />
                  <MinMax label="Bounce" min={settings.collisionBounceMin} max={settings.collisionBounceMax}
                    onMinChange={(v) => patch({ collisionBounceMin: v })} onMaxChange={(v) => patch({ collisionBounceMax: v })} step={0.05} minVal={0} maxVal={1} />
                  <NumField label="Plane Y" value={settings.collisionPlaneY} onChange={(v) => patch({ collisionPlaneY: v })} step={1} />
                </>
              )}
            </Section>

            {/* Visual */}
            <Section title="Visual" defaultOpen={true}>
              <div>
                <label className="text-xs text-muted-foreground uppercase block mb-1">Particle Shape</label>
                <div className="flex gap-1">
                  {(['square', 'circle', 'triangle'] as const).map(s => (
                    <Button key={s} variant={settings.particleShape === s ? 'default' : 'outline'} size="sm"
                      onClick={() => patch({ particleShape: s })} className="flex-1 text-[10px] uppercase">{s}</Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase block mb-1">Particle Color</label>
                <div className="flex gap-1">
                  {(['white', 'black'] as const).map(c => (
                    <Button key={c} variant={settings.particleColor === c ? 'default' : 'outline'} size="sm"
                      onClick={() => patch({ particleColor: c })} className="flex-1 text-[10px] uppercase">{c}</Button>
                  ))}
                </div>
              </div>
              <NumField label="Display Scale" value={settings.displayScale} onChange={(v) => patch({ displayScale: Math.max(1, Math.round(v)) })} step={1} min={1} max={16} />
            </Section>
          </CardContent>
        </Card>

        {/* ── Main content ── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Preview + actions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-sm font-medium uppercase">Preview</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleReset} data-testid="button-reset">
                  <RotateCcw className="w-4 h-4 mr-2" /> Reset
                </Button>
                <Button onClick={handleExport} disabled={rendering} data-testid="button-export">
                  <Download className="w-4 h-4 mr-2" />
                  {rendering ? 'Exporting...' : 'Export Spritesheet'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                {/* Canvas */}
                <div className="rounded-md border border-border bg-muted p-2 overflow-auto">
                  <canvas ref={previewRef} className="block" style={{ imageRendering: 'pixelated' }} data-testid="canvas-preview" />
                </div>

                {/* Playback controls */}
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setPlaying(!playing)} data-testid="button-play">
                    {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button variant={blackBg ? 'default' : 'outline'} size="sm" onClick={() => setBlackBg(!blackBg)} data-testid="button-bg-toggle"
                    className="text-[10px] uppercase">
                    {blackBg ? 'Black BG' : 'Light BG'}
                  </Button>
                  <input type="range" min={0} max={Math.max(0, liveFrames.length - 1)} value={currentFrame}
                    onChange={(e) => { setCurrentFrame(parseInt(e.target.value)); setPlaying(false); }}
                    className="flex-1 min-w-[200px]" data-testid="input-frame-scrub" />
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    {currentFrame + 1} / {liveFrames.length}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  {settings.frameWidth}{'\u00D7'}{settings.frameHeight} {'\u00B7'} {settings.frameCount} frames {'\u00B7'} {settings.duration}s
                  {settings.emissionType === 'burst' ? ` \u00B7 burst ${settings.emissionAmount}` : ` \u00B7 ${settings.emissionAmount}/s`}
                  {rendered && <Badge variant="outline" className="ml-2 text-[10px]">Exported</Badge>}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Frame strip */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium uppercase flex items-center gap-2">
                Frames
                <Badge variant="outline" className="text-[10px]">{liveFrames.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 overflow-x-auto pb-2">
                {liveFrames.map((_, i) => (
                  <button key={i} onClick={() => { setCurrentFrame(i); setPlaying(false); }}
                    className={`relative flex-shrink-0 rounded border transition-colors ${
                      currentFrame === i ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-muted-foreground'
                    }`}
                    data-testid={`button-frame-${i}`}>
                    <canvas
                      ref={(el) => { thumbRefs.current[i] = el; }}
                      className="block rounded-sm"
                      style={{ imageRendering: 'pixelated', width: `${Math.min(64, settings.frameWidth * 2)}px`, height: `${Math.min(64, settings.frameHeight * 2)}px` }}
                    />
                    <span className="absolute bottom-0 left-0 right-0 text-[8px] text-center bg-black/50 text-white leading-tight rounded-b-sm">{i}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Export filename: <code className="font-mono bg-muted px-1 rounded">{exportFilename}</code>
                {' \u00B7'} Playdate ImageTable ready
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}