'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { GameIdentity } from '@/models/GameIdentity';
import { Battle } from '@/models/Battle';
import { Score } from '@/models/Score';

export interface PlayerProfile {
  deviceId: string;
  displayName: string;
  avatar: string | null;
  gameSlug: string;
  createdAt: string;
  lastSeen: string;
  isActive: boolean;
  stats: {
    totalBattles: number;
    completedBattles: number;
    activeBattles: number;
    pendingBattles: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: string;
    totalTurnsSubmitted: number;
  };
}

export interface PlayerListEntry {
  deviceId: string;
  displayName: string;
  avatar: string | null;
  lastSeen: string;
  createdAt: string;
  isActive: boolean;
}

export interface BattleWithOpponent {
  battleId: string;
  displayName: string;
  gameSlug: string;
  status: string;
  opponentName: string | null;
  opponentDeviceId: string | null;
  isPlayer1: boolean;
  winnerId: string | null;
  endReason: string | null;
  currentTurn: number;
  createdAt: string;
  updatedAt: string;
}

export async function getGamePlayersList(gameSlug: string, limit: number = 50): Promise<PlayerListEntry[]> {
  await connectToDatabase();

  const identities = await GameIdentity.find({ gameSlug, isActive: true })
    .sort({ lastSeen: -1 })
    .limit(limit);

  return identities.map(identity => {
    const obj = identity.toObject();
    return {
      deviceId: obj.deviceId,
      displayName: obj.displayName || 'Unnamed Player',
      avatar: obj.avatar || null,
      lastSeen: obj.lastSeen.toISOString(),
      createdAt: obj.createdAt ? obj.createdAt.toISOString() : obj.lastSeen.toISOString(),
      isActive: obj.isActive,
    };
  });
}

export async function getPlayerByDisplayName(displayName: string, gameSlug?: string): Promise<PlayerProfile | null> {
  await connectToDatabase();

  const escapedName = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const query: Record<string, unknown> = {
    displayName: { $regex: new RegExp(`^${escapedName}$`, 'i') },
  };
  if (gameSlug) {
    query.gameSlug = gameSlug;
  }

  const identity = await GameIdentity.findOne(query);
  
  if (!identity) {
    return null;
  }

  const deviceId = identity.deviceId;
  const slug = identity.gameSlug;
  const s = identity.stats || { wins: 0, losses: 0, draws: 0, totalTurns: 0, totalBattles: 0 };

  // Only active/pending counts need a live query — they fluctuate
  const liveCounts = await Battle.aggregate([
    {
      $match: {
        gameSlug: slug,
        status: { $in: ['active', 'pending'] },
        $or: [
          { player1DeviceId: deviceId },
          { player2DeviceId: deviceId },
        ],
      }
    },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const countMap: Record<string, number> = {};
  for (const { _id, count } of liveCounts) {
    countMap[_id] = count;
  }

  const completedBattles = s.wins + s.losses + s.draws;
  const winRate = completedBattles > 0
    ? ((s.wins / completedBattles) * 100).toFixed(1)
    : '0.0';

  const obj = identity.toObject();

  return {
    deviceId: obj.deviceId,
    displayName: obj.displayName || 'Unknown Player',
    avatar: obj.avatar || null,
    gameSlug: obj.gameSlug,
    createdAt: obj.createdAt ? obj.createdAt.toISOString() : obj.lastSeen.toISOString(),
    lastSeen: obj.lastSeen.toISOString(),
    isActive: obj.isActive,
    stats: {
      totalBattles: s.totalBattles,
      completedBattles,
      activeBattles: countMap.active || 0,
      pendingBattles: countMap.pending || 0,
      wins: s.wins,
      losses: s.losses,
      draws: s.draws,
      winRate: `${winRate}%`,
      totalTurnsSubmitted: s.totalTurns
    }
  };
}

export async function getPlayerBattles(deviceId: string, gameSlug: string, limit: number = 10): Promise<BattleWithOpponent[]> {
  await connectToDatabase();
  
  const battles = await Battle.find({
    gameSlug,
    $or: [
      { player1DeviceId: deviceId },
      { player2DeviceId: deviceId }
    ]
  })
    .select('-turns -currentState -mapData')
    .sort({ updatedAt: -1 })
    .limit(limit);

  const opponentDeviceIds = battles.map(b => {
    const battleObj = b.toObject();
    return battleObj.player1DeviceId === deviceId 
      ? battleObj.player2DeviceId 
      : battleObj.player1DeviceId;
  }).filter(Boolean) as string[];

  const opponents = await GameIdentity.find({
    gameSlug,
    deviceId: { $in: opponentDeviceIds }
  }).select('deviceId displayName');

  const opponentMap = new Map(
    opponents.map(p => [p.deviceId, p.displayName])
  );

  return battles.map(battle => {
    const battleObj = battle.toObject();
    const isPlayer1 = battleObj.player1DeviceId === deviceId;
    const opponentDeviceId = isPlayer1 ? battleObj.player2DeviceId : battleObj.player1DeviceId;
    
    return {
      battleId: battleObj.battleId,
      displayName: battleObj.displayName || 'Unnamed Battle',
      gameSlug: battleObj.gameSlug,
      status: battleObj.status,
      opponentName: opponentDeviceId ? (opponentMap.get(opponentDeviceId) || 'Unknown') : null,
      opponentDeviceId: opponentDeviceId,
      isPlayer1,
      winnerId: battleObj.winnerId,
      endReason: battleObj.endReason,
      currentTurn: battleObj.currentTurn,
      createdAt: battleObj.createdAt.toISOString(),
      updatedAt: battleObj.updatedAt.toISOString()
    };
  });
}

export interface PlayerScoreEntry {
  id: string;
  score: number;
  category: string;
  createdAt: string;
}

export async function getPlayerScores(deviceId: string, gameSlug: string, limit: number = 20): Promise<PlayerScoreEntry[]> {
  await connectToDatabase();

  const scores = await Score.find({ gameSlug, deviceId })
    .sort({ score: -1 })
    .limit(limit)
    .lean();

  return scores.map((s: any) => ({
    id: s._id.toString(),
    score: s.score,
    category: s.category || 'default',
    createdAt: new Date(s.createdAt).toISOString(),
  }));
}
