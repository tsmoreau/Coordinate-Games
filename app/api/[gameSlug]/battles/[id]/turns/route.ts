import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Battle, IBattleDocument } from '@/models/Battle';
import { authenticateDevice, unauthorizedResponse } from '@/lib/authMiddleware';
import { validateAsyncGame, isGameContext } from '@/lib/gameMiddleware';
import { generateSecureToken } from '@/lib/auth';
import { z } from 'zod';

interface ActionData {
  type: string;
  unitId?: string;
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  targetId?: string;
  data?: Record<string, unknown>;
}

interface GameStateData {
  units?: Array<{
    unitId: string;
    type: string;
    x: number;
    y: number;
    hp: number;
    owner: string;
  }>;
  winner?: string;
  [key: string]: unknown;
}

function updateCurrentStateFromActions(
  battle: IBattleDocument,
  actions: ActionData[],
  gameState: GameStateData | undefined
): void {
  if (gameState?.units && Array.isArray(gameState.units)) {
    battle.currentState.units = gameState.units.map(u => ({
      unitId: u.unitId,
      type: u.type,
      x: u.x,
      y: u.y,
      hp: u.hp,
      owner: u.owner
    }));
  } else {
    for (const action of actions) {
      if (action.type === 'move' && action.unitId && action.to) {
        const unit = battle.currentState.units.find(u => u.unitId === action.unitId);
        if (unit) {
          unit.x = action.to.x;
          unit.y = action.to.y;
        }
      }
      
      if (action.type === 'build' && action.data) {
        const buildData = action.data as { unitId?: string; unitType?: string; x?: number; y?: number; owner?: string };
        if (buildData.unitId && buildData.unitType && buildData.x !== undefined && buildData.y !== undefined && buildData.owner) {
          battle.currentState.units.push({
            unitId: buildData.unitId,
            type: buildData.unitType,
            x: buildData.x,
            y: buildData.y,
            hp: 10,
            owner: buildData.owner
          });
        }
      }
    }
  }

  battle.currentState.units = battle.currentState.units.filter(u => u.hp > 0);
}

const MAX_ACTIONS_PER_TURN = 100;
const MAX_GAME_STATE_SIZE = 50000;

const positionSchema = z.object({ 
  x: z.number().int().min(-1000).max(1000), 
  y: z.number().int().min(-1000).max(1000) 
});

const turnActionSchema = z.object({
  type: z.enum(['move', 'attack', 'build', 'capture', 'wait', 'end_turn', 'take_off', 'land', 'supply', 'load', 'unload', 'combine']),
  unitId: z.string().max(50).optional(),
  from: positionSchema.optional(),
  to: positionSchema.optional(),
  targetId: z.string().max(50).optional(),
  data: z.record(z.unknown()).optional().refine(
    (data) => !data || JSON.stringify(data).length < 1000,
    { message: 'Action data too large' }
  ),
});

const submitTurnSchema = z.object({
  actions: z.array(turnActionSchema).min(1).max(MAX_ACTIONS_PER_TURN),
  gameState: z.record(z.unknown()).optional().refine(
    (state) => !state || JSON.stringify(state).length < MAX_GAME_STATE_SIZE,
    { message: 'Game state too large' }
  ),
});

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

    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 100000) {
      return NextResponse.json({
        success: false,
        error: 'Request payload too large',
      }, { status: 413 });
    }

    const auth = await authenticateDevice(request, gameResult.slug);
    
    if (!auth) {
      return unauthorizedResponse('Player authentication required');
    }

    await connectToDatabase();

    const body = await request.json().catch(() => ({}));
    
    const parsed = submitTurnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: parsed.error.issues.slice(0, 5),
      }, { status: 400 });
    }

    const { actions, gameState } = parsed.data;

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

    if (battle.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: `Battle is not active. Current status: ${battle.status}`,
      }, { status: 400 });
    }

    const players = [battle.player1DeviceId, battle.player2DeviceId];
    
    if (!players.includes(auth.deviceId)) {
      return NextResponse.json({
        success: false,
        error: 'You are not a participant in this battle',
      }, { status: 403 });
    }

    const currentPlayer = players[battle.currentPlayerIndex];

    if (currentPlayer !== auth.deviceId) {
      return NextResponse.json({
        success: false,
        error: 'It is not your turn',
      }, { status: 403 });
    }

    const expectedTurnNumber = battle.currentTurn + 1;
    
    const existingTurn = battle.turns.find(t => t.turnNumber === expectedTurnNumber);
    
    if (existingTurn) {
      return NextResponse.json({
        success: false,
        error: 'Turn already submitted',
      }, { status: 409 });
    }

    const validationErrors: string[] = [];
    
    const hasEndTurn = actions.some(a => a.type === 'end_turn');
    if (!hasEndTurn) {
      validationErrors.push('Turn must include end_turn action');
    }

    const isValid = validationErrors.length === 0;

    const turnId = generateSecureToken().substring(0, 16);

    const turn = {
      turnId,
      deviceId: auth.deviceId,
      turnNumber: expectedTurnNumber,
      actions,
      timestamp: new Date(),
      isValid,
      validationErrors,
      gameState: gameState || {},
    };

    battle.turns.push(turn);

    if (isValid) {
      battle.currentTurn = expectedTurnNumber;
      battle.currentPlayerIndex = (battle.currentPlayerIndex + 1) % 2;
      battle.updatedAt = new Date();
      battle.lastTurnAt = new Date();

      updateCurrentStateFromActions(
        battle,
        actions as ActionData[],
        gameState as GameStateData | undefined
      );

      if (gameState?.winner) {
        battle.status = 'completed';
        battle.winnerId = String(gameState.winner);
        battle.endReason = 'victory';
      }
    }

    await battle.save();

    return NextResponse.json({
      success: true,
      game: { slug: gameResult.slug, name: gameResult.game.name },
      turn: {
        turnId: turn.turnId,
        turnNumber: turn.turnNumber,
        isValid: turn.isValid,
        validationErrors: turn.validationErrors,
      },
      battle: {
        battleId: battle.battleId,
        currentTurn: battle.currentTurn,
        currentPlayerIndex: battle.currentPlayerIndex,
        status: battle.status,
        currentState: battle.currentState,
      },
      message: isValid ? 'Turn submitted successfully' : 'Turn submitted but contains validation errors',
    }, { status: 201 });

  } catch (error) {
    console.error('Submit turn error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to submit turn',
    }, { status: 500 });
  }
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

    const turns = battle.turns.sort((a, b) => a.turnNumber - b.turnNumber);

    return NextResponse.json({
      success: true,
      game: { slug: gameResult.slug, name: gameResult.game.name },
      battleId: battle.battleId,
      turns,
    });
  } catch (error) {
    console.error('Fetch turns error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch turns',
    }, { status: 500 });
  }
}
