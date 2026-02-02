import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Battle } from '@/models/Battle';
import { GameIdentity } from '@/models/GameIdentity';
import { authenticateDevice, unauthorizedResponse } from '@/lib/authMiddleware';
import { validateAsyncGame, isGameContext } from '@/lib/gameMiddleware';
import { generateSecureToken } from '@/lib/auth';
import { generateBattleName } from '@/lib/battleNames';
import { z } from 'zod';

const MAX_ACTIVE_GAMES = 9;

async function getUserActiveGameCount(gameSlug: string, deviceId: string): Promise<number> {
  return Battle.countDocuments({
    gameSlug,
    $or: [
      { player1DeviceId: deviceId },
      { player2DeviceId: deviceId }
    ],
    status: { $in: ['pending', 'active'] }
  });
}

interface PlayerInfo {
  displayName: string;
  avatar: string;
}

async function getPlayerInfo(gameSlug: string, deviceIds: (string | null)[]): Promise<Map<string, PlayerInfo>> {
  const validIds = deviceIds.filter((id): id is string => id !== null);
  if (validIds.length === 0) return new Map();
  
  const identities = await GameIdentity.find({ 
    gameSlug,
    deviceId: { $in: validIds } 
  });
  const map = new Map<string, PlayerInfo>();
  
  for (const identity of identities) {
    map.set(identity.deviceId, {
      displayName: identity.displayName || 'Unknown Player',
      avatar: identity.avatar || 'BIRD1'
    });
  }
  
  return map;
}

