"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState, useCallback, useRef, useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';



const BALL_CONFIG = {
  circleR: 28,
  circleLine: 5,
  bounceDuration: 800,
  bounceHeight: 40,
  idlePulseDelay: 5000,
  idlePulseDuration: 800,
  colors: {
    light: {
      ballFill: "#fafaf9",
      ballStroke: "#1c1917",
    },
    dark: {
      ballFill: "#0c0a09",
      ballStroke: "#f5f5f4",
    }
  },
};


export default function LoginPage() {


  const { theme } = useTheme();
  const ballCanvasRef = useRef<HTMLCanvasElement>(null);
  const ballAnimRef = useRef<number | null>(null);
  const ballStateRef = useRef({
    isBouncing: false,
    bounceStart: null as number | null,
    lastInteraction: performance.now(),
  });

  const drawBallCanvas = useCallback(() => {
    const canvas = ballCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 70;
    const h = 110;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const now = performance.now();
    const state = ballStateRef.current;
    const colors = BALL_CONFIG.colors[theme];
    const r = BALL_CONFIG.circleR;
    const cx = w / 2;
    const cy = h - BALL_CONFIG.circleR - BALL_CONFIG.circleLine;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    let bounceOffset = 0;
    if (state.isBouncing && state.bounceStart !== null) {
      const bounceElapsed = now - state.bounceStart;
      const bounceDuration = 800;
      const bounceHeight = 40;

      if (bounceElapsed < bounceDuration) {
        const bounceProgress = (bounceElapsed / bounceDuration) * 2;
        bounceOffset = -Math.abs(Math.sin(bounceProgress * Math.PI)) * bounceHeight;
      } else {
        state.isBouncing = false;
        state.bounceStart = null;
      }
    }

    const radius = r;

    ctx.beginPath();
    ctx.arc(cx, cy + bounceOffset, radius, 0, Math.PI * 2);
    ctx.fillStyle = colors.ballFill;
    ctx.fill();
    ctx.strokeStyle = colors.ballStroke;
    ctx.lineWidth = BALL_CONFIG.circleLine;
    ctx.stroke();

    ballAnimRef.current = requestAnimationFrame(drawBallCanvas);
  }, [theme]);

  useEffect(() => {
    ballAnimRef.current = requestAnimationFrame(drawBallCanvas);
    return () => {
      if (ballAnimRef.current) cancelAnimationFrame(ballAnimRef.current);
    };
  }, [drawBallCanvas]);

  const handleBallClick = () => {
    const state = ballStateRef.current;
    if (state.isBouncing) return;
    state.isBouncing = true;
    state.bounceStart = performance.now();
    state.lastInteraction = performance.now();
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="p-8 max-w-md w-full mx-4">
        <div className="text-center items-center mb-8">
          
          <canvas
            ref={ballCanvasRef}
            onClick={handleBallClick}
            className="mb-6 self-center cursor-pointer"
            data-testid="ball-bounce"
          />
          <h1 className="font-mono text-2xl font-bold uppercase tracking-wide mb-2">
            coordinate games
          </h1>
          <p className="text-muted-foreground text-sm">
           
          </p>
        </div>
        <Button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full"
          data-testid="button-google-signin"
        >
          Sign in with Google
        </Button>
      </Card>
    </div>
  );
}
