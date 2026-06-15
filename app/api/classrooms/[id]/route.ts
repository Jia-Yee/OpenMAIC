import { NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/utils/database';
import type { SceneRecord } from '@/lib/utils/database';
import { ensureDb } from '@/lib/db';
import { classrooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getClassroomData, getMediaFile, listClassroomMedia } from '@/lib/server/blob-storage';
import { restoreMediaDataUrls } from '@/lib/server/media-extractor';

let dbInitialized = false;

async function ensureDbInit() {
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const classroomId = params.id;
    
    console.log('Fetching classroom:', classroomId);
    
    let stage = null;
    let scenes = [];
    
    // 直接从服务器获取数据，确保音频 URL 被正确处理
    console.log('Fetching classroom from server:', classroomId);
    
    const pgDb = await ensureDb();
    
    // 从 PostgreSQL 获取元数据
    const results = await pgDb.select()
      .from(classrooms)
      .where(eq(classrooms.id, classroomId))
      .limit(1);
    
    if (results.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Course not found',
        message: `Course with ID "${classroomId}" does not exist`
      }, { status: 404 });
    }
    
    const serverClassroom = results[0];
    
    // 从 Blob 获取完整数据
    const data = (serverClassroom.dataUrl ? await getClassroomData(classroomId) : null) || {} as any;
    
    // Debug: 检查原始数据中的音频 URL 格式
    if (data.scenes) {
      for (const scene of data.scenes) {
        if (scene.actions) {
          for (const action of scene.actions) {
            if (action.type === 'speech') {
              console.log(`[Debug] Speech action audioUrl format: ${action.audioUrl ? (action.audioUrl.startsWith('data:') ? 'data URL' : action.audioUrl.substring(0, 50)) : 'undefined'}, audioId: ${action.audioId || action.id}`);
            }
          }
        }
      }
    }
    
    // 下载媒体文件并还原为data URL
    const mediaData: Record<string, string> = {};
    if (serverClassroom.dataUrl) {
      const mediaFiles = await listClassroomMedia(classroomId);
      console.log(`Found ${mediaFiles.length} media files to download`);
      console.log(`Media files: ${JSON.stringify(mediaFiles)}`);
      
      for (const mediaFile of mediaFiles) {
        if (!mediaFile) continue;
        const mediaId = mediaFile.replace(/\.[^.]+$/, '');
        console.log(`Downloading media: ${mediaFile} -> mediaId: ${mediaId}`);
        const dataUrl = await getMediaFile(classroomId, mediaFile);
        if (dataUrl) {
          mediaData[mediaId] = dataUrl;
          console.log(`Successfully downloaded media: ${mediaId}`);
        } else {
          console.log(`Failed to download media: ${mediaId}`);
        }
      }
      
      console.log(`Total media data loaded: ${Object.keys(mediaData).length} items`);
      console.log(`Media data keys: ${JSON.stringify(Object.keys(mediaData))}`);
      
      // Debug: 检查原始数据中的音频ID
      if (data.scenes) {
        for (const scene of data.scenes) {
          if (scene.actions) {
            for (const action of scene.actions) {
              if (action.type === 'speech') {
                const audioId = action.audioId || action.id;
                console.log(`[Debug] Speech action - audioId: ${audioId}, audioUrl: ${action.audioUrl ? action.audioUrl.substring(0, 30) : 'undefined'}, hasMedia: ${mediaData[audioId] ? 'yes' : 'no'}`);
              }
            }
          }
        }
      }
      
      // 还原媒体文件为data URL
      if (Object.keys(mediaData).length > 0 && data.stage && data.scenes) {
        const restoredData = restoreMediaDataUrls(data, mediaData);
        data.stage = restoredData.stage;
        data.scenes = restoredData.scenes;
        
        // Debug: 检查还原后的数据
        console.log('Media restored, checking audio URLs...');
        if (data.scenes) {
          for (const scene of data.scenes) {
            if (scene.actions) {
              for (const action of scene.actions) {
                if (action.type === 'speech') {
                  console.log(`[Debug] After restore - audioUrl: ${action.audioUrl ? (action.audioUrl.startsWith('data:') ? 'data URL' : action.audioUrl.substring(0, 30)) : 'undefined'}`);
                }
              }
            }
          }
        }
      }
    }
    
    stage = {
      id: serverClassroom.id,
      name: serverClassroom.name,
      description: serverClassroom.description,
      createdAt: (serverClassroom.createdAt || 0) * 1000,
      updatedAt: (serverClassroom.updatedAt || 0) * 1000,
      languageDirective: data.languageDirective,
      style: data.style,
      currentSceneId: data.currentSceneId,
      agentIds: data.agentIds,
    };
    
    scenes = data.scenes || [];
    console.log(`Found ${scenes.length} scenes from Blob`);
    
    // 返回课程详情（包含场景）
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
    console.error('Failed to fetch classroom:', error);
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch classroom',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}