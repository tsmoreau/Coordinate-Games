import { NextResponse } from 'next/server';
import { connectToDatabase } from './mongodb';
import { Game, IGameDocument, GameCapability } from '@/models/Game';

export interface GameContext {
  game: IGameDocument;
  slug: string;
  capabilities: GameCapability[];
}

const gameCache = new Map<string, { context: GameContext; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function validateGame(gameSlug: string): Promise<GameContext | null> {
  const key = gameSlug.toLowerCase();
  const cached = gameCache.get(key);
  
  if (cached && Date.now() < cached.expiry) {
    return cached.context;
  }

  await connectToDatabase();
  
  const game = await Game.findOne({ 
    slug: key,
    active: true 
  });

  if (!game) {
    gameCache.delete(key);
    return null;
  }

  const context: GameContext = {
    game,
    slug: game.slug,
    capabilities: game.capabilities
  };

  gameCache.set(key, { context, expiry: Date.now() + CACHE_TTL_MS });
  return context;
}

export function gameNotFoundResponse() {
  return NextResponse.json({
    success: false,
    error: 'Game not found or inactive',
  }, { status: 404 });
}

export function missingCapabilityResponse(required: GameCapability, available: GameCapability[]) {
  return NextResponse.json({
    success: false,
    error: `This endpoint requires the "${required}" capability. Game has: [${available.join(', ')}].`,
  }, { status: 404 });
}

export async function validateGameWithCapability(gameSlug: string, required: GameCapability): Promise<GameContext | NextResponse> {
  const context = await validateGame(gameSlug);
  
  if (!context) {
    return gameNotFoundResponse();
  }

  if (!context.capabilities.includes(required)) {
    return missingCapabilityResponse(required, context.capabilities);
  }

  return context;
}

export async function validateAsyncGame(gameSlug: string): Promise<GameContext | NextResponse> {
  return validateGameWithCapability(gameSlug, 'async');
}

export async function validateLeaderboardGame(gameSlug: string): Promise<GameContext | NextResponse> {
  return validateGameWithCapability(gameSlug, 'leaderboard');
}

export async function validateDataGame(gameSlug: string): Promise<GameContext | NextResponse> {
  return validateGameWithCapability(gameSlug, 'data');
}

export function isGameContext(result: GameContext | NextResponse): result is GameContext {
  return 'game' in result;
}
