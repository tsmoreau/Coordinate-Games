"use client";

import { useEffect, useRef, useCallback, useState } from "react";

// ============================================================================
// CONFIG - adapted from the Lua code
// ============================================================================
const CONFIG = {
  // Tile geometry (matching Lua)
  tileHalfW: 46,
  tileHalfH: 23,
  tileLine: 3,

  // Circle (matching Lua)
  circleR: 14,
  circleLine: 3,

  // Timing (ms) - matching Lua reference
  firstTileDelay: 300,
  tileStagger: 130,
  tileDuration: 350,
  circleDelay: 250,
  circleDuration: 1400,

  // Ball movement
  ballMoveDuration: 200,

  // Colors
  tileFill: "#ffffff",
  tileStroke: "#000000",
  ballFill: "#ffffff",
  ballStroke: "#000000",
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
}

// ============================================================================
// COMPONENT
// ============================================================================
export default function IsometricHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 250 });
  const [dpr, setDpr] = useState(1);
  const animationRef = useRef<number | null>(null);
  const tilesRef = useRef<Tile[]>([]);
  const ballRef = useRef<Ball | null>(null);
  const startTimeRef = useRef<number>(0);
  const interactiveRef = useRef<boolean>(false);
  const isMovingRef = useRef<boolean>(false);

  // Set DPR on client side only to avoid hydration mismatch
  useEffect(() => {
    setDpr(window.devicePixelRatio || 1);
  }, []);

  // Calculate grid center based on canvas dimensions
  const getGridCenter = useCallback(() => {
    return {
      x: dimensions.width / 2,
      y: dimensions.height / 2 - 20,
    };
  }, [dimensions]);

  // Convert grid position (row, col) to screen coordinates
  const gridToScreen = useCallback(
    (row: number, col: number) => {
      const center = getGridCenter();
      const dx = col - 1;
      const dy = row - 1;
      return {
        x: center.x + (dx - dy) * CONFIG.tileHalfW,
        y: center.y + (dx + dy) * CONFIG.tileHalfH,
      };
    },
    [getGridCenter]
  );

  // Get start position based on entry direction
  const getStartPosition = useCallback(
    (
      dir: string,
      targetX: number,
      targetY: number
    ): { x: number; y: number } => {
      switch (dir) {
        case "top":
          return { x: targetX, y: -50 };
        case "bottom":
          return { x: targetX, y: dimensions.height + 50 };
        case "left":
          return { x: -80, y: targetY };
        case "right":
          return { x: dimensions.width + 80, y: targetY };
        default:
          return { x: targetX, y: targetY };
      }
    },
    [dimensions]
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
    (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
      const hw = CONFIG.tileHalfW;
      const hh = CONFIG.tileHalfH;

      ctx.beginPath();
      ctx.moveTo(cx, cy - hh);
      ctx.lineTo(cx + hw, cy);
      ctx.lineTo(cx, cy + hh);
      ctx.lineTo(cx - hw, cy);
      ctx.closePath();

      ctx.fillStyle = CONFIG.tileFill;
      ctx.fill();

      ctx.strokeStyle = CONFIG.tileStroke;
      ctx.lineWidth = CONFIG.tileLine;
      ctx.stroke();
    },
    []
  );

  // Draw the ball
  const drawBall = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y - CONFIG.circleR - 5, CONFIG.circleR, 0, Math.PI * 2);

    ctx.fillStyle = CONFIG.ballFill;
    ctx.fill();

    ctx.strokeStyle = CONFIG.ballStroke;
    ctx.lineWidth = CONFIG.circleLine;
    ctx.stroke();
  }, []);

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
          dx / CONFIG.tileHalfW + dy / CONFIG.tileHalfH <=
          1.2 // Slightly larger hit area
        ) {
          return { row: tile.row, col: tile.col };
        }
      }

      return null;
    },
    []
  );

  // Move the ball to a specific tile (orthogonal only - no diagonals)
  const moveBallTo = useCallback(
    (row: number, col: number) => {
      const ball = ballRef.current;
      if (!ball || !interactiveRef.current || isMovingRef.current) return;

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

  // Handle touch/click
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const ball = ballRef.current;
      if (!canvas || !ball || !interactiveRef.current || isMovingRef.current)
        return;

      const rect = canvas.getBoundingClientRect();

      // Convert to logical coordinates (not affected by canvas dpr scaling)
      const x = (e.clientX - rect.left) * (canvas.width / rect.width) / (window.devicePixelRatio || 1);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height) / (window.devicePixelRatio || 1);

      const tile = findTileAtPoint(x, y);
      if (tile) {
        // Check if adjacent (orthogonal only)
        const dRow = Math.abs(tile.row - ball.row);
        const dCol = Math.abs(tile.col - ball.col);

        if ((dRow === 1 && dCol === 0) || (dRow === 0 && dCol === 1)) {
          moveBallTo(tile.row, tile.col);
        }
      }
    },
    [findTileAtPoint, moveBallTo]
  );

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
        drawTile(ctx, tile.x, tile.y);
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

          const startY = -30;
          ball.y = startY + (ball.targetY - startY) * eased;
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

        drawBall(ctx, ball.x, ball.y);
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [drawTile, drawBall]);

  // Initialize and start animation
  useEffect(() => {
    const tiles = buildTiles();
    tilesRef.current = tiles;

    // Initialize ball at center tile
    const centerPos = gridToScreen(1, 1);
    ballRef.current = {
      x: centerPos.x,
      y: -30,
      startX: centerPos.x,
      startY: -30,
      targetX: centerPos.x,
      targetY: centerPos.y,
      row: 1,
      col: 1,
      visible: false,
      animationStart: null,
      dropStart: null,
      isDropping: false,
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
        const width = Math.min(containerRef.current.clientWidth, 500);
        const height = 250;
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => {
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

      // If not animating, snap to new position
      if (!ball.isDropping && ball.animationStart === null && ball.visible) {
        ball.x = newPos.x;
        ball.y = newPos.y;
        ball.startX = newPos.x;
        ball.startY = newPos.y;
      }
    }
  }, [dimensions, buildTiles, gridToScreen]);

  return (
    <div
      ref={containerRef}
      className="w-full flex items-center justify-center"
      data-testid="isometric-hero"
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width * dpr}
        height={dimensions.height * dpr}
        onPointerDown={handlePointerDown}
        className="cursor-pointer touch-none"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          maxWidth: "100%",
        }}
        data-testid="isometric-canvas"
      />
    </div>
  );
}
