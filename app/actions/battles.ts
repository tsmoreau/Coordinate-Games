'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { Battle } from '@/models/Battle';
import { GameIdentity } from '@/models/GameIdentity';
import { getPlayerInfo } from '@/lib/playerInfo';

export interface BattleWithDetails {
  battleId: string;
  displayName: string;
  gameSlug: string;
  player1DeviceId: string;
  player2DeviceId: string | null;
  player1DisplayName: string;
  player1Avatar: string | null;
  player2DisplayName: string | null;
  player2Avatar: string | null;
  status: 'pending' | 'active' | 'completed' | 'abandoned';
  currentTurn: number;
  currentPlayerIndex: number;
  isPrivate: boolean;
  lastTurnAt: string | null;
  mapName: string;
  createdAt: string;
  updatedAt: string;
  winnerId: string | null;
}

export async function getBattles(options?: { includePrivate?: boolean; limit?: number; gameSlug?: string }): Promise<BattleWithDetails[]> {
  await connectToDatabase();
  
  const query: Record<string, unknown> = options?.includePrivate 
    ? { status: { $ne: 'abandoned' } } 
    : { isPrivate: { $ne: true }, status: { $ne: 'abandoned' } };
  
  if (options?.gameSlug) {
    query.gameSlug = options.gameSlug;
  }
  
  const limit = options?.limit ?? 50;

  const battles = await Battle.find(query)
    .select('-turns -currentState')
    .sort({ updatedAt: -1 })
    .limit(limit);

  const battlesByGame = new Map<string, typeof battles>();
  for (const battle of battles) {
    const slug = battle.gameSlug;
    if (!battlesByGame.has(slug)) battlesByGame.set(slug, []);
    battlesByGame.get(slug)!.push(battle);
  }

  const playerInfoMaps = new Map<string, Awaited<ReturnType<typeof getPlayerInfo>>>();
  for (const [slug, gameBattles] of battlesByGame) {
    const allPlayerIds = gameBattles.flatMap(b => [b.player1DeviceId, b.player2DeviceId]);
    playerInfoMaps.set(slug, await getPlayerInfo(slug, allPlayerIds));
  }

  return battles.map(battle => {
    const battleObj = battle.toObject();
    const playerInfoMap = playerInfoMaps.get(battleObj.gameSlug) || new Map();
    const p1Info = playerInfoMap.get(battle.player1DeviceId);
    const p2Info = battle.player2DeviceId ? playerInfoMap.get(battle.player2DeviceId) : null;
    
    return {
      battleId: battleObj.battleId,
      displayName: battleObj.displayName,
      gameSlug: battleObj.gameSlug,
      player1DeviceId: battleObj.player1DeviceId,
      player2DeviceId: battleObj.player2DeviceId,
      player1DisplayName: p1Info?.displayName || 'Unknown Player',
      player1Avatar: p1Info?.avatar || null,
      player2DisplayName: p2Info?.displayName || null,
      player2Avatar: p2Info?.avatar || null,
      status: battleObj.status,
      currentTurn: battleObj.currentTurn,
      currentPlayerIndex: battleObj.currentPlayerIndex,
      isPrivate: battleObj.isPrivate,
      lastTurnAt: battleObj.lastTurnAt?.toISOString() || null,
      mapName: (battleObj.mapData?.selection as string) || 'Unknown Map',
      createdAt: battleObj.createdAt.toISOString(),
      updatedAt: battleObj.updatedAt.toISOString(),
      winnerId: battleObj.winnerId,
    };
  });
}

export interface BattleProfile {
  battleId: string;
  displayName: string;
  gameSlug: string;
  player1DeviceId: string;
  player1DisplayName: string;
  player1Avatar: string | null;
  player2DeviceId: string | null;
  player2DisplayName: string | null;
  player2Avatar: string | null;
  status: 'pending' | 'active' | 'completed' | 'abandoned';
  currentTurn: number;
  currentPlayerIndex: number;
  createdAt: string;
  updatedAt: string;
  winnerId: string | null;
  endReason: string | null;
  mapData: Record<string, unknown>;
  isPrivate: boolean;
}

