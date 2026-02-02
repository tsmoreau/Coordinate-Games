import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Game } from '@/models/Game';

export async function GET() {
  try {
    await connectToDatabase();
    
    const games = await Game.find({ active: true })
      .select('slug name capabilities active createdAt')
      .sort({ createdAt: 1 });

    return NextResponse.json({
      success: true,
      games,
    });
  } catch (error) {
    console.error('Fetch games error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch games',
    }, { status: 500 });
  }
}
