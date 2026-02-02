import { NextResponse } from 'next/server';
import { connectToDatabase } from './mongodb';
import { Game, IGameDocument, GameCapability } from '@/models/Game';

export interface GameContext {
  game: IGameDocument;
  slug: string;
  capabilities: GameCapability[];
}

export async function validateGame(gameSlug: string): Promise<GameContext | null> {
  await connectToDatabase();
  
  const game = await Game.findOne({ 
    slug: gameSlug.toLowerCase(),
    active: true 
  });

  if (!game) {
    return null;
  }

  return {
    game,
    slug: game.slug,
    capabilities: game.capabilities
  };
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
