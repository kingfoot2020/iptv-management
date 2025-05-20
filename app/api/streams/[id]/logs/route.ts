import { NextRequest, NextResponse } from 'next/server';
import { getStreamLogs, clearStreamLogs } from '@/lib/data';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const url = new URL(req.url);
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 100;
    
    const logs = await getStreamLogs(id, limit);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error(`Error getting logs for stream ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const success = await clearStreamLogs(id);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to clear logs' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: 'Logs cleared successfully' });
  } catch (error) {
    console.error(`Error clearing logs for stream ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 