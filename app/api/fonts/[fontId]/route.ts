import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getFontBuffer, deleteFont } from '@/lib/gcs-fonts';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fontId: string }> }
) {
  const { fontId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const buffer = await getFontBuffer(fontId);
    if (!buffer) {
      return NextResponse.json({ success: false, error: 'Font not found' }, { status: 404 });
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `inline; filename="${fontId}.fnt"`,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Font not found' }, { status: 404 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fontId: string }> }
) {
  const { fontId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email?.toLowerCase();
    if (!userEmail || (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(userEmail))) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    await deleteFont(fontId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Font delete error:', error);
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 });
  }
}
