import { NextResponse } from 'next/server';
import { uploadClassroomFolder } from '@/lib/server/blob-storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const classroomId = params.id;
    
    const formData = await request.formData();
    
    const fileName = formData.get('fileName') as string;
    const content = formData.get('content') as File;
    
    if (!fileName || !content) {
      return NextResponse.json({
        success: false,
        error: 'fileName and content are required',
      }, { status: 400 });
    }
    
    const arrayBuffer = await content.arrayBuffer();
    
    await uploadClassroomFolder(classroomId, [{
      path: fileName,
      content: arrayBuffer,
      mimeType: content.type,
    }]);
    
    return NextResponse.json({
      success: true,
      message: `File ${fileName} uploaded successfully`,
    });
  } catch (error) {
    console.error('[ChunkUpload] Error uploading chunk:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to upload chunk',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}