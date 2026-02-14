import { GameIdentity } from '@/models/GameIdentity';

export interface PlayerInfo {
  displayName: string;
  avatar: string | null;
}

export async function getPlayerInfo(
  gameSlug: string,
  deviceIds: (string | null)[]
): Promise<Map<string, PlayerInfo>> {
  const validIds = deviceIds.filter((id): id is string => id !== null);
  if (validIds.length === 0) return new Map();

  const identities = await GameIdentity.find({
    gameSlug,
    deviceId: { $in: validIds },
  });

  const map = new Map<string, PlayerInfo>();

  for (const identity of identities) {
    map.set(identity.deviceId, {
      displayName: identity.displayName || 'Unknown Player',
      avatar: identity.avatar || null,
    });
  }

  return map;
}
