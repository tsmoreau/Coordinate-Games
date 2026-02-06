import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Data, DataScope } from '@/models/Data';
import { authenticateDevice, unauthorizedResponse } from '@/lib/authMiddleware';
import { validateDataGame, isGameContext } from '@/lib/gameMiddleware';
import { z } from 'zod';

const MAX_VALUE_SIZE = 100 * 1024;

const putDataSchema = z.object({
  value: z.record(z.unknown()),
  scope: z.enum(['global', 'player', 'public']).optional().default('global'),
});

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

    const body = await request.json().catch(() => ({}));
    
    const parsed = putDataSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: parsed.error.issues,
      }, { status: 400 });
    }

    const { value, scope } = parsed.data;

    const valueStr = JSON.stringify(value);
    if (valueStr.length > MAX_VALUE_SIZE) {
      return NextResponse.json({
        success: false,
        error: `Value exceeds maximum size of ${MAX_VALUE_SIZE / 1024}KB`,
      }, { status: 400 });
    }

    const storageKey = getStorageKey(key, scope, auth.deviceId);

    const existingData = await Data.findOne({
      gameSlug: gameContext.slug,
      key: storageKey,
    });

    if (existingData) {
      if (existingData.scope === 'player' && existingData.ownerId !== auth.deviceId) {
        return NextResponse.json({
          success: false,
          error: 'Cannot overwrite another player\'s data',
        }, { status: 403 });
      }
      if (existingData.scope === 'public' && existingData.ownerId !== auth.deviceId) {
        return NextResponse.json({
          success: false,
          error: 'Only the owner can update public data',
        }, { status: 403 });
      }
    }

    const ownerId = (scope === 'player' || scope === 'public') ? auth.deviceId : null;
    const ownerDisplayName = ownerId ? auth.displayName : null;

    const result = await Data.findOneAndUpdate(
      {
        gameSlug: gameContext.slug,
        key: storageKey,
      },
      {
        $set: {
          value,
          scope,
          ownerId,
          ownerDisplayName,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          gameSlug: gameContext.slug,
          key: storageKey,
          createdAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        key,
        value: result.value,
        scope: result.scope,
        ownerId: result.ownerId,
        ownerDisplayName: result.ownerDisplayName,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      },
      message: existingData ? 'Data updated' : 'Data created',
    }, { status: existingData ? 200 : 201 });

  } catch (error) {
    console.error('POST data error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save data',
    }, { status: 500 });
  }
}

export async function GET(
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

    await connectToDatabase();

    const auth = await authenticateDevice(request, gameContext.slug);

    let data = await Data.findOne({
      gameSlug: gameContext.slug,
      key,
    });

    if (!data && auth) {
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

    if (data.scope === 'player') {
      if (!auth) {
        return unauthorizedResponse('Authentication required to access player data');
      }
      if (data.ownerId !== auth.deviceId) {
        return NextResponse.json({
          success: false,
          error: 'Cannot access another player\'s data',
        }, { status: 403 });
      }
    }

    const responseKey = data.scope === 'player' && data.key.startsWith(`${data.ownerId}:`)
      ? data.key.substring(data.ownerId!.length + 1)
      : data.key;

    return NextResponse.json({
      success: true,
      data: {
        key: responseKey,
        value: data.value,
        scope: data.scope,
        ownerId: data.ownerId,
        ownerDisplayName: data.ownerDisplayName,
        updatedAt: data.updatedAt,
      },
    });

  } catch (error) {
    console.error('GET data error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch data',
    }, { status: 500 });
  }
}

export async function DELETE(
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
    console.error('DELETE data error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete data',
    }, { status: 500 });
  }
}
