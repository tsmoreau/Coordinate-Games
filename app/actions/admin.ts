'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { connectToDatabase } from '@/lib/mongodb';
import { Battle } from '@/models/Battle';
import { GameIdentity, VALID_AVATARS, PlayerAvatar } from '@/models/GameIdentity';
import { Game } from '@/models/Game';
import { AuditLog } from '@/models/AuditLog';
import { revalidatePath } from 'next/cache';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

export interface AdminPlayerDetails {
  deviceId: string;
  displayName: string;
  avatar: string;
  registeredAt: string;
  lastSeen: string;
  isActive: boolean;
  stats: {
    totalBattles: number;
    wins: number;
    losses: number;
    draws: number;
    activeBattles: number;
    pendingBattles: number;
  };
}

export interface AdminBattleDetails {
  battleId: string;
  displayName: string;
  player1DeviceId: string;
  player1DisplayName: string;
  player1Avatar: string;
  player2DeviceId: string | null;
  player2DisplayName: string | null;
  player2Avatar: string | null;
  status: 'pending' | 'active' | 'completed' | 'abandoned';
  currentTurn: number;
  currentPlayerIndex: number;
  winnerId: string | null;
  endReason: string | null;
  isPrivate: boolean;
  mapName: string;
  createdAt: string;
  updatedAt: string;
  lastTurnAt: string | null;
}

export interface AdminGameDetails {
  slug: string;
  name: string;
  capabilities: string[];
  active: boolean;
  maintenance: boolean;
  motd: string | null;
  createdAt: string;
  playerCount: number;
  battleCount: number;
}

export interface PlatformStats {
  totalGames: number;
  activeGames: number;
  totalPlayers: number;
  totalBattles: number;
  activeBattles: number;
  pendingBattles: number;
  completedBattles: number;
  abandonedBattles: number;
}

export interface GameStats {
  totalPlayers: number;
  activePlayers: number;
  bannedPlayers: number;
  totalBattles: number;
  activeBattles: number;
  pendingBattles: number;
  completedBattles: number;
  abandonedBattles: number;
}

async function requireAdminAuth(): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Unauthorized: Please log in' };
    }
    
    const userEmail = session.user.email?.toLowerCase();
    if (!userEmail) {
      return { success: false, error: 'Unauthorized: No email associated with account' };
    }
    
    if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(userEmail)) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }
    
    return { success: true };
  } catch {
    return { success: false, error: 'Authentication error' };
  }
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    throw new Error(auth.error);
  }

  try {
    await connectToDatabase();

    const [
      totalGames,
      activeGames,
      totalPlayers,
      totalBattles,
      activeBattles,
      pendingBattles,
      completedBattles,
      abandonedBattles
    ] = await Promise.all([
      Game.countDocuments({}),
      Game.countDocuments({ active: true }),
      GameIdentity.countDocuments({}),
      Battle.countDocuments({}),
      Battle.countDocuments({ status: 'active' }),
      Battle.countDocuments({ status: 'pending' }),
      Battle.countDocuments({ status: 'completed' }),
      Battle.countDocuments({ status: 'abandoned' })
    ]);

    return {
      totalGames,
      activeGames,
      totalPlayers,
      totalBattles,
      activeBattles,
      pendingBattles,
      completedBattles,
      abandonedBattles
    };
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    throw new Error('Failed to fetch platform stats');
  }
}

export async function getAllGames(): Promise<AdminGameDetails[]> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    throw new Error(auth.error);
  }

  try {
    await connectToDatabase();

    const games = await Game.find({}).sort({ createdAt: 1 });

    const gameDetails: AdminGameDetails[] = await Promise.all(
      games.map(async (game) => {
        const [playerCount, battleCount] = await Promise.all([
          GameIdentity.countDocuments({ gameSlug: game.slug }),
          Battle.countDocuments({ gameSlug: game.slug })
        ]);

        return {
          slug: game.slug,
          name: game.name,
          capabilities: game.capabilities,
          active: game.active,
          maintenance: game.maintenance,
          motd: game.motd || null,
          createdAt: game.createdAt.toISOString(),
          playerCount,
          battleCount
        };
      })
    );

    return gameDetails;
  } catch (error) {
    console.error('Error fetching games:', error);
    throw new Error('Failed to fetch games');
  }
}

