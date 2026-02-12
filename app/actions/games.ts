'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { Game } from '@/models/Game';
import { GameIdentity } from '@/models/GameIdentity';
import { Battle } from '@/models/Battle';
import { Score } from '@/models/Score';

export interface PublicGameInfo {
  slug: string;
  name: string;
  description: string | null;
  tagline: string | null;
  capabilities: string[];
  avatars: string[];
  maintenance: boolean;
  motd: string | null;
  playerCount: number;
  activeBattles: number;
  pendingBattles: number;
  completedBattles: number;
}

export interface GameDeviceInfo {
  deviceId: string;
  displayName: string;
  avatar: string | null;
  lastSeen: string;
}

async function getGameBattleStats(gameSlug: string) {
  const battleStats = await Battle.aggregate([
    { $match: { gameSlug } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  return battleStats.reduce((acc: Record<string, number>, item: { _id: string; count: number }) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
}

export async function getActiveGames(): Promise<PublicGameInfo[]> {
  await connectToDatabase();

  const games = await Game.find({ active: true }).sort({ createdAt: 1 });

  const gameInfos: PublicGameInfo[] = await Promise.all(
    games.map(async (game) => {
      const [playerCount, statusMap] = await Promise.all([
        GameIdentity.countDocuments({ gameSlug: game.slug, isActive: true }),
        getGameBattleStats(game.slug)
      ]);

      return {
        slug: game.slug,
        name: game.name,
        description: game.description || null,
        tagline: game.tagline || null,
        capabilities: game.capabilities,
        avatars: game.avatars || [],
        maintenance: game.maintenance,
        motd: game.motd || null,
        playerCount,
        activeBattles: statusMap.active || 0,
        pendingBattles: statusMap.pending || 0,
        completedBattles: statusMap.completed || 0,
      };
    })
  );

  return gameInfos;
}

export async function getPublicGameBySlug(gameSlug: string): Promise<PublicGameInfo | null> {
  await connectToDatabase();

  const game = await Game.findOne({ slug: gameSlug.toLowerCase(), active: true });
  if (!game) return null;

  const [playerCount, statusMap] = await Promise.all([
    GameIdentity.countDocuments({ gameSlug: game.slug, isActive: true }),
    getGameBattleStats(game.slug)
  ]);

  return {
    slug: game.slug,
    name: game.name,
    description: game.description || null,
    tagline: game.tagline || null,
    capabilities: game.capabilities,
    avatars: game.avatars || [],
    maintenance: game.maintenance,
    motd: game.motd || null,
    playerCount,
    activeBattles: statusMap.active || 0,
    pendingBattles: statusMap.pending || 0,
    completedBattles: statusMap.completed || 0,
  };
}

export async function getGameDevices(gameSlug: string, limit: number = 5): Promise<GameDeviceInfo[]> {
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
    };
  });
}

export interface PublicScoreEntry {
  rank: number;
  deviceId: string;
  displayName: string;
  score: number;
  createdAt: string;
}

export interface CategoryLeaderboard {
  category: string;
  scores: PublicScoreEntry[];
}

export async function getGameLeaderboards(gameSlug: string, limit: number = 10): Promise<CategoryLeaderboard[]> {
  await connectToDatabase();

  const categories = await Score.distinct('category', { gameSlug });

  if (categories.length === 0) return [];

  const leaderboards: CategoryLeaderboard[] = await Promise.all(
    categories.sort().map(async (category) => {
      const scores = await Score.find({ gameSlug, category })
        .sort({ score: -1, createdAt: 1 })
        .limit(limit);

      return {
        category: category || 'default',
        scores: scores.map((s, index) => ({
          rank: index + 1,
          deviceId: s.deviceId,
          displayName: s.displayName,
          score: s.score,
          createdAt: s.createdAt.toISOString(),
        })),
      };
    })
  );

  return leaderboards;
}