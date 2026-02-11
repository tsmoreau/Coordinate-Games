import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Data, DataScope } from '@/models/Data';
import { authenticateDevice, unauthorizedResponse } from '@/lib/authMiddleware';
import { validateDataGame, isGameContext } from '@/lib/gameMiddleware';

function getStorageKey(key: string, scope: DataScope, ownerId: string | null): string {
  if (scope === 'player' && ownerId) {
    return `${ownerId}:${key}`;
  }
  return key;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameSlug: string; key: string }> }
) {
  try {
    const { gameSlug, key } = await params;

    const gameResult = await validateDataGame(gameSlug);
    if (!isGameContext(gameResult)) {
      return gameResult;
    }
    const gameContext = gameResult;

    const auth = await authenticateDevice(request, gameContext.slug);
    if (!auth) {
      return unauthorizedResponse('Authentication required');
    }

    await connectToDatabase();

    let data = await Data.findOne({
      gameSlug: gameContext.slug,
      key,
    });

    if (!data) {
      const playerKey = getStorageKey(key, 'player', auth.deviceId);
      data = await Data.findOne({
        gameSlug: gameContext.slug,
        key: playerKey,
      });
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'Data not found',
      }, { status: 404 });
    }

    if (data.scope === 'player' || data.scope === 'public') {
      if (data.ownerId !== auth.deviceId) {
        return NextResponse.json({
          success: false,
          error: 'Only the owner can delete this data',
        }, { status: 403 });
      }
    }

    await Data.deleteOne({ _id: data._id });

    const responseKey = data.scope === 'player' && data.key.startsWith(`${data.ownerId}:`)
      ? data.key.substring(data.ownerId!.length + 1)
      : data.key;

    return NextResponse.json({
      success: true,
      message: 'Data deleted',
      deletedKey: responseKey,
    });

  } catch (error) {
    console.error('POST delete data error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete data',
    }, { status: 500 });
  }
}
