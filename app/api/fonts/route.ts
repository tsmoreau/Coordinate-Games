import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { uploadFont, listFonts } from '@/lib/gcs-fonts';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const FONT_ID_REGEX = /^[A-Za-z0-9_-]{1,80}$/;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const fonts = await listFonts();
    return NextResponse.json({ success: true, fonts });
  } catch (error) {
    console.error('Font list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to list fonts' }, { status: 500 });
  }
}

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
    const file = formData.get('file') as File | null;
    const fontId = formData.get('fontId') as string;

    if (!file || !fontId) {
      return NextResponse.json({ success: false, error: 'Missing required fields: file, fontId' }, { status: 400 });
    }

    if (!FONT_ID_REGEX.test(fontId)) {
      return NextResponse.json({ success: false, error: 'Font ID must be 1-80 alphanumeric characters (plus - and _)' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'File size must be under 2MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Basic .fnt validation: check for tracking= line
    const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 512));
    if (!text.includes('tracking=')) {
      return NextResponse.json({ success: false, error: 'File does not appear to be a valid .fnt file (missing tracking= header)' }, { status: 400 });
    }

    const meta = await uploadFont(fontId, buffer, file.name);
    return NextResponse.json({ success: true, font: meta });
  } catch (error) {
    console.error('Font upload error:', error);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}
