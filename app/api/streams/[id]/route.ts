import { NextRequest, NextResponse } from 'next/server';
import { 
  getStreamById, 
  updateStream, 
  deleteStream, 
  startStream, 
  stopStream, 
  restartStream 
} from '@/lib/data';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const stream = await getStreamById(id);
    
    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }
    
    return NextResponse.json(stream);
  } catch (error) {
    console.error(`Error getting stream ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const data = await req.json();
    
    const updated = await updateStream(id, data);
    
    if (!updated) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error(`Error updating stream ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const success = await deleteStream(id);
    
    if (!success) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error deleting stream ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 