export async function getGameBySlug(gameSlug: string) {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    throw new Error(auth.error);
  }

  try {
    await connectToDatabase();
    const game = await Game.findOne({ slug: gameSlug.toLowerCase() });
    if (!game) return null;

    return {
      slug: game.slug,
      name: game.name,
      capabilities: game.capabilities,
      active: game.active,
      maintenance: game.maintenance,
      motd: game.motd || null,
      haikunator: game.haikunator ? { adjectives: [...game.haikunator.adjectives], nouns: [...game.haikunator.nouns] } : null,
      versioning: game.versioning ? { minVersion: game.versioning.minVersion, currentVersion: game.versioning.currentVersion, updateUrl: game.versioning.updateUrl } : null,
      createdAt: game.createdAt.toISOString()
    };
  } catch (error) {
    console.error('Error fetching game:', error);
    throw new Error('Failed to fetch game');
  }
}

export async function createGame(name: string, slug: string, capabilities: string[]): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    if (!name || !name.trim()) return { success: false, error: 'Game name is required' };
    if (!slug || !slug.trim()) return { success: false, error: 'Game slug is required' };

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
    if (cleanSlug.length < 2) return { success: false, error: 'Slug must be at least 2 characters' };

    const validCaps = ['data', 'async', 'leaderboard'];
    const filteredCaps = capabilities.filter(c => validCaps.includes(c));
    if (filteredCaps.length === 0) return { success: false, error: 'At least one capability is required' };

    const existing = await Game.findOne({ slug: cleanSlug });
    if (existing) return { success: false, error: 'A game with this slug already exists' };

    await Game.create({
      name: name.trim(),
      slug: cleanSlug,
      capabilities: filteredCaps,
      active: true,
      maintenance: false,
    });

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error creating game:', error);
    return { success: false, error: 'Failed to create game' };
  }
}

export async function updateGameCapabilities(slug: string, capabilities: string[]): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    const validCaps = ['data', 'async', 'leaderboard'];
    const filteredCaps = capabilities.filter(c => validCaps.includes(c));
    if (filteredCaps.length === 0) return { success: false, error: 'At least one capability is required' };

    const game = await Game.findOne({ slug });
    if (!game) return { success: false, error: 'Game not found' };

    await Game.updateOne({ slug }, { capabilities: filteredCaps });
    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/${slug}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating capabilities:', error);
    return { success: false, error: 'Failed to update capabilities' };
  }
}

