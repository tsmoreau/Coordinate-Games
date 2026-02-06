'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { connectToDatabase } from '@/lib/mongodb';
import { Player, VALID_AVATARS, PlayerAvatar } from '@/models/Player';
import { Battle } from '@/models/Battle';
import { GameIdentity } from '@/models/GameIdentity';
import { Game, GameCapability, IHaikunatorConfig, IVersioning } from '@/models/Game';
import { revalidatePath } from 'next/cache';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

export interface AdminPlayerDetails {
  deviceId: string;
  displayName: string;
  avatar: string;
  isSimulator: boolean;
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

export async function getAllPlayers(): Promise<AdminPlayerDetails[]> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    throw new Error(auth.error);
  }

  try {
    await connectToDatabase();

    const players = await Player.find({}).sort({ lastSeen: -1 });

    const playerDetails: AdminPlayerDetails[] = await Promise.all(
      players.map(async (player) => {
        const deviceId = player.deviceId;

        const [totalBattles, wins, losses, draws, activeBattles, pendingBattles] = await Promise.all([
          Battle.countDocuments({
            $or: [{ player1DeviceId: deviceId }, { player2DeviceId: deviceId }]
          }),
          Battle.countDocuments({
            status: 'completed',
            winnerId: deviceId,
            $or: [{ player1DeviceId: deviceId }, { player2DeviceId: deviceId }]
          }),
          Battle.countDocuments({
            status: 'completed',
            winnerId: { $nin: [deviceId, null] },
            $or: [{ player1DeviceId: deviceId }, { player2DeviceId: deviceId }]
          }),
          Battle.countDocuments({
            status: 'completed',
            winnerId: null,
            $or: [{ player1DeviceId: deviceId }, { player2DeviceId: deviceId }]
          }),
          Battle.countDocuments({
            status: 'active',
            $or: [{ player1DeviceId: deviceId }, { player2DeviceId: deviceId }]
          }),
          Battle.countDocuments({
            status: 'pending',
            $or: [{ player1DeviceId: deviceId }, { player2DeviceId: deviceId }]
          })
        ]);

        return {
          deviceId: player.deviceId,
          displayName: player.displayName || 'Unnamed Player',
          avatar: player.avatar || 'BIRD1',
          isSimulator: player.isSimulator || false,
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
    console.error('Error fetching players:', error);
    throw new Error('Failed to fetch players');
  }
}

export async function getAllBattles(filter?: { status?: string }): Promise<AdminBattleDetails[]> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    throw new Error(auth.error);
  }

  try {
    await connectToDatabase();

    const query: Record<string, unknown> = {};
    if (filter?.status && filter.status !== 'all') {
      query.status = filter.status;
    }

    const battles = await Battle.find(query).sort({ updatedAt: -1 });

    const allPlayerIds = battles.flatMap(b => [b.player1DeviceId, b.player2DeviceId].filter(Boolean));
    const uniquePlayerIds = [...new Set(allPlayerIds)];
    
    const playersData = await Player.find({ deviceId: { $in: uniquePlayerIds } });
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
    console.error('Error fetching battles:', error);
    throw new Error('Failed to fetch battles');
  }
}

export async function banPlayer(deviceId: string): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    const player = await Player.findOne({ deviceId });
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    await Player.updateOne({ deviceId }, { isActive: false });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error banning player:', error);
    return { success: false, error: 'Failed to ban player' };
  }
}

export async function unbanPlayer(deviceId: string): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    const player = await Player.findOne({ deviceId });
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    await Player.updateOne({ deviceId }, { isActive: true });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error unbanning player:', error);
    return { success: false, error: 'Failed to unban player' };
  }
}

export async function forceNameChange(deviceId: string, newName: string): Promise<{ success: boolean; error?: string }> {
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

    const player = await Player.findOne({ deviceId });
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    await Player.updateOne({ deviceId }, { displayName: newName.trim() });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error changing player name:', error);
    return { success: false, error: 'Failed to change player name' };
  }
}

export async function changeAvatar(deviceId: string, newAvatar: string): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    if (!VALID_AVATARS.includes(newAvatar as PlayerAvatar)) {
      return { success: false, error: 'Invalid avatar' };
    }

    const player = await Player.findOne({ deviceId });
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    await Player.updateOne({ deviceId }, { avatar: newAvatar });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error changing avatar:', error);
    return { success: false, error: 'Failed to change avatar' };
  }
}

export async function deletePlayer(deviceId: string): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdminAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();

    const player = await Player.findOne({ deviceId });
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    await Player.deleteOne({ deviceId });
    
    revalidatePath('/dashboard');
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

export async function getAdminStats(): Promise<{
  totalPlayers: number;
  activePlayers: number;
  bannedPlayers: number;
  totalBattles: number;
  activeBattles: number;
  pendingBattles: number;
  completedBattles: number;
  abandonedBattles: number;
}> {
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
      Player.countDocuments({}),
      Player.countDocuments({ isActive: true }),
      Player.countDocuments({ isActive: false }),
      Battle.countDocuments({}),
      Battle.countDocuments({ status: 'active' }),
      Battle.countDocuments({ status: 'pending' }),
      Battle.countDocuments({ status: 'completed' }),
      Battle.countDocuments({ status: 'abandoned' })
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
    console.error('Error fetching admin stats:', error);
    throw new Error('Failed to fetch admin stats');
  }
}
