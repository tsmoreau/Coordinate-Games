"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

// ============================================================================
// CONFIG - adapted from the Lua code
// ============================================================================
const CONFIG = {
  // Tile geometry (Base values, will be scaled)
  baseTileHalfW: 90,
  baseTileHalfH: 45,
  tileLine: 4,

  // Circle (Base values, will be scaled)
  baseCircleR: 28,
  circleLine: 4,

  // Scaling limits
  minScale: 0.4,
  maxScale: 1.0,

  // Timing (ms) - matching Lua reference
  firstTileDelay: 300,
  tileStagger: 130,
  tileDuration: 350,
  circleDelay: 250,
  circleDuration: 1400,

  // Ball movement
  ballMoveDuration: 200,

  // Idle pulse
  idlePulseDelay: 5000,
  idlePulseDuration: 800,

  // Colors
  colors: {
    light: {
      tileFill: "#fafaf9", // stone-50
      tileStroke: "#1c1917", // stone-900
      ballFill: "#fafaf9",
      ballStroke: "#1c1917",
    },
    dark: {
      tileFill: "#0c0a09", // stone-950
      tileStroke: "#f5f5f4", // stone-100
      ballFill: "#0c0a09",
      ballStroke: "#f5f5f4",
    }
  },
  background: "transparent",
};

// Easing functions
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ============================================================================
// TYPES
// ============================================================================
interface Tile {
  row: number;
  col: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  visible: boolean;
  animationStart: number | null;
}

