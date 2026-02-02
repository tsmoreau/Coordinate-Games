import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Data } from '@/models/Data';
import { authenticateDevice } from '@/lib/authMiddleware';
import { validateDataGame, isGameContext } from '@/lib/gameMiddleware';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    const { gameSlug } = await params;
    
    const gameResult = await validateDataGame(gameSlug);
    if (!isGameContext(gameResult)) {
      return gameResult;
    }
    const gameContext = gameResult;

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix') || '';
    const limitParam = searchParams.get('limit');
    const cursor = searchParams.get('cursor');
    const scopeFilter = searchParams.get('scope');

    const limit = Math.min(Math.max(1, parseInt(limitParam || '100', 10)), 1000);

    const auth = await authenticateDevice(request, gameContext.slug);

    const query: Record<string, unknown> = {
      gameSlug: gameContext.slug,
    };

    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (scopeFilter) {
      if (scopeFilter === 'player') {
        if (!auth) {
          return NextResponse.json({
            success: false,
            error: 'Authentication required to list player-scoped data',
          }, { status: 401 });
        }
        query.scope = 'player';
        query.ownerId = auth.deviceId;
        if (prefix) {
          query.key = { $regex: `^${auth.deviceId}:${escapedPrefix}` };
        }
      } else if (scopeFilter === 'global' || scopeFilter === 'public') {
        query.scope = scopeFilter;
        if (prefix) {
          query.key = { $regex: `^${escapedPrefix}` };
        }
      }
    } else {
      if (auth) {
        if (prefix) {
          query.$or = [
            { scope: 'global', key: { $regex: `^${escapedPrefix}` } },
            { scope: 'public', key: { $regex: `^${escapedPrefix}` } },
            { scope: 'player', ownerId: auth.deviceId, key: { $regex: `^${auth.deviceId}:${escapedPrefix}` } },
          ];
        } else {
          query.$or = [
            { scope: 'global' },
            { scope: 'public' },
            { scope: 'player', ownerId: auth.deviceId },
          ];
        }
      } else {
        if (prefix) {
          query.key = { $regex: `^${escapedPrefix}` };
        }
        query.$or = [
          { scope: 'global' },
          { scope: 'public' },
        ];
      }
    }

    if (cursor) {
      if (!mongoose.Types.ObjectId.isValid(cursor)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid cursor format',
        }, { status: 400 });
      }
      query._id = { $gt: new mongoose.Types.ObjectId(cursor) };
    }

    const dataItems = await Data.find(query)
      .sort({ _id: 1 })
      .limit(limit + 1);

    const hasMore = dataItems.length > limit;
    const results = hasMore ? dataItems.slice(0, limit) : dataItems;
    const nextCursor = hasMore ? results[results.length - 1]._id.toString() : null;

    const keys = results.map(item => {
      let displayKey = item.key;
      if (item.scope === 'player' && item.ownerId && item.key.startsWith(`${item.ownerId}:`)) {
        displayKey = item.key.substring(item.ownerId.length + 1);
      }

      return {
        key: displayKey,
        scope: item.scope,
        ownerId: item.ownerId,
        ownerDisplayName: item.ownerDisplayName,
        updatedAt: item.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      keys,
      nextCursor,
      count: keys.length,
    });

  } catch (error) {
    console.error('List data error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to list data',
    }, { status: 500 });
  }
}
