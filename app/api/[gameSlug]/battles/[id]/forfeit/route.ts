import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Battle } from '@/models/Battle';
import { GameIdentity } from '@/models/GameIdentity';
import { authenticateDevice, unauthorizedResponse } from '@/lib/authMiddleware';
import { validateAsyncGame, isGameContext } from '@/lib/gameMiddleware';

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

    if (battle.status !== 'active' && battle.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: `Cannot forfeit battle. Current status: ${battle.status}`,
      }, { status: 400 });
    }

    const players = [battle.player1DeviceId, battle.player2DeviceId];
    
    if (!players.includes(auth.deviceId)) {
      return NextResponse.json({
        success: false,
        error: 'You are not a participant in this battle',
      }, { status: 403 });
    }

    if (battle.status === 'pending') {
      battle.status = 'abandoned';
      battle.endReason = 'cancelled';
    } else {
      battle.status = 'completed';
      battle.endReason = 'forfeit';
      battle.winnerId = auth.deviceId === battle.player1DeviceId 
        ? battle.player2DeviceId 
        : battle.player1DeviceId;
    }
    
    battle.updatedAt = new Date();
    await battle.save();

    // Increment wins/losses on active battle forfeit
    if (battle.status === 'completed' && battle.winnerId) {
      await Promise.all([
        GameIdentity.updateOne(
          { gameSlug: gameResult.slug, deviceId: battle.winnerId },
          { $inc: { 'stats.wins': 1 } }
        ),
        GameIdentity.updateOne(
          { gameSlug: gameResult.slug, deviceId: auth.deviceId },
          { $inc: { 'stats.losses': 1 } }
        ),
      ]);
    }

    return NextResponse.json({
      success: true,
      game: { slug: gameResult.slug, name: gameResult.game.name },
      battle: {
        battleId: battle.battleId,
        status: battle.status,
        winnerId: battle.winnerId,
        endReason: battle.endReason,
      },
      message: battle.status === 'abandoned' 
        ? 'Battle cancelled successfully'
        : 'You have forfeited the battle',
    });

  } catch (error) {
    console.error('Forfeit battle error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to forfeit battle',
    }, { status: 500 });
  }
}
