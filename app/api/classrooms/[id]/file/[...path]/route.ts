import { NextResponse } from 'next/server';
import { getClassroomFile } from '@/lib/server/blob-storage';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const params = await context.params;
    const classroomId = params.id;
    const filePath = params.path.join('/');

    console.log('[ClassroomFileAPI] Fetching file:', classroomId, filePath);

    const result = await getClassroomFile(classroomId, filePath);

    if (!result) {
      console.log('[ClassroomFileAPI] File not found:', classroomId, filePath);
      return NextResponse.json({
        success: false,
        error: 'File not found',
      }, { status: 404 });
    }

    const { blob, mimeType } = result;
    
    console.log('[ClassroomFileAPI] Found file:', filePath, 'size:', blob.size, 'mimeType:', mimeType);

    const arrayBuffer = await blob.arrayBuffer();
    
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('[ClassroomFileAPI] Failed to fetch file:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch file',
    }, { status: 500 });
  }
}