export async function toggleGameMaintenance(slug: string): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();
    const game = await Game.findOne({ slug });
    if (!game) return { success: false, error: 'Game not found' };

    await Game.updateOne({ slug }, { maintenance: !game.maintenance });
    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/${slug}`);
    return { success: true };
  } catch (error) {
    console.error('Error toggling maintenance:', error);
    return { success: false, error: 'Failed to toggle maintenance' };
  }
}

export async function updateGameMotd(slug: string, motd: string): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();
    const game = await Game.findOne({ slug });
    if (!game) return { success: false, error: 'Game not found' };

    await Game.updateOne({ slug }, { motd: motd.trim() || null });
    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/${slug}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating MOTD:', error);
    return { success: false, error: 'Failed to update MOTD' };
  }
}

export async function toggleGameActive(slug: string): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();
    const game = await Game.findOne({ slug });
    if (!game) return { success: false, error: 'Game not found' };

    await Game.updateOne({ slug }, { active: !game.active });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error toggling game active:', error);
    return { success: false, error: 'Failed to toggle game active state' };
  }
}

export async function getGameStats(gameSlug: string): Promise<GameStats> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    throw new Error(auth.error);
  }

  try {
    await connectToDatabase();

    const [
      totalPlayers,
      activePlayers,
      bannedPlayers,
      totalBattles,
      activeBattles,
      pendingBattles,
      completedBattles,
      abandonedBattles
    ] = await Promise.all([
      GameIdentity.countDocuments({ gameSlug }),
      GameIdentity.countDocuments({ gameSlug, isActive: true }),
      GameIdentity.countDocuments({ gameSlug, isActive: false }),
      Battle.countDocuments({ gameSlug }),
      Battle.countDocuments({ gameSlug, status: 'active' }),
      Battle.countDocuments({ gameSlug, status: 'pending' }),
      Battle.countDocuments({ gameSlug, status: 'completed' }),
      Battle.countDocuments({ gameSlug, status: 'abandoned' })
    ]);

    return {
      totalPlayers,
      activePlayers,
      bannedPlayers,
      totalBattles,
      activeBattles,
      pendingBattles,
      completedBattles,
      abandonedBattles
    };
  } catch (error) {
    console.error('Error fetching game stats:', error);
    throw new Error('Failed to fetch game stats');
  }
}

export async function getGamePlayers(gameSlug: string): Promise<AdminPlayerDetails[]> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    throw new Error(auth.error);
  }

  try {
    await connectToDatabase();

    const players = await GameIdentity.find({ gameSlug }).sort({ lastSeen: -1 });

    const playerDetails: AdminPlayerDetails[] = await Promise.all(
      players.map(async (player) => {
        const deviceId = player.deviceId;

        const [totalBattles, wins, losses, draws, activeBattles, pendingBattles] = await Promise.all([
          Battle.countDocuments({
            gameSlug,
            $or: [{ player1DeviceId: deviceId }, { player2DeviceId: deviceId }]
          }),
          Battle.countDocuments({
            gameSlug,
            status: 'completed',
            winnerId: deviceId,
            $or: [{ player1DeviceId: deviceId }, { player2DeviceId: deviceId }]
          }),
          Battle.countDocuments({
            gameSlug,
            status: 'completed',
            winnerId: { $nin: [deviceId, null] },
            $or: [{ player1DeviceId: deviceId }, { player2DeviceId: deviceId }]
          }),
          Battle.countDocuments({
            gameSlug,
            status: 'completed',
            winnerId: null,
            $or: [{ player1DeviceId: deviceId }, { player2DeviceId: deviceId }]
          }),
          Battle.countDocuments({
            gameSlug,
            status: 'active',
            $or: [{ player1DeviceId: deviceId }, { player2DeviceId: deviceId }]
          }),
          Battle.countDocuments({
            gameSlug,
            status: 'pending',
            $or: [{ player1DeviceId: deviceId }, { player2DeviceId: deviceId }]
          })
        ]);

        return {
          deviceId: player.deviceId,
          displayName: player.displayName || 'Unnamed Player',
          avatar: player.avatar || 'BIRD1',
          registeredAt: player.createdAt.toISOString(),
          lastSeen: player.lastSeen.toISOString(),
          isActive: player.isActive,
          stats: {
            totalBattles,
            wins,
            losses,
            draws,
            activeBattles,
            pendingBattles
          }
        };
      })
    );

    return playerDetails;
  } catch (error) {
    console.error('Error fetching game players:', error);
    throw new Error('Failed to fetch game players');
  }
}

export async function getGameBattles(gameSlug: string, filter?: { status?: string }): Promise<AdminBattleDetails[]> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    throw new Error(auth.error);
  }

  try {
    await connectToDatabase();

    const query: Record<string, unknown> = { gameSlug };
    if (filter?.status && filter.status !== 'all') {
      query.status = filter.status;
    }

    const battles = await Battle.find(query).sort({ updatedAt: -1 });

    const allPlayerIds = battles.flatMap(b => [b.player1DeviceId, b.player2DeviceId].filter(Boolean));
    const uniquePlayerIds = [...new Set(allPlayerIds)];
    
    const playersData = await GameIdentity.find({ gameSlug, deviceId: { $in: uniquePlayerIds } });
    const playerMap = new Map(playersData.map(p => [p.deviceId, { displayName: p.displayName, avatar: p.avatar }]));

    return battles.map(battle => {
      const p1Info = playerMap.get(battle.player1DeviceId);
      const p2Info = battle.player2DeviceId ? playerMap.get(battle.player2DeviceId) : null;

      return {
        battleId: battle.battleId,
        displayName: battle.displayName,
        player1DeviceId: battle.player1DeviceId,
        player1DisplayName: p1Info?.displayName || 'Unknown Player',
        player1Avatar: p1Info?.avatar || 'BIRD1',
        player2DeviceId: battle.player2DeviceId,
        player2DisplayName: p2Info?.displayName || null,
        player2Avatar: p2Info?.avatar || null,
        status: battle.status,
        currentTurn: battle.currentTurn,
        currentPlayerIndex: battle.currentPlayerIndex,
        winnerId: battle.winnerId,
        endReason: battle.endReason,
        isPrivate: battle.isPrivate,
        mapName: (battle.mapData?.selection as string) || 'Unknown Map',
        createdAt: battle.createdAt.toISOString(),
        updatedAt: battle.updatedAt.toISOString(),
        lastTurnAt: battle.lastTurnAt?.toISOString() || null
      };
    });
  } catch (error) {
    console.error('Error fetching game battles:', error);
    throw new Error('Failed to fetch game battles');
  }
}

export async function banPlayer(gameSlug: string, deviceId: string): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    const player = await GameIdentity.findOne({ gameSlug, deviceId });
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    await GameIdentity.updateOne({ gameSlug, deviceId }, { isActive: false });
    revalidatePath(`/dashboard/${gameSlug}`);
    return { success: true };
  } catch (error) {
    console.error('Error banning player:', error);
    return { success: false, error: 'Failed to ban player' };
  }
}

export async function unbanPlayer(gameSlug: string, deviceId: string): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    const player = await GameIdentity.findOne({ gameSlug, deviceId });
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    await GameIdentity.updateOne({ gameSlug, deviceId }, { isActive: true });
    revalidatePath(`/dashboard/${gameSlug}`);
    return { success: true };
  } catch (error) {
    console.error('Error unbanning player:', error);
    return { success: false, error: 'Failed to unban player' };
  }
}

export async function forceNameChange(gameSlug: string, deviceId: string, newName: string): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    if (!newName || newName.trim().length === 0) {
      return { success: false, error: 'Name cannot be empty' };
    }

    if (newName.length > 100) {
      return { success: false, error: 'Name cannot exceed 100 characters' };
    }

    const player = await GameIdentity.findOne({ gameSlug, deviceId });
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    await GameIdentity.updateOne({ gameSlug, deviceId }, { displayName: newName.trim() });
    revalidatePath(`/dashboard/${gameSlug}`);
    return { success: true };
  } catch (error) {
    console.error('Error changing player name:', error);
    return { success: false, error: 'Failed to change player name' };
  }
}

export async function changeAvatar(gameSlug: string, deviceId: string, newAvatar: string): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    if (!VALID_AVATARS.includes(newAvatar as PlayerAvatar)) {
      return { success: false, error: 'Invalid avatar' };
    }

    const player = await GameIdentity.findOne({ gameSlug, deviceId });
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    await GameIdentity.updateOne({ gameSlug, deviceId }, { avatar: newAvatar });
    revalidatePath(`/dashboard/${gameSlug}`);
    return { success: true };
  } catch (error) {
    console.error('Error changing avatar:', error);
    return { success: false, error: 'Failed to change avatar' };
  }
}

export async function deletePlayer(gameSlug: string, deviceId: string): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    const player = await GameIdentity.findOne({ gameSlug, deviceId });
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    await GameIdentity.deleteOne({ gameSlug, deviceId });
    
    revalidatePath(`/dashboard/${gameSlug}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting player:', error);
    return { success: false, error: 'Failed to delete player' };
  }
}

