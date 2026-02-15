/**
 * One-time migration: Backfill GameIdentity.stats from existing Battle documents.
 * 
 * Run once after deploying the stats schema change:
 *   MONGODB_URI="your-connection-string" npx tsx scripts/backfill-player-stats.ts
 * 
 * Safe to run multiple times — it rebuilds from scratch each time.
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Set MONGODB_URI environment variable');
  process.exit(1);
}

async function backfill() {
  await mongoose.connect(MONGODB_URI as string);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  if (!db) {
    console.error('No database connection');
    process.exit(1);
  }

  const battles = db.collection('battles');
  const identities = db.collection('gameidentities');

  // Reset all stats to zero first
  const resetResult = await identities.updateMany({}, {
    $set: {
      'stats.wins': 0,
      'stats.losses': 0,
      'stats.draws': 0,
      'stats.totalTurns': 0,
      'stats.totalBattles': 0,
    }
  });
  console.log(`Reset stats on ${resetResult.modifiedCount} players`);

  // Aggregate battle participation counts
  const participationPipeline = [
    {
      $facet: {
        asP1: [
          { $group: { _id: { gameSlug: '$gameSlug', deviceId: '$player1DeviceId' }, count: { $sum: 1 } } }
        ],
        asP2: [
          { $match: { player2DeviceId: { $ne: null } } },
          { $group: { _id: { gameSlug: '$gameSlug', deviceId: '$player2DeviceId' }, count: { $sum: 1 } } }
        ],
      }
    }
  ];

  const [facetResult] = await battles.aggregate(participationPipeline).toArray();
  const battleCounts = new Map<string, number>();

  for (const entry of [...facetResult.asP1, ...facetResult.asP2]) {
    const key = `${entry._id.gameSlug}:${entry._id.deviceId}`;
    battleCounts.set(key, (battleCounts.get(key) || 0) + entry.count);
  }

  // Apply totalBattles
  let totalBattlesUpdated = 0;
  for (const [key, count] of battleCounts) {
    const [gameSlug, deviceId] = key.split(':');
    await identities.updateOne(
      { gameSlug, deviceId },
      { $set: { 'stats.totalBattles': count } }
    );
    totalBattlesUpdated++;
  }
  console.log(`Set totalBattles on ${totalBattlesUpdated} players`);

  // Aggregate wins/losses/draws from completed battles
  const completedBattles = await battles.find({
    status: 'completed',
  }).toArray();

  const winsMap = new Map<string, number>();
  const lossesMap = new Map<string, number>();
  const drawsMap = new Map<string, number>();

  for (const b of completedBattles) {
    const slug = b.gameSlug;
    const p1 = b.player1DeviceId;
    const p2 = b.player2DeviceId;

    if (!b.winnerId) {
      // Draw
      if (p1) drawsMap.set(`${slug}:${p1}`, (drawsMap.get(`${slug}:${p1}`) || 0) + 1);
      if (p2) drawsMap.set(`${slug}:${p2}`, (drawsMap.get(`${slug}:${p2}`) || 0) + 1);
    } else {
      const winner = b.winnerId;
      const loser = winner === p1 ? p2 : p1;
      winsMap.set(`${slug}:${winner}`, (winsMap.get(`${slug}:${winner}`) || 0) + 1);
      if (loser) lossesMap.set(`${slug}:${loser}`, (lossesMap.get(`${slug}:${loser}`) || 0) + 1);
    }
  }

  let wlUpdated = 0;
  const allKeys = new Set([...winsMap.keys(), ...lossesMap.keys(), ...drawsMap.keys()]);
  for (const key of allKeys) {
    const [gameSlug, deviceId] = key.split(':');
    await identities.updateOne(
      { gameSlug, deviceId },
      {
        $set: {
          'stats.wins': winsMap.get(key) || 0,
          'stats.losses': lossesMap.get(key) || 0,
          'stats.draws': drawsMap.get(key) || 0,
        }
      }
    );
    wlUpdated++;
  }
  console.log(`Set wins/losses/draws on ${wlUpdated} players`);

  // Aggregate turn counts per player
  const turnsPipeline = [
    { $unwind: '$turns' },
    {
      $group: {
        _id: { gameSlug: '$gameSlug', deviceId: '$turns.deviceId' },
        count: { $sum: 1 },
      }
    }
  ];

  const turnResults = await battles.aggregate(turnsPipeline).toArray();
  let turnsUpdated = 0;
  for (const entry of turnResults) {
    if (!entry._id.deviceId) continue;
    await identities.updateOne(
      { gameSlug: entry._id.gameSlug, deviceId: entry._id.deviceId },
      { $set: { 'stats.totalTurns': entry.count } }
    );
    turnsUpdated++;
  }
  console.log(`Set totalTurns on ${turnsUpdated} players`);

  console.log('Done.');
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
