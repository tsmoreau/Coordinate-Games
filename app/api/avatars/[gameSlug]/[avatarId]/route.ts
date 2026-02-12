import { NextRequest, NextResponse } from 'next/server';
import { getAvatarUrl } from '@/lib/gcs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameSlug: string; avatarId: string }> }
) {
  const { gameSlug, avatarId } = await params;

  try {
    const url = getAvatarUrl(gameSlug, avatarId);
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
  }
}
