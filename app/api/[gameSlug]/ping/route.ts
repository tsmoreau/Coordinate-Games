import { NextRequest, NextResponse } from 'next/server';
import { validateGame, gameNotFoundResponse } from '@/lib/gameMiddleware';
import semver from 'semver';

type PingStatus = 'ok' | 'update_available' | 'update_required' | 'maintenance';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    const { gameSlug } = await params;
    const { searchParams } = new URL(request.url);
    const clientVersion = searchParams.get('clientVersion');

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

    if (game.maintenance) {
      return NextResponse.json({
        ...baseResponse,
        status: 'maintenance' as PingStatus,
        message: 'Server is down for maintenance',
      });
    }

    if (!clientVersion || !game.versioning) {
      return NextResponse.json({
        ...baseResponse,
        status: 'ok' as PingStatus,
        message: null,
      });
    }

    const cleanClientVersion = semver.valid(semver.coerce(clientVersion));
    if (!cleanClientVersion) {
      return NextResponse.json({
        ...baseResponse,
        status: 'ok' as PingStatus,
        message: null,
      });
    }

    const { minVersion, currentVersion } = game.versioning;

    if (semver.lt(cleanClientVersion, minVersion)) {
      return NextResponse.json({
        ...baseResponse,
        status: 'update_required' as PingStatus,
        message: `Update required. Minimum version: ${minVersion}`,
      });
    }

    if (semver.lt(cleanClientVersion, currentVersion)) {
      return NextResponse.json({
        ...baseResponse,
        status: 'update_available' as PingStatus,
        message: `Update available. Latest version: ${currentVersion}`,
      });
    }

    return NextResponse.json({
      ...baseResponse,
      status: 'ok' as PingStatus,
      message: null,
    });

  } catch (error) {
    console.error('Ping error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ping failed',
    }, { status: 500 });
  }
}
