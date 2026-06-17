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
      
      // data URL, external URL, or blob URL — need to find the actual file
      // src typically contains the file reference like "gen_img_3CHhsR4q" or original filename
      // Try to extract the filename from src if it looks like a path
      let filename: string | null = null;
      
      // If src is a full URL, extract path
      if (src.startsWith('http://') || src.startsWith('https://')) {
        try {
          const url = new URL(src);
          const pathname = url.pathname;
          filename = pathname.split('/').pop()?.replace(/\.\w+$/, '') || null;
        } catch {}
      }
      
      // If src contains a path-like pattern, use last segment
      if (!filename && src.includes('/')) {
        filename = src.split('/').pop()?.replace(/\.\w+$/, '') || null;
      }
      
      // Otherwise use src directly as filename
      if (!filename) {
        filename = src.replace(/^data:[^;]+;base64,/, '').substring(0, 50) || element.id;
      }
      
      // Determine extension from mimeType or src
      let ext = 'png';
      if (element.mimeType) {
        ext = element.mimeType.split('/')[1] || 'png';
      } else if (src.match(/^data:image\/(\w+);base64,/)) {
        ext = src.match(/^data:image\/(\w+);base64,/)![1];
      } else if (src.match(/\.(\w+)$/)) {
        ext = src.match(/\.(\w+)$/)![1];
      }
      
      return {
        ...element,
        src: `/api/classrooms/${classroomId}/file/media/${filename}.${ext}`,
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