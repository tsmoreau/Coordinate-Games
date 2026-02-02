import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Player } from '@/models/Player';
import { Ping } from '@/models/Ping';
import { hashToken } from '@/lib/auth';
import { z } from 'zod';

const MIN_CLIENT_VERSION = process.env.MIN_CLIENT_VERSION || '0.0.1';

const pingSchema = z.object({
  message: z.string().max(500).optional(),
});

function getClientIp(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (/^[\d.:a-fA-F]+$/.test(firstIp)) {
      return firstIp;
    }
  }
  return undefined;
}

async function authenticateAndGetPlayer(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  if (!token) {
    return null;
  }

  await connectToDatabase();
  
  try {
    const tokenHash = hashToken(token);
    const player = await Player.findOne({ 
      tokenHash: tokenHash,
      isActive: true 
    });
    
    if (player) {
      player.lastSeen = new Date();
      await player.save();
    }
    
    return player;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const player = await authenticateAndGetPlayer(request);
    
    if (!player) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - invalid or missing token',
      }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    
    const parsed = pingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: parsed.error.issues,
      }, { status: 400 });
    }

    const { message } = parsed.data;

    const ping = new Ping({
      deviceId: player.deviceId,
      displayName: player.displayName,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      message: message,
      createdAt: new Date(),
    });

    await ping.save();

    return NextResponse.json({
      success: true,
      message: 'Ping received',
      pingId: ping._id.toString(),
      displayName: player.displayName,
      timestamp: ping.createdAt.toISOString(),
      minClientVersion: MIN_CLIENT_VERSION,
    }, { status: 200 });

  } catch (error) {
    console.error('Ping error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to record ping',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const player = await authenticateAndGetPlayer(request);
    
    if (!player) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - invalid or missing token',
      }, { status: 401 });
    }

    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const deviceFilter = searchParams.get('deviceId');

    const query = deviceFilter ? { deviceId: deviceFilter } : {};
    
    const pings = await Ping.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('deviceId displayName ipAddress message createdAt');

    return NextResponse.json({
      success: true,
      pings: pings.map(p => ({
        id: p._id.toString(),
        deviceId: p.deviceId,
        displayName: p.displayName,
        ipAddress: p.ipAddress,
        message: p.message,
        createdAt: p.createdAt.toISOString(),
      })),
    }, { status: 200 });

  } catch (error) {
    console.error('Get pings error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch pings',
    }, { status: 500 });
  }
}
