import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Score } from '@/models/Score';
import { GameIdentity } from '@/models/GameIdentity';
import { validateLeaderboardGame, isGameContext } from '@/lib/gameMiddleware';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameSlug: string; id: string }> }
) {
  try {
    const { gameSlug, id } = await params;

    const gameResult = await validateLeaderboardGame(gameSlug);
    if (!isGameContext(gameResult)) {
      return gameResult;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid score ID',
      }, { status: 400 });
    }

    await connectToDatabase();

    const score = await Score.findOne({
      _id: id,
      gameSlug: gameResult.slug,
    });

    if (!score) {
      return NextResponse.json({
        success: false,
        error: 'Score not found',
      }, { status: 404 });
    }

    // Resolve current display name
    const identity = await GameIdentity.findOne({
      gameSlug: gameResult.slug,
      deviceId: score.deviceId,
    }, { displayName: 1 });

    return NextResponse.json({
      success: true,
      game: { slug: gameResult.slug, name: gameResult.game.name },
      score: {
        id: score._id.toString(),
        deviceId: score.deviceId,
        displayName: identity?.displayName || score.displayName,
        score: score.score,
        category: score.category || 'default',
        metadata: score.metadata,
        createdAt: score.createdAt,
      },
    });
  } catch (error) {
    console.error('Fetch score error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch score',
    }, { status: 500 });
  }
}