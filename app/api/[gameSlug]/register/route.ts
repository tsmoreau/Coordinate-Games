import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Player } from '@/models/Player';
import { GameIdentity, VALID_AVATARS, PlayerAvatar } from '@/models/GameIdentity';
import { validateGame, gameNotFoundResponse } from '@/lib/gameMiddleware';
import { generateDeterministicToken, hashToken } from '@/lib/auth';
import { generatePlayerName } from '@/lib/battleNames';
import { randomBytes } from 'crypto';

function generateGlobalId(): string {
  return randomBytes(16).toString('hex');
}

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
    const { serialNumber, displayName, avatar } = body;

    if (!serialNumber || typeof serialNumber !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'serialNumber is required',
      }, { status: 400 });
    }

    const trimmedSerial = serialNumber.trim();
    if (trimmedSerial.length < 1 || trimmedSerial.length > 100) {
      return NextResponse.json({
        success: false,
        error: 'serialNumber must be between 1 and 100 characters',
      }, { status: 400 });
    }

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
    
    if (!validatedDisplayName) {
      validatedDisplayName = generatePlayerName(trimmedSerial, gameContext.game.haikunator);
    }

    let player = await Player.findOne({ serialNumber: trimmedSerial });
    let isNewPlayer = false;

    if (!player) {
      player = await Player.create({
        globalId: generateGlobalId(),
        serialNumber: trimmedSerial,
        createdAt: new Date(),
        lastSeen: new Date(),
      });
      isNewPlayer = true;
    } else {
      player.lastSeen = new Date();
      await player.save();
    }

    let gameIdentity = await GameIdentity.findOne({
      globalId: player.globalId,
      gameSlug: gameContext.slug,
    });

    if (gameIdentity) {
      return NextResponse.json({
        success: true,
        registered: true,
        deviceId: gameIdentity.deviceId,
        displayName: gameIdentity.displayName,
        avatar: gameIdentity.avatar,
      });
    }

    const secretToken = generateDeterministicToken(`${gameContext.slug}:${trimmedSerial}`);
    const tokenHash = hashToken(secretToken);

    gameIdentity = await GameIdentity.create({
      globalId: player.globalId,
      gameSlug: gameContext.slug,
      deviceId: generateDeviceId(),
      tokenHash,
      displayName: validatedDisplayName,
      avatar: validatedAvatar,
      createdAt: new Date(),
      lastSeen: new Date(),
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      registered: false,
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