interface Ball {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  row: number;
  col: number;
  visible: boolean;
  animationStart: number | null;
  dropStart: number | null;
  isDropping: boolean;
  lastInteraction: number;
  bounceStart: number | null;
  isBouncing: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================
export default function IsometricHero() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 250 });
  const [scale, setScale] = useState(1);
  const [dpr, setDpr] = useState(1);
  const animationRef = useRef<number | null>(null);
  const tilesRef = useRef<Tile[]>([]);
  const ballRef = useRef<Ball | null>(null);
  const startTimeRef = useRef<number>(0);
  const interactiveRef = useRef<boolean>(false);
  const isMovingRef = useRef<boolean>(false);
  const hoveredTileRef = useRef<{ row: number; col: number } | null>(null);

  // Derived dimensions based on current scale
  const tileHalfW = CONFIG.baseTileHalfW * scale;
  const tileHalfH = CONFIG.baseTileHalfH * scale;
  const circleR = CONFIG.baseCircleR * scale;

  // Set DPR on client side only to avoid hydration mismatch
  useEffect(() => {
    setDpr(window.devicePixelRatio || 1);
  }, []);

  // Calculate grid center based on canvas dimensions
  const getGridCenter = useCallback(() => {
    return {
      x: dimensions.width / 2,
      y: dimensions.height / 2 + (20 * scale),
    };
  }, [dimensions, scale]);

  // Convert grid position (row, col) to screen coordinates
  const gridToScreen = useCallback(
    (row: number, col: number) => {
      const center = getGridCenter();
      const dx = col - 1;
      const dy = row - 1;
      return {
        x: center.x + (dx - dy) * tileHalfW,
        y: center.y + (dx + dy) * tileHalfH,
      };
    },
    [getGridCenter, tileHalfW, tileHalfH]
  );

  // Get start position based on entry direction
  // Canvas now fills the viewport, so starting just outside canvas = outside viewport
  const getStartPosition = useCallback(
    (
      dir: string,
      targetX: number,
      targetY: number
    ): { x: number; y: number } => {
      // Add buffer to ensure tiles are fully off-screen
      const tileSize = tileHalfH * 2;
      
      switch (dir) {
        case "top":
          // Start above the canvas/viewport
          return { x: targetX, y: -(tileSize) };
        case "bottom":
          // Start below the canvas/viewport
          return { x: targetX, y: dimensions.height + tileSize };
        case "left":
          // Start left of the canvas/viewport
          return { x: -(tileSize), y: targetY };
        case "right":
          // Start right of the canvas/viewport
          return { x: dimensions.width + tileSize, y: targetY };
        default:
          return { x: targetX, y: targetY };
      }
    },
    [dimensions, tileHalfH]
  );

  // Build tiles based on the Lua logic
  const buildTiles = useCallback(() => {
    const defs: [number, number, string][] = [
      [0, 0, "top"], // 1: top of diamond
      [0, 1, "right"], // 2: upper-right
      [0, 2, "right"], // 3: right point
      [1, 2, "right"], // 4: lower-right
      [2, 2, "bottom"], // 5: bottom of diamond
      [2, 1, "bottom"], // 6: lower-left
      [2, 0, "left"], // 7: left point
      [1, 0, "left"], // 8: upper-left
      [1, 1, "top"], // 9: center (drops from above)
    ];

    const tiles: Tile[] = [];

    for (const [row, col, dir] of defs) {
      const target = gridToScreen(row, col);
      const start = getStartPosition(dir, target.x, target.y);

      tiles.push({
        row,
        col,
        x: start.x,
        y: start.y,
        targetX: target.x,
        targetY: target.y,
        startX: start.x,
        startY: start.y,
        visible: false,
        animationStart: null,
      });
    }

    return tiles;
  }, [gridToScreen, getStartPosition]);

  // Draw an isometric tile
  const drawTile = useCallback(
    (ctx: CanvasRenderingContext2D, cx: number, cy: number, theme: "light" | "dark", isHovered: boolean = false) => {
      const hw = tileHalfW;
      const hh = tileHalfH;
      const colors = CONFIG.colors[theme];

      ctx.beginPath();
      ctx.moveTo(cx, cy - hh);
      ctx.lineTo(cx + hw, cy);
      ctx.lineTo(cx, cy + hh);
      ctx.lineTo(cx - hw, cy);
      ctx.closePath();

      // Only fill the tile (the middle) with the inverted color when hovered
      // The stroke (lines/sides) remains the original stroke color
      ctx.fillStyle = isHovered ? colors.tileStroke : colors.tileFill;
      ctx.fill();

      ctx.strokeStyle = colors.tileStroke;
      ctx.lineWidth = CONFIG.tileLine;
      ctx.stroke();
    },
    [tileHalfW, tileHalfH]
  );

  // Draw the ball
  const drawBall = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, theme: "light" | "dark", pulseScale = 1) => {
      const radius = circleR * pulseScale;
      const colors = CONFIG.colors[theme];
      ctx.beginPath();
      ctx.arc(x, y - radius - (5 * scale), radius, 0, Math.PI * 2);

      ctx.fillStyle = colors.ballFill;
      ctx.fill();

      ctx.strokeStyle = colors.ballStroke;
      ctx.lineWidth = CONFIG.circleLine;
      ctx.stroke();
    },
    [circleR, scale]
  );

  // Check if a point is on the ball
  const isBallAtPoint = useCallback(
    (px: number, py: number): boolean => {
      const ball = ballRef.current;
      if (!ball || !ball.visible) return false;
      
      // Ball is drawn at (ball.x, ball.y - radius - 5*scale)
      const ballCenterY = ball.y - circleR - (5 * scale);
      const dx = px - ball.x;
      const dy = py - ballCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check if within ball radius (with slightly larger hit area)
      return distance <= circleR * 1.3;
    },
    [circleR, scale]
  );

  // Find which tile was clicked/touched
  const findTileAtPoint = useCallback(
    (px: number, py: number): { row: number; col: number } | null => {
      const tiles = tilesRef.current;

      for (const tile of tiles) {
        if (!tile.visible) continue;

        // Check if point is inside the diamond
        const dx = Math.abs(px - tile.targetX);
        const dy = Math.abs(py - tile.targetY);

        // Diamond hit test: dx/halfW + dy/halfH <= 1
        if (
          dx / tileHalfW + dy / tileHalfH <=
          1.2 // Slightly larger hit area
        ) {
          return { row: tile.row, col: tile.col };
        }
      }

      return null;
    },
    [tileHalfW, tileHalfH]
  );

  // Trigger a bounce animation on the ball
  const bounceBall = useCallback(() => {
    const ball = ballRef.current;
    if (!ball || !interactiveRef.current || ball.isBouncing || isMovingRef.current) return;
    
    ball.lastInteraction = performance.now();
    ball.isBouncing = true;
    ball.bounceStart = performance.now();
  }, []);

  // Move the ball to a specific tile (orthogonal only - no diagonals)
  const moveBallTo = useCallback(
    (row: number, col: number) => {
      const ball = ballRef.current;
      if (!ball || !interactiveRef.current || isMovingRef.current) return;

      ball.lastInteraction = performance.now();

      // Calculate delta
      const dRow = row - ball.row;
      const dCol = col - ball.col;

      // Only allow orthogonal movement (one step, no diagonals)
      const isOrthogonal =
        (Math.abs(dRow) === 1 && dCol === 0) ||
        (dRow === 0 && Math.abs(dCol) === 1);
      if (!isOrthogonal) return;

      // Validate target is within grid
      if (row < 0 || row > 2 || col < 0 || col > 2) return;

      isMovingRef.current = true;

      const target = gridToScreen(row, col);
      ball.startX = ball.x;
      ball.startY = ball.y;
      ball.targetX = target.x;
      ball.targetY = target.y;
      ball.row = row;
      ball.col = col;
      ball.animationStart = performance.now();
    },
    [gridToScreen]
  );

  // Handle keyboard input
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const ball = ballRef.current;
      if (!ball || !interactiveRef.current || isMovingRef.current) return;

      let newRow = ball.row;
      let newCol = ball.col;

      switch (e.key) {
        case "ArrowUp":
          // In isometric view, "up" means row-1 and col-1 (northwest)
          // But for intuitive control, let's use: up = visual up = row-1
          newRow = ball.row - 1;
          e.preventDefault();
          break;
        case "ArrowDown":
          newRow = ball.row + 1;
          e.preventDefault();
          break;
        case "ArrowLeft":
          newCol = ball.col - 1;
          e.preventDefault();
          break;
        case "ArrowRight":
          newCol = ball.col + 1;
          e.preventDefault();
          break;
        default:
          return;
      }

      if (newRow >= 0 && newRow <= 2 && newCol >= 0 && newCol <= 2) {
        moveBallTo(newRow, newCol);
      }
    },
    [moveBallTo]
  );

  // Handle touch/click - only prevent default if clicking on a tile or ball
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const ball = ballRef.current;
      if (!canvas || !ball || !interactiveRef.current || isMovingRef.current)
        return;

      const rect = canvas.getBoundingClientRect();

      // Convert to logical coordinates (not affected by canvas dpr scaling)
      const x = (e.clientX - rect.left) * (canvas.width / rect.width) / (dpr || 1);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height) / (dpr || 1);

      // Check if tapping the ball first
      if (isBallAtPoint(x, y)) {
        e.preventDefault();
        bounceBall();
        return;
      }

      const tile = findTileAtPoint(x, y);
      if (tile) {
        // Only prevent default (which blocks scrolling) when interacting with a tile
        e.preventDefault();
        
        // Check if adjacent (orthogonal only)
        const dRow = Math.abs(tile.row - ball.row);
        const dCol = Math.abs(tile.col - ball.col);

        if ((dRow === 1 && dCol === 0) || (dRow === 0 && dCol === 1)) {
          moveBallTo(tile.row, tile.col);
        }
      }
      // If not on a tile or ball, allow default behavior (scrolling)
    },
    [findTileAtPoint, isBallAtPoint, bounceBall, moveBallTo]
  );

  // Handle mouse move for hover effect
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !interactiveRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width) / (dpr || 1);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height) / (dpr || 1);

      hoveredTileRef.current = findTileAtPoint(x, y);
    },
    [findTileAtPoint, dpr]
  );

  const handlePointerLeave = useCallback(() => {
    hoveredTileRef.current = null;
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const now = performance.now();
    const elapsed = now - startTimeRef.current;

    // Handle DPI scaling
    const dpr = window.devicePixelRatio || 1;

    // Clear and reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    if (!CONFIG.colors[theme]) return;

    const tiles = tilesRef.current;
    const ball = ballRef.current;

    // Update and draw tiles
    let allTilesLanded = true;

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const tileDelay = CONFIG.firstTileDelay + i * CONFIG.tileStagger;

      if (elapsed >= tileDelay) {
        if (!tile.visible) {
          tile.visible = true;
          tile.animationStart = now;
        }

        if (tile.animationStart !== null) {
          const tileElapsed = now - tile.animationStart;
          const progress = Math.min(tileElapsed / CONFIG.tileDuration, 1);
          const eased = easeOutCubic(progress);

          tile.x = tile.startX + (tile.targetX - tile.startX) * eased;
          tile.y = tile.startY + (tile.targetY - tile.startY) * eased;

          if (progress < 1) {
            allTilesLanded = false;
          }
        }
      } else {
        allTilesLanded = false;
      }

      if (tile.visible) {
        const hovered = hoveredTileRef.current;
        const isHovered = hovered !== null && hovered.row === tile.row && hovered.col === tile.col;
        drawTile(ctx, tile.x, tile.y, theme, isHovered);
      }
    }

    // Ball logic
    const lastTileArrival =
      CONFIG.firstTileDelay +
      (tiles.length - 1) * CONFIG.tileStagger +
      CONFIG.tileDuration;
    const ballStartTime = lastTileArrival + CONFIG.circleDelay;

    if (ball) {
      if (elapsed >= ballStartTime && !ball.visible) {
        ball.visible = true;
        ball.isDropping = true;
        ball.dropStart = now;
      }

      if (ball.visible) {
        if (ball.isDropping && ball.dropStart !== null) {
          const dropElapsed = now - ball.dropStart;
          const progress = Math.min(dropElapsed / CONFIG.circleDuration, 1);
          const eased = easeOutBounce(progress);

          // Use the ball's stored startY which is calculated from viewport height
          ball.y = ball.startY + (ball.targetY - ball.startY) * eased;
          ball.x = ball.targetX;

          if (progress >= 1) {
            ball.isDropping = false;
            ball.y = ball.targetY;
            interactiveRef.current = true;
          }
        } else if (ball.animationStart !== null) {
          // Ball is moving between tiles
          const moveElapsed = now - ball.animationStart;
          const progress = Math.min(moveElapsed / CONFIG.ballMoveDuration, 1);
          const eased = easeInOutQuad(progress);

          ball.x = ball.startX + (ball.targetX - ball.startX) * eased;
          ball.y = ball.startY + (ball.targetY - ball.startY) * eased;

          if (progress >= 1) {
            ball.x = ball.targetX;
            ball.y = ball.targetY;
            ball.animationStart = null;
            isMovingRef.current = false;
          }
        }

        // Handle bounce animation
        let bounceOffset = 0;
        if (ball.isBouncing && ball.bounceStart !== null) {
          const bounceElapsed = now - ball.bounceStart;
          const bounceDuration = 400; // 400ms bounce
          const bounceHeight = 40 * scale; // How high to bounce
          
          if (bounceElapsed < bounceDuration) {
            // Use sine wave for smooth up-and-down bounce
            const bounceProgress = bounceElapsed / bounceDuration;
            bounceOffset = -Math.sin(bounceProgress * Math.PI) * bounceHeight;
          } else {
            ball.isBouncing = false;
            ball.bounceStart = null;
          }
        }

        let ballScale = 1;
        if (
          !ball.isDropping &&
          ball.animationStart === null &&
          !ball.isBouncing &&
          now - ball.lastInteraction > CONFIG.idlePulseDelay
        ) {
          const idleElapsed = (now - ball.lastInteraction - CONFIG.idlePulseDelay) % 3000;
          if (idleElapsed < CONFIG.idlePulseDuration) {
            const pulseProgress = idleElapsed / CONFIG.idlePulseDuration;
            // Simple bounce/pulse: scales up slightly then back down
            ballScale = 1 + Math.sin(pulseProgress * Math.PI) * 0.1;
          }
        }

        drawBall(ctx, ball.x, ball.y + bounceOffset, theme, ballScale);
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [drawTile, drawBall, theme]);

  // Initialize and start animation
  useEffect(() => {
    const tiles = buildTiles();
    tilesRef.current = tiles;

    // Initialize ball at center tile
    const centerPos = gridToScreen(1, 1);
    // Ball starts above the canvas (which now fills the viewport)
    const ballStartY = -(circleR * 2);
    ballRef.current = {
      x: centerPos.x,
      y: ballStartY,
      startX: centerPos.x,
      startY: ballStartY,
      targetX: centerPos.x,
      targetY: centerPos.y,
      row: 1,
      col: 1,
      visible: false,
      animationStart: null,
      dropStart: null,
      isDropping: false,
      lastInteraction: performance.now(),
      bounceStart: null,
      isBouncing: false,
    };

    startTimeRef.current = performance.now();
    interactiveRef.current = false;
    isMovingRef.current = false;

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [buildTiles, gridToScreen, animate]);

  // Handle keyboard events
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        // Use container's full dimensions (which should fill the viewport section)
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        // Calculate dynamic scale based on viewport width
        // Base design is for 900px width.
        const targetScale = Math.min(Math.max(width / 700, CONFIG.minScale), CONFIG.maxScale);
        
        setDimensions({ width, height });
        setScale(targetScale);
      }
    };

    // Use ResizeObserver for accurate container size tracking
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  // Rebuild tiles when dimensions change
  useEffect(() => {
    const tiles = buildTiles();
    tilesRef.current = tiles;

    const ball = ballRef.current;
    if (ball) {
      const newPos = gridToScreen(ball.row, ball.col);
      ball.targetX = newPos.x;
      ball.targetY = newPos.y;

      // If ball hasn't dropped yet, update its start position for the drop animation
      if (!ball.visible) {
        const newBallStartY = -(circleR * 2);
        ball.y = newBallStartY;
        ball.startY = newBallStartY;
        ball.x = newPos.x;
        ball.startX = newPos.x;
      }

      // If not animating, snap to new position
      if (!ball.isDropping && ball.animationStart === null && ball.visible) {
        ball.x = newPos.x;
        ball.y = newPos.y;
        ball.startX = newPos.x;
        ball.startY = newPos.y;
      }
    }
  }, [dimensions, buildTiles, gridToScreen, circleR]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      data-testid="isometric-hero"
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width * dpr}
        height={dimensions.height * dpr}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="absolute inset-0"
        style={{
          width: "100%",
          height: "100%",
          touchAction: "pan-y", // Allow vertical scrolling, only prevent when on tiles
          cursor: "default",
        }}
        data-testid="isometric-canvas"
      />
    </div>
  );
}
