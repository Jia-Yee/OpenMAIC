import { NextResponse } from 'next/server';
import { listClassroomFolder, deleteClassroomFiles } from '@/lib/server/blob-storage';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const classroomId = params.id;
    
    const body = await request.json();
    const newFilePaths: string[] = body.newFilePaths || [];
    
    // List existing files in the classroom folder
    const existingFiles = await listClassroomFolder(classroomId);
    
    // Find files that exist in storage but are not in the new upload
    const filesToDelete = existingFiles.filter(
      (existingPath) => !newFilePaths.includes(existingPath)
    );
    
    if (filesToDelete.length > 0) {
      console.log(`[Cleanup] Deleting ${filesToDelete.length} stale files for classroom ${classroomId}:`, filesToDelete);
      await deleteClassroomFiles(classroomId, filesToDelete);
    }
    
    return NextResponse.json({
      success: true,
      deletedCount: filesToDelete.length,
      deletedFiles: filesToDelete,
    });
  } catch (error) {
    console.error('[Cleanup] Error cleaning up classroom files:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup classroom files',
    }, { status: 500 });
  }
}
