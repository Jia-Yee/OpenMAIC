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
    
    let files: any[] = [];
    let name: string = '';
    let description: string = '';
    let sceneCount: number = 0;

    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      name = formData.get('name') as string || '';
      description = formData.get('description') as string || '';
      sceneCount = parseInt(formData.get('sceneCount') as string || '0');
      
      const manifestEntry = formData.get('manifest');
      if (manifestEntry) {
        const manifestText = typeof manifestEntry === 'string' 
          ? manifestEntry 
          : await manifestEntry.text();
        files.push({
          path: 'manifest.json',
          mimeType: 'application/json',
          content: manifestText,
        });
      }
      
      const fileEntries = formData.getAll('files');
      for (const entry of fileEntries) {
        if (entry instanceof File) {
          const arrayBuffer = await entry.arrayBuffer();
          files.push({
            path: entry.name,
            mimeType: entry.type,
            content: arrayBuffer,
          });
        }
      }
    } else {
      const body = await request.json();
      ({ files, name, description, sceneCount } = body);
      
      if (!files || !Array.isArray(files)) {
        return NextResponse.json({
          success: false,
          error: 'Files array is required',
        }, { status: 400 });
      }

      files = files.map((f: any) => {
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
    }

    if (!classroomId) {
      return NextResponse.json({
        success: false,
        error: 'Classroom ID is required',
      }, { status: 400 });
    }

    console.log(`[FolderUpload] Starting upload for classroom: ${classroomId}, files: ${files.length}`);

    // Find and parse manifest.json
    const manifestFile = files.find((f: any) => f.path === 'manifest.json');
    let processedFiles = files;
    
    if (manifestFile) {
      try {
        const manifestText = typeof manifestFile.content === 'string' 
          ? manifestFile.content 
          : new TextDecoder().decode(manifestFile.content as ArrayBuffer);
        const manifestData = JSON.parse(manifestText);
        
        // Pre-fill audioUrl from zip audio files for speech actions that only have audioId
        // This is needed because processClassroomMedia only extracts audio that has audioUrl
        const audioFiles = files.filter((f: any) => f.path.startsWith('audio/'));
        if (audioFiles.length > 0) {
          // Build a map of audioId -> data URL from zip files
          const audioDataMap: Record<string, string> = {};
          for (const audioFile of audioFiles) {
            const filename = audioFile.path.replace('audio/', '');
            const audioId = filename.replace(/\.[^.]+$/, '');
            const ext = filename.split('.').pop()?.toLowerCase() || 'mp3';
            let mimeType = 'audio/mpeg';
            if (ext === 'wav') mimeType = 'audio/wav';
            else if (ext === 'ogg') mimeType = 'audio/ogg';
            
            const buffer = audioFile.content instanceof ArrayBuffer
              ? Buffer.from(audioFile.content)
              : Buffer.isBuffer(audioFile.content)
                ? audioFile.content
                : Buffer.from(audioFile.content as string, 'binary');
            const base64 = buffer.toString('base64');
            audioDataMap[audioId] = `data:${mimeType};base64,${base64}`;
          }
          
          // Fill audioUrl in speech actions
          let filledCount = 0;
          for (const scene of manifestData.scenes || []) {
            for (const action of scene.actions || []) {
              if (action.type === 'speech' && action.audioId && !action.audioUrl) {
                const dataUrl = audioDataMap[action.audioId];
                if (dataUrl) {
                  action.audioUrl = dataUrl;
                  filledCount++;
                }
              }
            }
          }
          console.log(`[FolderUpload] Pre-filled ${filledCount} audioUrls from ${audioFiles.length} zip audio files`);
        }
        
        console.log(`[FolderUpload] Processing external media URLs in manifest`);
        
        // Process external media URLs
        const result = await processClassroomMedia(classroomId, manifestData);
        
        // Replace manifest content with processed data
        const newManifestFile = files.map((f: any) => {
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