const createBattleSchema = z.object({
  mapData: z.record(z.unknown()).optional(),
  isPrivate: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    const { gameSlug } = await params;
    
    const gameResult = await validateAsyncGame(gameSlug);
    if (!isGameContext(gameResult)) {
      return gameResult;
    }

    await connectToDatabase();

    const auth = await authenticateDevice(request, gameResult.slug);

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const cursor = searchParams.get('cursor');

    const isPaginated = limitParam !== null || cursor !== null;
    const limit = isPaginated 
      ? Math.min(Math.max(1, parseInt(limitParam || '9', 10)), 50)
      : null;

    const baseQuery: Record<string, unknown> = { 
      gameSlug: gameResult.slug,
      isPrivate: { $ne: true },
      status: { $ne: 'abandoned' }
    };

    if (cursor) {
      try {
        const { lastId } = JSON.parse(Buffer.from(cursor, 'base64').toString());
        const mongoose = await import('mongoose');
        baseQuery._id = { $lt: new mongoose.Types.ObjectId(lastId) };
      } catch {
        return NextResponse.json({
          success: false,
          error: 'Invalid cursor',
        }, { status: 400 });
      }
    }

    const total = await Battle.countDocuments({ 
      gameSlug: gameResult.slug,
      isPrivate: { $ne: true }, 
      status: { $ne: 'abandoned' } 
    });

    const statusCounts = await Battle.aggregate([
      { $match: { gameSlug: gameResult.slug, isPrivate: { $ne: true }, status: { $ne: 'abandoned' } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const counts: Record<string, number> = {};
    for (const { _id, count } of statusCounts) {
      counts[_id] = count;
    }

    let battlesQuery = Battle.find(baseQuery).sort({ _id: -1 });
    if (limit !== null) {
      battlesQuery = battlesQuery.limit(limit);
    }
    const battles = await battlesQuery;

    const allPlayerIds = battles.flatMap(b => [b.player1DeviceId, b.player2DeviceId]);
    const playerInfoMap = await getPlayerInfo(gameResult.slug, allPlayerIds);

    const battlesWithPlayerInfo = battles.map(battle => {
      const battleObj = battle.toObject();
      const p1Info = playerInfoMap.get(battle.player1DeviceId);
      const p2Info = battle.player2DeviceId ? playerInfoMap.get(battle.player2DeviceId) : null;
      
      let winner: number | null = null;
      if (battleObj.status === 'completed' && battleObj.winnerId) {
        if (battleObj.winnerId === battleObj.player1DeviceId) {
          winner = 0;
        } else if (battleObj.winnerId === battleObj.player2DeviceId) {
          winner = 1;
        }
      }
      
      return {
        battleId: battleObj.battleId,
        displayName: battleObj.displayName,
        player1DeviceId: battleObj.player1DeviceId,
        player2DeviceId: battleObj.player2DeviceId,
        player1DisplayName: p1Info?.displayName || 'Unknown Player',
        player1Avatar: p1Info?.avatar || 'BIRD1',
        player2DisplayName: p2Info?.displayName || null,
        player2Avatar: p2Info?.avatar || null,
        status: battleObj.status,
        currentTurn: battleObj.currentTurn,
        currentPlayerIndex: battleObj.currentPlayerIndex,
        isPrivate: battleObj.isPrivate,
        lastTurnAt: battleObj.lastTurnAt,
        mapName: battleObj.mapData?.selection || 'Unknown Map',
        winner,
      };
    });

    const hasMore = isPaginated && limit !== null && battles.length === limit;
    const lastBattle = battles[battles.length - 1];
    const nextCursor = hasMore && lastBattle
      ? Buffer.from(JSON.stringify({ lastId: lastBattle._id.toString() })).toString('base64')
      : null;

    const pagination: Record<string, unknown> = {
      hasMore,
      nextCursor,
      total,
      counts,
      limits: { maxTotal: MAX_ACTIVE_GAMES },
    };

    if (auth) {
      const userTotal = await getUserActiveGameCount(gameResult.slug, auth.deviceId);
      pagination.userCounts = { total: userTotal };
    }

    return NextResponse.json({
      success: true,
      game: { slug: gameResult.slug, name: gameResult.game.name },
      battles: battlesWithPlayerInfo,
      pagination,
    });
  } catch (error) {
    console.error('Fetch battles error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch battles',
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    const { gameSlug } = await params;
    
    const gameResult = await validateAsyncGame(gameSlug);
    if (!isGameContext(gameResult)) {
      return gameResult;
    }

    const auth = await authenticateDevice(request, gameResult.slug);
    
    if (!auth) {
      return unauthorizedResponse('Player authentication required');
    }

    await connectToDatabase();

    const body = await request.json().catch(() => ({}));
    
    const parsed = createBattleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: parsed.error.issues,
      }, { status: 400 });
    }

    const { mapData, isPrivate } = parsed.data;

    const userActiveCount = await getUserActiveGameCount(gameResult.slug, auth.deviceId);
    if (userActiveCount >= MAX_ACTIVE_GAMES) {
      return NextResponse.json({
        success: false,
        error: 'limit_reached',
        message: 'Maximum 9 active games allowed',
      }, { status: 403 });
    }

    const battleId = generateSecureToken().substring(0, 16);
    const displayName = generateBattleName(battleId, gameResult.game.haikunator);

    const battle = new Battle({
      gameSlug: gameResult.slug,
      battleId,
      displayName,
      player1DeviceId: auth.deviceId,
      player2DeviceId: null,
      status: 'pending',
      currentTurn: 0,
      currentPlayerIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      winnerId: null,
      mapData: mapData || {},
      isPrivate: isPrivate || false,
      turns: [],
    });

    await battle.save();

    return NextResponse.json({
      success: true,
      game: { slug: gameResult.slug, name: gameResult.game.name },
      battle: {
        battleId: battle.battleId,
        displayName: battle.displayName,
        status: battle.status,
        currentTurn: battle.currentTurn,
        isPrivate: battle.isPrivate,
      },
      message: battle.isPrivate 
        ? 'Private battle created. Share the battleId with your opponent to join.'
        : 'Battle created. Waiting for opponent to join.',
    }, { status: 201 });

  } catch (error) {
    console.error('Create battle error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create battle',
    }, { status: 500 });
  }
}
