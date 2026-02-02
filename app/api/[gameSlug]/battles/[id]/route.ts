import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Battle } from '@/models/Battle';
import { GameIdentity } from '@/models/GameIdentity';
import { validateAsyncGame, isGameContext } from '@/lib/gameMiddleware';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameSlug: string; id: string }> }
) {
  try {
    const { gameSlug, id } = await params;
    
    const gameResult = await validateAsyncGame(gameSlug);
    if (!isGameContext(gameResult)) {
      return gameResult;
    }

    await connectToDatabase();

    const battle = await Battle.findOne({ 
      gameSlug: gameResult.slug,
      battleId: id 
    });

    if (!battle) {
      return NextResponse.json({
        success: false,
        error: 'Battle not found',
      }, { status: 404 });
    }

    const playerInfoMap = await getPlayerInfo(gameResult.slug, [battle.player1DeviceId, battle.player2DeviceId]);
    const p1Info = playerInfoMap.get(battle.player1DeviceId);
    const p2Info = battle.player2DeviceId ? playerInfoMap.get(battle.player2DeviceId) : null;

    let winner: number | null = null;
    if (battle.status === 'completed' && battle.winnerId) {
      if (battle.winnerId === battle.player1DeviceId) {
        winner = 0;
      } else if (battle.winnerId === battle.player2DeviceId) {
        winner = 1;
      }
    }

    return NextResponse.json({
      success: true,
      game: { slug: gameResult.slug, name: gameResult.game.name },
      battle: {
        battleId: battle.battleId,
        displayName: battle.displayName,
        player1DeviceId: battle.player1DeviceId,
        player2DeviceId: battle.player2DeviceId,
        player1DisplayName: p1Info?.displayName || 'Unknown Player',
        player1Avatar: p1Info?.avatar || 'BIRD1',
        player2DisplayName: p2Info?.displayName || null,
        player2Avatar: p2Info?.avatar || null,
        status: battle.status,
        currentTurn: battle.currentTurn,
        currentPlayerIndex: battle.currentPlayerIndex,
        isPrivate: battle.isPrivate,
        lastTurnAt: battle.lastTurnAt,
        mapData: battle.mapData,
        currentState: battle.currentState,
        winnerId: battle.winnerId,
        endReason: battle.endReason,
        winner,
        createdAt: battle.createdAt,
        updatedAt: battle.updatedAt,
      },
    });
  } catch (error) {
    console.error('Fetch battle error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch battle',
    }, { status: 500 });
  }
}