export async function forfeitBattle(battleId: string, winnerId?: string): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    const battle = await Battle.findOne({ battleId });
    if (!battle) {
      return { success: false, error: 'Battle not found' };
    }

    if (battle.status === 'completed') {
      return { success: false, error: 'Battle is already completed' };
    }

    if (battle.status === 'pending') {
      await Battle.updateOne({ battleId }, { 
        status: 'abandoned',
        endReason: 'cancelled'
      });
    } else {
      const actualWinnerId = winnerId || (battle.currentPlayerIndex === 0 ? battle.player2DeviceId : battle.player1DeviceId);
      
      await Battle.updateOne({ battleId }, {
        status: 'completed',
        winnerId: actualWinnerId,
        endReason: 'forfeit'
      });
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error forfeiting battle:', error);
    return { success: false, error: 'Failed to forfeit battle' };
  }
}

export async function deleteBattle(battleId: string): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    const battle = await Battle.findOne({ battleId });
    if (!battle) {
      return { success: false, error: 'Battle not found' };
    }

    await Battle.deleteOne({ battleId });

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error deleting battle:', error);
    return { success: false, error: 'Failed to delete battle' };
  }
}

export async function recoverPlayerByDeviceId(gameSlug: string, deviceId: string): Promise<{ success: boolean; data?: AdminPlayerDetails; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    if (!deviceId || deviceId.trim().length === 0) {
      return { success: false, error: 'Device ID is required' };
    }

    const identity = await GameIdentity.findOne({ gameSlug, deviceId: deviceId.trim() });
    if (!identity) {
      return { success: false, error: 'No player found with that Device ID in this game' };
    }

    const did = identity.deviceId;
    const [totalBattles, wins, losses, draws, activeBattles, pendingBattles] = await Promise.all([
      Battle.countDocuments({ gameSlug, $or: [{ player1DeviceId: did }, { player2DeviceId: did }] }),
      Battle.countDocuments({ gameSlug, status: 'completed', winnerId: did, $or: [{ player1DeviceId: did }, { player2DeviceId: did }] }),
      Battle.countDocuments({ gameSlug, status: 'completed', winnerId: { $nin: [did, null] }, $or: [{ player1DeviceId: did }, { player2DeviceId: did }] }),
      Battle.countDocuments({ gameSlug, status: 'completed', winnerId: null, $or: [{ player1DeviceId: did }, { player2DeviceId: did }] }),
      Battle.countDocuments({ gameSlug, status: 'active', $or: [{ player1DeviceId: did }, { player2DeviceId: did }] }),
      Battle.countDocuments({ gameSlug, status: 'pending', $or: [{ player1DeviceId: did }, { player2DeviceId: did }] }),
    ]);

    return {
      success: true,
      data: {
        deviceId: identity.deviceId,
        displayName: identity.displayName || 'Unnamed Player',
        avatar: identity.avatar || 'BIRD1',
        registeredAt: identity.createdAt.toISOString(),
        lastSeen: identity.lastSeen.toISOString(),
        isActive: identity.isActive,
        stats: { totalBattles, wins, losses, draws, activeBattles, pendingBattles },
      }
    };
  } catch (error) {
    console.error('Error recovering player account:', error);
    return { success: false, error: 'Failed to recover player account' };
  }
}

