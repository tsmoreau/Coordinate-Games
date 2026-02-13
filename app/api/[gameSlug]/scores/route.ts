import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Score } from '@/models/Score';
import { GameIdentity } from '@/models/GameIdentity';
import { authenticateDevice, unauthorizedResponse } from '@/lib/authMiddleware';
import { validateLeaderboardGame, isGameContext } from '@/lib/gameMiddleware';
import { z } from 'zod';

const submitScoreSchema = z.object({
  score: z.number().int().min(0).max(999999999),
  category: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Category must be alphanumeric with dashes/underscores').optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    const { gameSlug } = await params;
    
    const gameResult = await validateLeaderboardGame(gameSlug);
    if (!isGameContext(gameResult)) {
      return gameResult;
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const period = searchParams.get('period');
    const category = searchParams.get('category');
    const filter = searchParams.get('filter');

    const limit = Math.min(Math.max(1, parseInt(limitParam || '100', 10)), 500);
    const offset = Math.max(0, parseInt(offsetParam || '0', 10));

    const baseQuery: Record<string, unknown> = { 
      gameSlug: gameResult.slug 
    };

    if (category) {
      baseQuery.category = category;
    }

    if (period === 'day') {
      baseQuery.createdAt = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    } else if (period === 'week') {
      baseQuery.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (period === 'month') {
      baseQuery.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }

    const categories = await Score.distinct('category', { gameSlug: gameResult.slug });

    if (filter === 'top') {
      const matchStage: Record<string, unknown> = { gameSlug: gameResult.slug };
      if (category) {
        matchStage.category = category;
      }
      if (baseQuery.createdAt) {
        matchStage.createdAt = baseQuery.createdAt;
      }

      const topScores = await Score.aggregate([
        { $match: matchStage },
        { $sort: { score: -1, createdAt: 1 } },
        {
          $group: {
            _id: '$category',
            entries: {
              $push: {
                score: '$score',
                deviceId: '$deviceId',
                displayName: '$displayName',
                metadata: '$metadata',
                createdAt: '$createdAt',
              },
            },
          },
        },
        {
          $project: {
            entries: { $slice: ['$entries', 10] },
          },
        },
        { $sort: { '_id': 1 } },
      ]);

      const formattedScores = topScores.map((group) => ({
        category: group._id || 'default',
        scores: group.entries.map((entry: Record<string, unknown>, index: number) => ({
          rank: index + 1,
          deviceId: entry.deviceId,
          displayName: entry.displayName,
          score: entry.score,
          metadata: entry.metadata,
          createdAt: entry.createdAt,
        })),
      }));

      return NextResponse.json({
        success: true,
        game: { slug: gameResult.slug, name: gameResult.game.name },
        filter: 'top',
        category: category || null,
        categories,
        scores: formattedScores,
        total: formattedScores.length,
      });
    }

    const total = await Score.countDocuments(baseQuery);

    const scores = await Score.find(baseQuery)
      .sort({ score: -1, createdAt: 1 })
      .skip(offset)
      .limit(limit);

    const formattedScores = scores.map((score, index) => ({
      rank: offset + index + 1,
      deviceId: score.deviceId,
      displayName: score.displayName,
      score: score.score,
      category: score.category || 'default',
      metadata: score.metadata,
      createdAt: score.createdAt,
    }));

    return NextResponse.json({
      success: true,
      game: { slug: gameResult.slug, name: gameResult.game.name },
      category: category || null,
      categories,
      scores: formattedScores,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + scores.length < total,
      },
    });
  } catch (error) {
    console.error('Fetch scores error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch scores',
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    const { gameSlug } = await params;
    
    const gameResult = await validateLeaderboardGame(gameSlug);
    if (!isGameContext(gameResult)) {
      return gameResult;
    }

    const auth = await authenticateDevice(request, gameResult.slug);
    
    if (!auth) {
      return unauthorizedResponse('Player authentication required');
    }

    await connectToDatabase();

    const body = await request.json().catch(() => ({}));
    
    const parsed = submitScoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: parsed.error.issues,
      }, { status: 400 });
    }

    const { score, category, metadata } = parsed.data;
    const resolvedCategory = category || 'default';

    const newScore = new Score({
      gameSlug: gameResult.slug,
      deviceId: auth.deviceId,
      displayName: auth.displayName,
      score,
      category: resolvedCategory,
      metadata: metadata || {},
      createdAt: new Date(),
    });

    await newScore.save();

    const rank = await Score.countDocuments({
      gameSlug: gameResult.slug,
      category: resolvedCategory,
      score: { $gt: score }
    }) + 1;

    const personalBest = await Score.findOne({
      gameSlug: gameResult.slug,
      category: resolvedCategory,
      deviceId: auth.deviceId
    }).sort({ score: -1 });

    const isPersonalBest = personalBest ? personalBest.score <= score : true;

    return NextResponse.json({
      success: true,
      game: { slug: gameResult.slug, name: gameResult.game.name },
      score: {
        deviceId: newScore.deviceId,
        displayName: newScore.displayName,
        score: newScore.score,
        category: resolvedCategory,
        rank,
        isPersonalBest,
        createdAt: newScore.createdAt,
      },
      message: isPersonalBest ? 'New personal best!' : 'Score submitted successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Submit score error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to submit score',
    }, { status: 500 });
  }
}