export interface TurnData {
  turnId: string;
  deviceId: string;
  turnNumber: number;
  actions: Array<{
    type: string;
    unitId?: string;
    from?: { x: number; y: number };
    to?: { x: number; y: number };
    targetId?: string;
    data?: Record<string, unknown>;
  }>;
  timestamp: string;
  isValid: boolean;
  validationErrors: string[];
}

export async function getBattleByDisplayName(displayName: string, gameSlug?: string): Promise<BattleProfile | null> {
  await connectToDatabase();
  
  const escapedName = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const query: Record<string, unknown> = {
    displayName: { $regex: new RegExp(`^${escapedName}$`, 'i') },
  };
  if (gameSlug) {
    query.gameSlug = gameSlug;
  }

  const battle = await Battle.findOne(query).select('-turns -currentState');
  
  if (!battle) {
    return null;
  }

  const battleObj = battle.toObject();
  const playerInfoMap = await getPlayerInfo(battleObj.gameSlug, [battleObj.player1DeviceId, battleObj.player2DeviceId]);

  const p1Info = playerInfoMap.get(battleObj.player1DeviceId);
  const p2Info = battleObj.player2DeviceId ? playerInfoMap.get(battleObj.player2DeviceId) : null;

  return {
    battleId: battleObj.battleId,
    displayName: battleObj.displayName || 'Unnamed Battle',
    gameSlug: battleObj.gameSlug,
    player1DeviceId: battleObj.player1DeviceId,
    player1DisplayName: p1Info?.displayName || 'Unknown Player',
    player1Avatar: p1Info?.avatar || null,
    player2DeviceId: battleObj.player2DeviceId,
    player2DisplayName: p2Info?.displayName || null,
    player2Avatar: p2Info?.avatar || null,
    status: battleObj.status,
    currentTurn: battleObj.currentTurn,
    currentPlayerIndex: battleObj.currentPlayerIndex,
    createdAt: battleObj.createdAt.toISOString(),
    updatedAt: battleObj.updatedAt.toISOString(),
    winnerId: battleObj.winnerId,
    endReason: battleObj.endReason,
    mapData: battleObj.mapData,
    isPrivate: battleObj.isPrivate
  };
}

export async function getBattleTurns(battleId: string): Promise<TurnData[]> {
  await connectToDatabase();
  
  const battle = await Battle.findOne({ battleId }).select('turns').lean();
  
  if (!battle) {
    return [];
  }
  
  return battle.turns.sort((a: any, b: any) => b.turnNumber - a.turnNumber).map((turn: any) => ({
    turnId: turn.turnId,
    deviceId: turn.deviceId,
    turnNumber: turn.turnNumber,
    actions: turn.actions,
    timestamp: new Date(turn.timestamp).toISOString(),
    isValid: turn.isValid,
    validationErrors: turn.validationErrors
  }));
}

export interface HubStats {
  gamesCount: number;
  playerCount: number;
  activeBattles: number;
  pendingBattles: number;
  completedBattles: number;
  topScores: Array<{
    displayName: string;
    score: number;
    deviceId: string;
  }>;
}

export async function getHubStats(): Promise<HubStats> {
  const { Game } = await import('@/models/Game');
  const { Score } = await import('@/models/Score');
  
  await connectToDatabase();
  
  const [games, playerCount, battleStats, topScores] = await Promise.all([
    Game.countDocuments({ active: true }),
    GameIdentity.countDocuments({ isActive: true }),
    Battle.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]),
    Score.find({ gameSlug: "powerpentagon" })
      .sort({ score: -1 })
      .limit(5)
      .lean()
  ]);

  const statusMap = battleStats.reduce((acc: Record<string, number>, item: { _id: string; count: number }) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  return {
    gamesCount: games,
    playerCount,
    activeBattles: statusMap.active || 0,
    pendingBattles: statusMap.pending || 0,
    completedBattles: statusMap.completed || 0,
    topScores: topScores.map((s: any) => ({
      displayName: s.displayName,
      score: s.score,
      deviceId: s.deviceId
    }))
  };
}
