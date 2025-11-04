import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEV_MODE = process.env.DEV_MODE === 'true' || !process.env.DATABASE_URL;

export async function GET() {
  try {
    if (DEV_MODE) {
      const suppliers = [
        { id: 1, name: 'Mustek', slug: 'mustek', status: 'active' },
        { id: 2, name: 'Axiz', slug: 'axiz', status: 'active' },
        { id: 3, name: 'Tarsus', slug: 'tarsus', status: 'active' },
      ];
      return NextResponse.json({ suppliers });
    }

    // Production mode: Query database
    const path = require('path');
    const connectionPath = path.join(process.cwd(), 'database', 'connection');
    const { query } = require(connectionPath);
    const result = await query('SELECT * FROM suppliers WHERE status = $1 ORDER BY name', ['active']);
    return NextResponse.json({ suppliers: result.rows });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

