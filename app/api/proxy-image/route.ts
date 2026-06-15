import { type NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'http://open.maic.chat',
  'https://open.maic.chat',
  'http://www.viete.xyz',
  'https://www.viete.xyz',
];

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  // Validate the URL is from allowed origins
  const isValidOrigin = ALLOWED_ORIGINS.some(origin => 
    url.startsWith(origin)
  );

  if (!isValidOrigin) {
    return NextResponse.json({ error: 'URL origin not allowed' }, { status: 403 });
  }

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
