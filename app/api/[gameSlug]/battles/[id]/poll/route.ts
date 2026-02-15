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

    const battleSummary = await Battle.findOne(
      { gameSlug: gameResult.slug, battleId: id },
      { updatedAt: 1, currentTurn: 1 }
    ).lean();

    if (!battleSummary) {
      return NextResponse.json({
        success: false,
        error: 'Battle not found',
      }, { status: 404 });
    }

    const currentETag = `"${battleSummary.updatedAt?.getTime() ?? 0}-${battleSummary.currentTurn}"`;
    const requestETag = request.headers.get('if-none-match');

    if (requestETag === currentETag) {
      const notModified = new NextResponse(null, { status: 304 });
      notModified.headers.set('ETag', currentETag);
      notModified.headers.set('Cache-Control', 'no-cache');
      return notModified;
    }

    const battle = await Battle.findOne({
      gameSlug: gameResult.slug,
      battleId: id,
    }).select('-mapData');

    if (!battle) {
      return NextResponse.json({
        success: false,
        error: 'Battle not found',
      }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const lastKnownTurn = parseInt(searchParams.get('lastKnownTurn') || '0', 10);

    const hasNewTurns = battle.currentTurn > lastKnownTurn;
    const newTurns = hasNewTurns 
      ? battle.turns.filter(t => t.turnNumber > lastKnownTurn).sort((a, b) => a.turnNumber - b.turnNumber)
      : [];

    const response = NextResponse.json({
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

    response.headers.set('ETag', currentETag);
    response.headers.set('Cache-Control', 'no-cache');

    return response;
  } catch (error) {
    console.error('Poll battle error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to poll battle',
    }, { status: 500 });
  }
}
