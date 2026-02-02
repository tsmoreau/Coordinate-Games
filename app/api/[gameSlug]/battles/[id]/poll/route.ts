import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Battle } from '@/models/Battle';
import { validateAsyncGame, isGameContext } from '@/lib/gameMiddleware';

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

    const { searchParams } = new URL(request.url);
    const lastKnownTurn = parseInt(searchParams.get('lastKnownTurn') || '0', 10);

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

    const hasNewTurns = battle.currentTurn > lastKnownTurn;
    const newTurns = hasNewTurns 
      ? battle.turns.filter(t => t.turnNumber > lastKnownTurn).sort((a, b) => a.turnNumber - b.turnNumber)
      : [];

    return NextResponse.json({
      success: true,
      game: { slug: gameResult.slug, name: gameResult.game.name },
      battleId: battle.battleId,
      status: battle.status,
      currentTurn: battle.currentTurn,
      currentPlayerIndex: battle.currentPlayerIndex,
      hasNewTurns,
      newTurns,
      currentState: battle.currentState,
      winnerId: battle.winnerId,
      endReason: battle.endReason,
      lastTurnAt: battle.lastTurnAt,
    });
  } catch (error) {
    console.error('Poll battle error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to poll battle',
    }, { status: 500 });
  }
}
