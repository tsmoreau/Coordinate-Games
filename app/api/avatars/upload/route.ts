import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { connectToDatabase } from '@/lib/mongodb';
import { Game } from '@/models/Game';
import { uploadAvatar } from '@/lib/gcs';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

const MAX_FILE_SIZE = 500 * 1024;
const AVATAR_ID_REGEX = /^[A-Za-z0-9_-]{1,20}$/;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email?.toLowerCase();
    if (!userEmail || (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(userEmail))) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const gameSlug = formData.get('gameSlug') as string;
    const avatarId = formData.get('avatarId') as string;
    const file = formData.get('file') as File | null;

    if (!gameSlug || !avatarId || !file) {
      return NextResponse.json({ success: false, error: 'Missing required fields: gameSlug, avatarId, file' }, { status: 400 });
    }

    if (!AVATAR_ID_REGEX.test(avatarId)) {
      return NextResponse.json({ success: false, error: 'Avatar ID must be 1-20 alphanumeric characters (plus - and _)' }, { status: 400 });
    }

    if (file.type !== 'image/png') {
      return NextResponse.json({ success: false, error: 'File must be a PNG image' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'File size must be under 500KB' }, { status: 400 });
    }

    await connectToDatabase();

    const game = await Game.findOne({ slug: gameSlug });
    if (!game) {
      return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadAvatar(gameSlug, avatarId, buffer, file.type);

    await Game.updateOne({ slug: gameSlug }, { $addToSet: { avatars: avatarId } });

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}
