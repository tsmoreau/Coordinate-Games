'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { GameIdentity } from '@/models/GameIdentity';

export interface DeviceWithDetails {
  deviceId: string;
  displayName: string;
  avatar: string | null;
  createdAt: string;
  lastSeen: string;
  isActive: boolean;
}

export async function getDevices(options?: { limit?: number }): Promise<DeviceWithDetails[]> {
  await connectToDatabase();
  
  const limit = options?.limit ?? 50;

  const identities = await GameIdentity.find({ isActive: true })
    .sort({ lastSeen: -1 })
    .limit(limit);

  return identities.map(identity => {
    const obj = identity.toObject();
    return {
      deviceId: obj.deviceId,
      displayName: obj.displayName || 'Unnamed Player',
      avatar: obj.avatar || null,
      createdAt: obj.createdAt.toISOString(),
      lastSeen: obj.lastSeen.toISOString(),
      isActive: obj.isActive,
    };
  });
}
