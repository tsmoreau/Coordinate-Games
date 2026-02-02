'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { Player } from '@/models/Player';

export interface DeviceWithDetails {
  deviceId: string;
  displayName: string;
  avatar: string;
  createdAt: string;
  lastSeen: string;
  isActive: boolean;
}

export async function getDevices(options?: { limit?: number }): Promise<DeviceWithDetails[]> {
  await connectToDatabase();
  
  const limit = options?.limit ?? 50;

  const players = await Player.find({ isActive: true })
    .sort({ lastSeen: -1 })
    .limit(limit);

  return players.map(player => {
    const playerObj = player.toObject();
    return {
      deviceId: playerObj.deviceId,
      displayName: playerObj.displayName || 'Unnamed Player',
      avatar: playerObj.avatar || 'BIRD1',
      createdAt: playerObj.createdAt.toISOString(),
      lastSeen: playerObj.lastSeen.toISOString(),
      isActive: playerObj.isActive,
    };
  });
}
