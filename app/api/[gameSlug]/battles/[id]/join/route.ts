import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Battle, IUnit, IBlockedTile } from '@/models/Battle';
import { authenticateDevice, unauthorizedResponse } from '@/lib/authMiddleware';
import { validateAsyncGame, isGameContext } from '@/lib/gameMiddleware';

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

function initializeCurrentStateFromMapData(
  mapData: Record<string, unknown>,
  player1DeviceId: string,
  player2DeviceId: string
): { units: IUnit[]; blockedTiles: IBlockedTile[] } {
  const units: IUnit[] = [];
  const blockedTiles: IBlockedTile[] = [];

  const unitPlacements = mapData.unitPlacement as Array<{
    birdType: string;
    gridX: number;
    gridZ: number;
    player?: number;
  }> | undefined;

  if (unitPlacements && Array.isArray(unitPlacements)) {
    unitPlacements.forEach((placement, index) => {
      const owner = placement.player === 2 ? player2DeviceId : player1DeviceId;
      units.push({
        unitId: `${owner}_u${index}`,
        type: placement.birdType || 'BIRD1',
        x: placement.gridX,
        y: placement.gridZ,
        hp: 10,
        owner
      });
    });
  }

  const itemPlacements = mapData.itemPlacement as Array<{
    itemType: string;
    gridX: number;
    gridZ: number;
    canMoveOn?: boolean;
  }> | undefined;

  if (itemPlacements && Array.isArray(itemPlacements)) {
    itemPlacements.forEach((item) => {
      if (item.canMoveOn === false) {
        blockedTiles.push({
          x: item.gridX,
          y: item.gridZ,
          itemType: item.itemType
        });
      }
    });
  }

  return { units, blockedTiles };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameSlug: string; id: string }> }
) {
  try {
    const { gameSlug, id } = await params;
    
    const gameResult = await validateAsyncGame(gameSlug);
    if (!isGameContext(gameResult)) {
      return gameResult;
    }

    const auth = await authenticateDevice(request, gameResult.slug);
    
    if (!auth) {
      return unauthorizedResponse('Player authentication required');
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

    if (battle.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: 'Battle is not in pending state',
      }, { status: 400 });
    }

    if (battle.player1DeviceId === auth.deviceId) {
      return NextResponse.json({
        success: false,
        error: 'Cannot join your own battle',
      }, { status: 400 });
    }

    const userActiveCount = await getUserActiveGameCount(gameResult.slug, auth.deviceId);
    if (userActiveCount >= MAX_ACTIVE_GAMES) {
      return NextResponse.json({
        success: false,
        error: 'limit_reached',
        message: 'Maximum 9 active games allowed',
      }, { status: 403 });
    }

    battle.player2DeviceId = auth.deviceId;
    battle.status = 'active';
    battle.updatedAt = new Date();
    battle.lastTurnAt = new Date();

    const initialState = initializeCurrentStateFromMapData(
      battle.mapData,
      battle.player1DeviceId,
      auth.deviceId
    );
    battle.currentState = initialState;

    await battle.save();

    return NextResponse.json({
      success: true,
      game: { slug: gameResult.slug, name: gameResult.game.name },
      battle: {
        battleId: battle.battleId,
        status: battle.status,
        currentTurn: battle.currentTurn,
        player1DeviceId: battle.player1DeviceId,
        player2DeviceId: battle.player2DeviceId,
        currentState: battle.currentState,
      },
      message: 'Joined battle successfully. Battle is now active.',
    });

  } catch (error) {
    console.error('Join battle error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to join battle',
    }, { status: 500 });
  }
}
