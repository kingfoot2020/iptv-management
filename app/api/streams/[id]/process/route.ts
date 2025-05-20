import { NextRequest, NextResponse } from 'next/server';
import { getStreamById, getStreamProcessInfo } from '@/lib/data';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    // First check if the stream exists
    const stream = await getStreamById(id);
    
    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }
    
    // Get process information
    const processInfo = await getStreamProcessInfo(id);
    
    return NextResponse.json({
      id: stream.id,
      name: stream.name,
      active: stream.active,
      ...processInfo
    });
  } catch (error) {
    console.error(`Error getting process info for stream ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 