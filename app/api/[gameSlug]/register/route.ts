import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { GameIdentity } from '@/models/GameIdentity';
import { validateGame, gameNotFoundResponse } from '@/lib/gameMiddleware';
import { generateSecureToken, hashToken } from '@/lib/auth';
import { generatePlayerName } from '@/lib/battleNames';
import { authenticateDevice } from '@/lib/authMiddleware';
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
    const { displayName, avatar, isSimulator } = body;

    const gameAvatars = gameContext.game.avatars || [];

    const auth = await authenticateDevice(request, gameSlug);

    if (auth) {
      const updateFields: Record<string, unknown> = {};

      if (avatar && gameAvatars.includes(avatar)) {
        updateFields.avatar = avatar;
      }

      if (displayName && typeof displayName === 'string') {
        const trimmed = displayName.trim();
        if (trimmed.length >= 1 && trimmed.length <= 50) {
          updateFields.displayName = trimmed;
        }
      }

      if (typeof isSimulator === 'boolean') {
        updateFields.isSimulator = isSimulator;
      }

      if (Object.keys(updateFields).length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No valid fields to update',
        }, { status: 400 });
      }

      const updated = await GameIdentity.findOneAndUpdate(
        { gameSlug: gameContext.slug, deviceId: auth.deviceId },
        updateFields,
        { new: true }
      );

      if (!updated) {
        return NextResponse.json({
          success: false,
          error: 'Player not found',
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        deviceId: updated.deviceId,
        displayName: updated.displayName,
        avatar: updated.avatar,
      });
    }

    let validatedAvatar: string | null = null;
    if (avatar && gameAvatars.includes(avatar)) {
      validatedAvatar = avatar;
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
      ...(typeof isSimulator === 'boolean' && { isSimulator }),
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