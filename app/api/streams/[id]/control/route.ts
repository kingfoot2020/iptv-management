import { NextRequest, NextResponse } from 'next/server';
import { startStream, stopStream, restartStream } from '@/lib/data';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const { action } = await req.json();
    
    if (!action) {
      return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
    }
    
    let success = false;
    let message = '';
    
    switch (action) {
      case 'start':
        success = await startStream(id);
        message = success ? 'Stream started successfully' : 'Failed to start stream';
        break;
        
      case 'stop':
        success = await stopStream(id);
        message = success ? 'Stream stopped successfully' : 'Failed to stop stream';
        break;
        
      case 'restart':
        success = await restartStream(id);
        message = success ? 'Stream restarted successfully' : 'Failed to restart stream';
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    return NextResponse.json({ success, message });
  } catch (error) {
    console.error(`Error controlling stream ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 