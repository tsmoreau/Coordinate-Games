import mongoose from 'mongoose';
import { Game } from '../models/Game';

const MONGODB_URI = process.env.MONGODB_URI!;

const games = [
  { slug: 'birdwars', name: 'Bird Wars', capabilities: ['data', 'async'], active: true },
  { slug: 'powerpentagon', name: 'Power Pentagon', capabilities: ['data', 'leaderboard'], active: true }
];

async function seedGames() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const game of games) {
      const existing = await Game.findOne({ slug: game.slug });
      if (existing) {
        console.log(`Game "${game.slug}" already exists, updating...`);
        await Game.updateOne({ slug: game.slug }, { $set: game });
      } else {
        console.log(`Creating game "${game.slug}"...`);
        await Game.create(game);
      }
    }

    console.log('Games seeded successfully!');
    const allGames = await Game.find({});
    console.log('Current games:', allGames);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedGames();
