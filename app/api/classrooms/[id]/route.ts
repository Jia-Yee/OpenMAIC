import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { classrooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getClassroomFile } from '@/lib/server/blob-storage';

function resolveMediaUrls(scenes: any[], classroomId: string): any[] {
  return scenes.map((scene) => {
    let newScene = { ...scene };
    
    if (newScene.actions) {
      newScene.actions = newScene.actions.map((action: any) => {
        if (action.type === 'speech') {
          if (action.audioRef) {
            return {
              ...action,
              audioUrl: `/api/classrooms/${classroomId}/file/${action.audioRef}`,
            };
          } else if (action.audioId) {
            return {
              ...action,
              audioUrl: `/api/classrooms/${classroomId}/file/audio/${action.audioId}.mp3`,
            };
          }
        }
        return action;
      });
    }
    
    const fixImageSrc = (element: any): any => {
      if (element.type !== 'image' || !element.src) {
        return element;
      }
      
      const src = element.src;
      
      // If src is already a relative API path, leave it
      if (src.startsWith('/api/')) {
        return element;
      }
      
      let filename: string | null = null;
      let ext: string | null = null;
      
      // Case 1: Try to extract filename and extension from src
      if (src.startsWith('http://') || src.startsWith('https://')) {
        // URL format: https://xxx/.../filename.ext
        try {
          const url = new URL(src);
          const pathname = url.pathname;
          const fullFilename = pathname.split('/').pop();
          if (fullFilename) {
            const match = fullFilename.match(/(.+?)(?:\.(\w+))?$/);
            if (match) {
              filename = match[1];
              if (match[2]) {
                ext = match[2];
              }
            }
          }
        } catch {}
      } else if (!src.startsWith('data:')) {
        // Simple filename format: "filename" or "filename.ext"
        const srcMatch = src.match(/^(.+?)(?:\.(\w+))?$/);
        if (srcMatch) {
          filename = srcMatch[1];
          if (srcMatch[2]) {
            ext = srcMatch[2];
          }
        }
      }
      
      // Case 2: If no filename, use element.id
      if (!filename && element.id) {
        const idMatch = element.id.match(/^(.+?)(?:\.(\w+))?$/);
        if (idMatch) {
          filename = idMatch[1];
          if (!ext && idMatch[2]) {
            ext = idMatch[2];
          }
        }
      }
      
      // Case 3: Fallback
      if (!filename) {
        filename = src.replace(/^data:[^;]+;base64,/, '').substring(0, 50) || element.id || 'image';
      }
      
      // Determine extension if not already found
      if (!ext) {
        if (element.mimeType) {
          ext = element.mimeType.split('/')[1] || 'png';
        } else if (src.match(/^data:image\/(\w+);base64,/)) {
          ext = src.match(/^data:image\/(\w+);base64,/)![1];
        } else {
          ext = 'png';
        }
      }
      
      return {
        ...element,
        src: `/api/classrooms/${classroomId}/file/media/${filename}.${ext}`,
      };
    };
    
    const fixAudioUrl = (action: any): any => {
      if (action.type !== 'speech' || !action.audioUrl) {
        return action;
      }
      
      const audioUrl = action.audioUrl;
      
      // If already a relative API path, leave it
      if (audioUrl.startsWith('/api/')) {
        return action;
      }
      
      let filename: string | null = null;
      let ext = 'mp3';
      
      // Priority: use audioId or action.id
      const audioId = action.audioId || action.id;
      if (audioId) {
        filename = audioId.replace(/\.\w+$/, '');
      }
      // Try to extract from URL
      else if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
        try {
          const url = new URL(audioUrl);
          const pathname = url.pathname;
          const fullFilename = pathname.split('/').pop();
          if (fullFilename) {
            const match = fullFilename.match(/(.+)\.(\w+)$/);
            if (match) {
              filename = match[1];
              ext = match[2];
            } else {
              filename = fullFilename;
            }
          }
        } catch {}
      } else if (audioUrl.includes('/')) {
        const fullFilename = audioUrl.split('/').pop();
        if (fullFilename) {
          const match = fullFilename.match(/(.+)\.(\w+)$/);
          if (match) {
            filename = match[1];
            ext = match[2];
          } else {
            filename = fullFilename;
          }
        }
      }
      
      if (!filename) {
        filename = audioId || 'audio';
      }
      
      return {
        ...action,
        audioUrl: `/api/classrooms/${classroomId}/file/media/${filename}.${ext}`,
      };
    };
    
    if (newScene.content?.type === 'slide' && newScene.content.canvas?.elements) {
      newScene.content = {
        ...newScene.content,
        canvas: {
          ...newScene.content.canvas,
          elements: newScene.content.canvas.elements.map(fixImageSrc),
        },
      };
    }
    
    if (newScene.whiteboards) {
      newScene.whiteboards = newScene.whiteboards.map((wb: any) => ({
        ...wb,
        elements: wb.elements?.map(fixImageSrc),
      }));
    }
    
    if (newScene.actions) {
      newScene.actions = newScene.actions.map(fixAudioUrl);
    }
    
    return newScene;
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const classroomId = params.id;
    
    console.log('[ClassroomsAPI] Fetching classroom:', classroomId);
    
    const pgDb = await ensureDb();
    
    const results = await pgDb.select()
      .from(classrooms)
      .where(eq(classrooms.id, classroomId))
      .limit(1);
    
    console.log('[ClassroomsAPI] PostgreSQL query result:', results.length, 'records');
    
    if (results.length === 0) {
      console.log('[ClassroomsAPI] Classroom not found in PostgreSQL:', classroomId);
      return NextResponse.json({ 
        success: false,
        error: 'Course not found',
        message: `Course with ID "${classroomId}" does not exist`
      }, { status: 404 });
    }
    
    const serverClassroom = results[0];
    console.log('[ClassroomsAPI] Found classroom:', serverClassroom.name);
    
    let data: any = {};
    try {
      const manifestResult = await getClassroomFile(classroomId, 'manifest.json');
      if (manifestResult) {
        const manifestText = await manifestResult.blob.text();
        data = JSON.parse(manifestText);
        console.log('[ClassroomsAPI] Manifest loaded, has stage:', !!data.stage, 'has scenes:', !!data.scenes);
      } else {
        console.log('[ClassroomsAPI] Manifest not found, trying old data format');
        const { getClassroomData } = await import('@/lib/server/blob-storage');
        const blobData = await getClassroomData(classroomId);
        if (blobData) {
          data = blobData;
        }
      }
    } catch (error) {
      console.error('[ClassroomsAPI] Error loading data:', error);
    }
    
    if (!data.stage || !data.scenes) {
      console.log('[ClassroomsAPI] Data incomplete, stage:', !!data.stage, 'scenes:', !!data.scenes);
      data.stage = data.stage || {};
      data.scenes = data.scenes || [];
    }
    
    const scenes = resolveMediaUrls(data.scenes, classroomId);
    console.log('[ClassroomsAPI] Returning', scenes.length, 'scenes');
    
    const stage = {
      id: serverClassroom.id,
      name: serverClassroom.name,
      description: serverClassroom.description,
      createdAt: (serverClassroom.createdAt || 0) * 1000,
      updatedAt: (serverClassroom.updatedAt || 0) * 1000,
      languageDirective: data.stage.language,
      style: data.stage.style,
      currentSceneId: data.currentSceneId,
      agentIds: data.agentIds,
    };
    
    return NextResponse.json({ 
      success: true,
      accessGranted: true,
      id: stage.id,
      title: stage.name,
      description: stage.description,
      accessType: 'public',
      price: undefined,
      trialEnabled: false,
      thumbnail: undefined,
      sceneCount: scenes.length,
      createdAt: new Date(stage.createdAt).toISOString(),
      updatedAt: new Date(stage.updatedAt).toISOString(),
      languageDirective: stage.languageDirective,
      style: stage.style,
      currentSceneId: stage.currentSceneId,
      agentIds: stage.agentIds,
      scenes: scenes
    });
  } catch (error) {
    console.error('[ClassroomsAPI] Failed to fetch classroom:', error);
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch classroom',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}