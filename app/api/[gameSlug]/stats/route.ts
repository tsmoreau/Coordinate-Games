import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Game } from '@/models/Game';
import { GameIdentity } from '@/models/GameIdentity';
import { Battle } from '@/models/Battle';
import { authenticateDevice, unauthorizedResponse } from '@/lib/authMiddleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    const { gameSlug } = await params;

    await connectToDatabase();

    const game = await Game.findOne({ slug: gameSlug, active: true });
    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }

    const auth = await authenticateDevice(request, gameSlug);
    if (!auth) {
      return unauthorizedResponse('Valid Bearer token required');
    }

    const { deviceId } = auth;

    const identity = await GameIdentity.findOne({ gameSlug, deviceId, isActive: true });
    if (!identity) {
      return unauthorizedResponse('Valid Bearer token required');
    }

    const playerFilter = {
      gameSlug,
      $or: [
        { player1DeviceId: deviceId },
        { player2DeviceId: deviceId },
      ],
    };

    const [statusCounts, winCount, drawCount, turnAgg] = await Promise.all([
      Battle.aggregate([
        { $match: playerFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      Battle.countDocuments({
        ...playerFilter,
        status: 'completed',
        winnerId: deviceId,
      }),

      Battle.countDocuments({
        ...playerFilter,
        status: 'completed',
        endReason: 'draw',
      }),

      Battle.aggregate([
        { $match: playerFilter },
        { $unwind: '$turns' },
        { $match: { 'turns.deviceId': deviceId } },
        { $count: 'total' },
      ]),
    ]);

    const counts: Record<string, number> = {};
    for (const entry of statusCounts) {
      counts[entry._id] = entry.count;
    }

    const activeBattles = counts['active'] || 0;
    const pendingBattles = counts['pending'] || 0;
    const completedBattles = counts['completed'] || 0;
    const abandonedBattles = counts['abandoned'] || 0;
    const totalBattles = activeBattles + pendingBattles + completedBattles + abandonedBattles;

    const wins = winCount;
    const draws = drawCount;
    const losses = completedBattles - wins - draws;

    const winRate = completedBattles > 0
      ? `${((wins / completedBattles) * 100).toFixed(1)}%`
      : '0.0%';

    const totalTurnsSubmitted = turnAgg.length > 0 ? turnAgg[0].total : 0;

    return NextResponse.json({
      success: true,
      stats: {
        deviceId: identity.deviceId,
        displayName: identity.displayName,
        avatar: identity.avatar,
        memberSince: identity.createdAt ? identity.createdAt.toISOString() : null,
        totalBattles,
        completedBattles,
        activeBattles,
        pendingBattles,
        wins,
        losses,
        draws,
        winRate,
        totalTurnsSubmitted,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
