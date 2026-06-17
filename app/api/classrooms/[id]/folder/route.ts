import { NextResponse } from 'next/server';
import { uploadClassroomFolder } from '@/lib/server/blob-storage';
import { processClassroomMedia } from '@/lib/server/classroom-media-processor';
import { saveClassroomToServer, updateClassroomOnServer, classroomExistsOnServer } from '@/lib/server/classroom-server-db';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const classroomId = params.id;
    
    const body = await request.json();
    const { files, name, description, sceneCount } = body;

    if (!classroomId) {
      return NextResponse.json({
        success: false,
        error: 'Classroom ID is required',
      }, { status: 400 });
    }

    if (!files || !Array.isArray(files)) {
      return NextResponse.json({
        success: false,
        error: 'Files array is required',
      }, { status: 400 });
    }

    // Decode base64 content to ArrayBuffer
    const decodedFiles = files.map((f: any) => {
      if (f.contentBase64) {
        const binary = atob(f.contentBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return {
          path: f.path,
          mimeType: f.mimeType,
          content: bytes.buffer,
        };
      }
      return {
        path: f.path,
        mimeType: f.mimeType,
        content: f.content,
      };
    });

    console.log(`[FolderUpload] Starting upload for classroom: ${classroomId}, files: ${decodedFiles.length}`);

    // Find and parse manifest.json
    const manifestFile = decodedFiles.find((f: any) => f.path === 'manifest.json');
    let processedFiles = decodedFiles;
    
    if (manifestFile) {
      try {
        const manifestText = typeof manifestFile.content === 'string' 
          ? manifestFile.content 
          : new TextDecoder().decode(manifestFile.content as ArrayBuffer);
        const manifestData = JSON.parse(manifestText);
        
        console.log(`[FolderUpload] Processing external media URLs in manifest`);
        
        // Process external media URLs
        const result = await processClassroomMedia(classroomId, manifestData);
        
        // Replace manifest content with processed data
        const newManifestFile = decodedFiles.map((f: any) => {
          if (f.path === 'manifest.json') {
            return {
              path: 'manifest.json',
              mimeType: 'application/json',
              content: JSON.stringify(result.processedData),
            };
          }
          return f;
        });
        
        processedFiles = newManifestFile;
        
        console.log(`[FolderUpload] Processed ${Object.keys(result.mediaMap).length} external media URLs`);
      } catch (error) {
        console.warn(`[FolderUpload] Failed to process external media:`, error);
      }
    }

    const uploadedUrls = await uploadClassroomFolder(classroomId, processedFiles);
    
    console.log(`[FolderUpload] Uploaded ${uploadedUrls.length} files successfully`);

    const exists = await classroomExistsOnServer(classroomId);
    
    const dataUrl = `classrooms/${classroomId}/manifest.json`;
    
    if (exists) {
      await updateClassroomOnServer({ id: classroomId, name, description, sceneCount, dataUrl });
    } else {
      await saveClassroomToServer({ id: classroomId, name, description, sceneCount, dataUrl });
    }

    return NextResponse.json({
      success: true,
      message: `Classroom folder uploaded successfully`,
      id: classroomId,
      fileCount: uploadedUrls.length,
    });
  } catch (error) {
    console.error('[FolderUpload] Error uploading classroom folder:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to upload classroom folder',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
