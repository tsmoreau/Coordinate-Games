'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { Battle } from '@/models/Battle';
import { GameIdentity } from '@/models/GameIdentity';

interface PlayerInfo {
  displayName: string;
  avatar: string | null;
}

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

async function getPlayerInfo(deviceIds: (string | null)[], gameSlug: string): Promise<Map<string, PlayerInfo>> {
  const validIds = deviceIds.filter((id): id is string => id !== null);
  if (validIds.length === 0) return new Map();
  
  const identities = await GameIdentity.find({ deviceId: { $in: validIds }, gameSlug });
  const map = new Map<string, PlayerInfo>();
  
  for (const identity of identities) {
    map.set(identity.deviceId, {
      displayName: identity.displayName || 'Unknown Player',
      avatar: identity.avatar || null,
    });
  }
  
  return map;
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
    .sort({ updatedAt: -1 })
    .limit(limit);

  const battlesByGame = new Map<string, typeof battles>();
  for (const battle of battles) {
    const slug = battle.gameSlug;
    if (!battlesByGame.has(slug)) battlesByGame.set(slug, []);
    battlesByGame.get(slug)!.push(battle);
  }

  const playerInfoMaps = new Map<string, Map<string, PlayerInfo>>();
  for (const [slug, gameBattles] of battlesByGame) {
    const allPlayerIds = gameBattles.flatMap(b => [b.player1DeviceId, b.player2DeviceId]);
    playerInfoMaps.set(slug, await getPlayerInfo(allPlayerIds, slug));
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
  player1Avatar: string;
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

export async function getBattleByDisplayName(displayName: string): Promise<BattleProfile | null> {
  await connectToDatabase();
  
  const battle = await Battle.findOne({ 
    displayName: { $regex: new RegExp(`^${displayName}$`, 'i') }
  });
  
  if (!battle) {
    return null;
  }

  const battleObj = battle.toObject();
  const playerInfoMap = await getPlayerInfo([battleObj.player1DeviceId, battleObj.player2DeviceId], battleObj.gameSlug);

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
  
  const battle = await Battle.findOne({ battleId });
  
  if (!battle) {
    return [];
  }
  
  return battle.turns.sort((a, b) => b.turnNumber - a.turnNumber).map(turn => ({
    turnId: turn.turnId,
    deviceId: turn.deviceId,
    turnNumber: turn.turnNumber,
    actions: turn.actions,
    timestamp: turn.timestamp.toISOString(),
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
