import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const DEV_MODE = process.env.DEV_MODE === 'true' || !process.env.DATABASE_URL;
  
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(), 
    devMode: DEV_MODE 
  });
}

