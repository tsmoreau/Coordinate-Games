import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Game } from '@/models/Game';

const games = [
  { 
    slug: 'birdwars', 
    name: 'Bird Wars', 
    capabilities: ['data', 'async'], 
    active: true,
    haikunator: {
      adjectives: [
        'Molting', 'Brooding', 'Plucked', 'Flightless', 'Migratory',
        'Territorial', 'Peckish', 'Roosting', 'Nesting', 'Soaring',
        'Pecking', 'Preening', 'Chirping', 'Squawking', 'Flapping'
      ],
      nouns: [
        'Sparrow', 'Finch', 'Robin', 'Crow', 'Raven',
        'Eagle', 'Hawk', 'Owl', 'Parrot', 'Penguin',
        'Pelican', 'Flamingo', 'Heron', 'Crane', 'Dove'
      ]
    },
    versioning: { minVersion: '1.0.0', currentVersion: '1.0.0', updateUrl: null },
    maintenance: false,
    motd: null
  },
  { 
    slug: 'powerpentagon', 
    name: 'Power Pentagon', 
    capabilities: ['data', 'leaderboard'], 
    active: true,
    haikunator: {
      adjectives: [
        'Acute', 'Obtuse', 'Parallel', 'Perpendicular', 'Isometric',
        'Concentric', 'Tangent', 'Radial', 'Prismatic', 'Tessellated',
        'Fractal', 'Symmetric', 'Asymmetric', 'Convex', 'Concave'
      ],
      nouns: [
        'Triangle', 'Square', 'Pentagon', 'Hexagon', 'Octagon',
        'Prism', 'Vertex', 'Edge', 'Polygon', 'Dodecahedron',
        'Tetrahedron', 'Cube', 'Sphere', 'Pyramid', 'Cylinder'
      ]
    },
    versioning: { minVersion: '1.0.0', currentVersion: '1.0.0', updateUrl: null },
    maintenance: false,
    motd: null
  }
];

export async function POST() {
  try {
    await connectToDatabase();

    const results = [];
    
    for (const game of games) {
      const existing = await Game.findOne({ slug: game.slug });
      if (existing) {
        await Game.updateOne({ slug: game.slug }, { $set: game });
        results.push({ slug: game.slug, action: 'updated' });
      } else {
        await Game.create(game);
        results.push({ slug: game.slug, action: 'created' });
      }
    }

    const allGames = await Game.find({});

    return NextResponse.json({
      success: true,
      message: 'Games seeded successfully',
      results,
      games: allGames,
    });
  } catch (error) {
    console.error('Seed games error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to seed games',
    }, { status: 500 });
  }
}
