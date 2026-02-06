import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from './mongodb';
import { GameIdentity } from '@/models/GameIdentity';
import { hashToken } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  deviceId?: string;
}

export interface AuthResult {
  deviceId: string;
  displayName: string;
}

export async function authenticateDevice(request: NextRequest, gameSlug?: string): Promise<AuthResult | null> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  if (!token) {
    return null;
  }

  await connectToDatabase();
  
  const tokenHash = hashToken(token);
  
  const query: Record<string, unknown> = {
    tokenHash: tokenHash,
    isActive: true
  };
  
  if (gameSlug) {
    query.gameSlug = gameSlug;
  }
  
  const gameIdentity = await GameIdentity.findOne(query);

  if (!gameIdentity) {
    return null;
  }

  gameIdentity.lastSeen = new Date();
  await gameIdentity.save();

  return {
    deviceId: gameIdentity.deviceId,
    displayName: gameIdentity.displayName,
  };
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({
    success: false,
    error: message,
  }, { status: 401 });
}
