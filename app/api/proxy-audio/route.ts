import { type NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'http://open.maic.chat',
  'https://open.maic.chat',
  'http://www.viete.xyz',
  'https://www.viete.xyz',
];

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  console.log('[ProxyAudio] Request received:', url ? url.substring(0, 80) : 'no URL');
  
  if (!url) {
    console.log('[ProxyAudio] Error: URL parameter is required');
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  const isValidOrigin = ALLOWED_ORIGINS.some(origin => 
    url.startsWith(origin)
  );

  if (!isValidOrigin) {
    console.log('[ProxyAudio] Error: URL origin not allowed:', url.substring(0, 50));
    return NextResponse.json({ error: 'URL origin not allowed' }, { status: 403 });
  }

  try {
    console.log('[ProxyAudio] Fetching audio from:', url.substring(0, 80));
    const response = await fetch(url);
    
    console.log('[ProxyAudio] Fetch response status:', response.status);
    
    if (!response.ok) {
      console.log('[ProxyAudio] Error: Failed to fetch audio, status:', response.status);
      return NextResponse.json({ error: 'Failed to fetch audio' }, { status: response.status });
    }

    const contentType = response.headers.get('Content-Type') || 'audio/mpeg';
    console.log('[ProxyAudio] Content-Type:', contentType);
    
    const buffer = await response.arrayBuffer();
    console.log('[ProxyAudio] Audio buffer size:', buffer.byteLength, 'bytes');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000',
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('[ProxyAudio] Error proxying audio:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
