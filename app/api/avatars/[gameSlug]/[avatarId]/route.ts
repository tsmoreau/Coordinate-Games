import { NextRequest, NextResponse } from 'next/server';
import { getAvatarBuffer } from '@/lib/gcs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameSlug: string; avatarId: string }> }
) {
  const { gameSlug, avatarId } = await params;

  try {
    const buffer = await getAvatarBuffer(gameSlug, avatarId);

    if (!buffer) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
  }
}
