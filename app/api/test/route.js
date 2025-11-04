import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'API is working',
    timestamp: new Date().toISOString(),
    env: {
      DEV_MODE: process.env.DEV_MODE,
      HAS_DATABASE: !!process.env.DATABASE_URL,
      HAS_MUSTEK: !!process.env.MUSTEK_API_TOKEN,
      HAS_AXIZ: !!process.env.AXIZ_CLIENT_ID,
      HAS_TARSUS: !!process.env.TARSUS_API_TOKEN,
    },
  });
}

