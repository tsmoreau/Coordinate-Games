import { NextRequest, NextResponse } from 'next/server';
import { validateGame, gameNotFoundResponse } from '@/lib/gameMiddleware';
import { GameIdentity } from '@/models/GameIdentity';
import { Ping } from '@/models/Ping';
import { AuditLog } from '@/models/AuditLog';
import { hashToken } from '@/lib/auth';
import { z } from 'zod';
import semver from 'semver';

type PingStatus = 'ok' | 'update_available' | 'update_required' | 'maintenance';

const pingSchema = z.object({
  message: z.string().max(500).optional(),
});

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return 'unknown';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    const { gameSlug } = await params;
    const { searchParams } = new URL(request.url);
    const clientVersion = searchParams.get('clientVersion');
    const ip = getClientIp(request);

    const gameContext = await validateGame(gameSlug);
    if (!gameContext) {
      return gameNotFoundResponse();
    }

    const { game } = gameContext;
    const serverTime = new Date().toISOString();

    const baseResponse = {
      success: true,
      serverTime,
      minVersion: game.versioning?.minVersion ?? null,
      currentVersion: game.versioning?.currentVersion ?? null,
      updateUrl: game.versioning?.updateUrl ?? null,
      maintenance: game.maintenance,
      motd: game.motd ?? null,
    };

    let pingStatus: PingStatus = 'ok';

    if (game.maintenance) {
      pingStatus = 'maintenance';
    } else if (clientVersion && game.versioning) {
      const cleanClientVersion = semver.valid(semver.coerce(clientVersion));
      if (cleanClientVersion) {
        const { minVersion, currentVersion } = game.versioning;
        if (semver.lt(cleanClientVersion, minVersion)) {
          pingStatus = 'update_required';
        } else if (semver.lt(cleanClientVersion, currentVersion)) {
          pingStatus = 'update_available';
        }
      }
    }

    AuditLog.create({
      gameSlug,
      action: 'ping',
      ip,
      metadata: {
        clientVersion: clientVersion ?? null,
        status: pingStatus,
      },
    }).catch((err: unknown) => console.error('Audit log error:', err));

    const statusMessages: Record<PingStatus, string | null> = {
      maintenance: 'Server is down for maintenance',
      update_required: `Update required. Minimum version: ${game.versioning?.minVersion}`,
      update_available: `Update available. Latest version: ${game.versioning?.currentVersion}`,
      ok: null,
    };

    return NextResponse.json({
      ...baseResponse,
      status: pingStatus,
      message: statusMessages[pingStatus],
    });

  } catch (error) {
    console.error('Ping error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ping failed',
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    const { gameSlug } = await params;
    const ip = getClientIp(request);

    const gameContext = await validateGame(gameSlug);
    if (!gameContext) {
      return gameNotFoundResponse();
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - missing or invalid token',
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - empty token',
      }, { status: 401 });
    }

    const tokenHash = hashToken(token);
    const identity = await GameIdentity.findOne({
      gameSlug: gameSlug.toLowerCase(),
      tokenHash,
      isActive: true,
    });

    if (!identity) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - invalid token for this game',
      }, { status: 401 });
    }

    identity.lastSeen = new Date();
    await identity.save();

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
      gameSlug: gameSlug.toLowerCase(),
      deviceId: identity.deviceId,
      displayName: identity.displayName,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') || undefined,
      message,
      createdAt: new Date(),
    });

    await ping.save();

    AuditLog.create({
      gameSlug,
      action: 'player_ping',
      ip,
      metadata: {
        deviceId: identity.deviceId,
        displayName: identity.displayName,
        message: message ?? null,
      },
    }).catch((err: unknown) => console.error('Audit log error:', err));

    return NextResponse.json({
      success: true,
      message: 'Ping recorded',
      pingId: ping._id.toString(),
      displayName: identity.displayName,
      timestamp: ping.createdAt.toISOString(),
    });

  } catch (error) {
    console.error('Game ping POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to record ping',
    }, { status: 500 });
  }
}
