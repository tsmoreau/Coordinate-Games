import { NextRequest, NextResponse } from 'next/server';
import { validateGame, gameNotFoundResponse } from '@/lib/gameMiddleware';
import { AuditLog } from '@/models/AuditLog';
import semver from 'semver';

type PingStatus = 'ok' | 'update_available' | 'update_required' | 'maintenance';

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