export async function resetAllBattles(gameSlug: string): Promise<{ success: boolean; affected?: number; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    const game = await Game.findOne({ slug: gameSlug });
    if (!game) return { success: false, error: 'Game not found' };

    const result = await Battle.updateMany(
      { gameSlug, status: { $in: ['active', 'pending'] } },
      { status: 'abandoned', endReason: 'cancelled' }
    );

    revalidatePath(`/dashboard/${gameSlug}`);
    return { success: true, affected: result.modifiedCount };
  } catch (error) {
    console.error('Error resetting battles:', error);
    return { success: false, error: 'Failed to reset battles' };
  }
}

export async function purgeAllBattles(gameSlug: string): Promise<{ success: boolean; deleted?: number; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    const game = await Game.findOne({ slug: gameSlug });
    if (!game) return { success: false, error: 'Game not found' };

    const result = await Battle.deleteMany({ gameSlug });

    revalidatePath(`/dashboard/${gameSlug}`);
    return { success: true, deleted: result.deletedCount };
  } catch (error) {
    console.error('Error purging battles:', error);
    return { success: false, error: 'Failed to purge battles' };
  }
}

export interface AuditLogEntry {
  id: string;
  gameSlug: string;
  action: string;
  ip: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogResult {
  success: boolean;
  logs?: AuditLogEntry[];
  total?: number;
  page?: number;
  totalPages?: number;
  error?: string;
}

export async function fetchAuditLogs(options?: {
  gameSlug?: string;
  action?: string;
  page?: number;
  limit?: number;
}): Promise<AuditLogResult> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (options?.gameSlug) filter.gameSlug = options.gameSlug;
    if (options?.action) filter.action = options.action;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return {
      success: true,
      logs: logs.map((log) => ({
        id: String(log._id),
        gameSlug: log.gameSlug,
        action: log.action,
        ip: log.ip,
        metadata: (log.metadata as Record<string, unknown>) ?? {},
        createdAt: log.createdAt.toISOString(),
      })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return { success: false, error: 'Failed to fetch audit logs' };
  }
}

export async function updateGameHaikunator(
  gameSlug: string,
  adjectives: string[],
  nouns: string[]
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    const game = await Game.findOne({ slug: gameSlug });
    if (!game) return { success: false, error: 'Game not found' };

    const cleanAdj = adjectives.map(w => w.trim().toLowerCase()).filter(Boolean);
    const cleanNouns = nouns.map(w => w.trim().toLowerCase()).filter(Boolean);

    if (cleanAdj.length === 0 && cleanNouns.length === 0) {
      game.haikunator = null;
    } else {
      game.haikunator = { adjectives: cleanAdj, nouns: cleanNouns };
    }

    await game.save();
    revalidatePath(`/dashboard/${gameSlug}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating haikunator:', error);
    return { success: false, error: 'Failed to update word lists' };
  }
}

export async function updateGameVersioning(
  gameSlug: string,
  minVersion: string,
  currentVersion: string,
  updateUrl: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    const game = await Game.findOne({ slug: gameSlug });
    if (!game) return { success: false, error: 'Game not found' };

    const min = minVersion.trim();
    const current = currentVersion.trim();
    const url = updateUrl.trim();

    if (!min && !current && !url) {
      game.versioning = null;
    } else {
      game.versioning = {
        minVersion: min || '1.0.0',
        currentVersion: current || '1.0.0',
        updateUrl: url || null,
      };
    }

    await game.save();
    revalidatePath(`/dashboard/${gameSlug}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating versioning:', error);
    return { success: false, error: 'Failed to update versioning' };
  }
}

export async function unbanAllPlayers(gameSlug: string): Promise<{ success: boolean; affected?: number; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    const game = await Game.findOne({ slug: gameSlug });
    if (!game) return { success: false, error: 'Game not found' };

    const result = await GameIdentity.updateMany(
      { gameSlug, isActive: false },
      { isActive: true }
    );

    revalidatePath(`/dashboard/${gameSlug}`);
    return { success: true, affected: result.modifiedCount };
  } catch (error) {
    console.error('Error unbanning all players:', error);
    return { success: false, error: 'Failed to unban all players' };
  }
}

