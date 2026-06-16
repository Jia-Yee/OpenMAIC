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

    if (!classroomId || !filePath) {
      return NextResponse.json({
        success: false,
        error: 'Classroom ID and file path are required',
      }, { status: 400 });
    }

    console.log(`[FileDownload] Downloading file: ${classroomId}/${filePath}`);

    const result = await getClassroomFile(classroomId, filePath);

    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'File not found',
      }, { status: 404 });
    }

    const { blob, mimeType } = result;
    const buffer = await blob.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch (error) {
    console.error('[FileDownload] Error downloading file:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to download file',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
