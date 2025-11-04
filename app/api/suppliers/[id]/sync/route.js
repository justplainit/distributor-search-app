import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    const { id } = params;
    
    // Trigger sync for supplier
    // This would typically queue a background job
    // For now, just return success
    
    return NextResponse.json({ 
      message: 'Sync started',
      supplierId: id 
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

