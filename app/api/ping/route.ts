import { NextResponse } from 'next/server';

const startTime = Date.now();

export async function GET() {
  return NextResponse.json({
    success: true,
    status: 'ok',
    serverTime: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.PLATFORM_VERSION || '1.0.0',
  });
}
