import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllStreams, 
  addStream, 
  getStreamStats, 
  getSystemStats,
  getCategoryStats
} from '@/lib/data';
import { StreamFormData } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const streams = await getAllStreams();
    const stats = await getStreamStats();
    const systemStats = await getSystemStats();
    const categories = await getCategoryStats();
    
    return NextResponse.json({ 
      streams, 
      stats, 
      systemStats,
      categories 
    });
  } catch (error) {
    console.error('Error in streams API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json() as StreamFormData;
    
    // Basic validation
    if (!data.name || !data.link1 || !data.key || !data.rtmp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Add default values if not provided
    const streamData = {
      ...data,
      bitrate: data.bitrate || '1000k',
      resolution: data.resolution || '1280x720',
      category1: data.category1 || 'Uncategorized'
    };
    
    const newStream = await addStream(streamData);
    return NextResponse.json(newStream);
  } catch (error) {
    console.error('Error creating stream:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 