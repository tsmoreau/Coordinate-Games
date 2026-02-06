import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { GameIdentity, VALID_AVATARS, PlayerAvatar } from '@/models/GameIdentity';
import { validateGame, gameNotFoundResponse } from '@/lib/gameMiddleware';
import { generateSecureToken, hashToken } from '@/lib/auth';
import { generatePlayerName } from '@/lib/battleNames';
import { randomBytes } from 'crypto';

function generateDeviceId(): string {
  return randomBytes(12).toString('base64url');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    const { gameSlug } = await params;

    const gameContext = await validateGame(gameSlug);
    if (!gameContext) {
      return gameNotFoundResponse();
    }

    await connectToDatabase();

    const body = await request.json();
    const { displayName, avatar } = body;

    let validatedAvatar: PlayerAvatar = 'BIRD1';
    if (avatar && VALID_AVATARS.includes(avatar)) {
      validatedAvatar = avatar as PlayerAvatar;
    }

    let validatedDisplayName: string | null = null;
    if (displayName && typeof displayName === 'string') {
      const trimmed = displayName.trim();
      if (trimmed.length >= 1 && trimmed.length <= 50) {
        validatedDisplayName = trimmed;
      }
    }

    const deviceId = generateDeviceId();

    if (!validatedDisplayName) {
      validatedDisplayName = generatePlayerName(deviceId, gameContext.game.haikunator);
    }

    const secretToken = generateSecureToken();
    const tokenHash = hashToken(secretToken);

    const gameIdentity = await GameIdentity.create({
      gameSlug: gameContext.slug,
      deviceId,
      tokenHash,
      displayName: validatedDisplayName,
      avatar: validatedAvatar,
      createdAt: new Date(),
      lastSeen: new Date(),
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      deviceId: gameIdentity.deviceId,
      secretToken,
      displayName: gameIdentity.displayName,
      avatar: gameIdentity.avatar,
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Registration failed',
    }, { status: 500 });
  }
}
