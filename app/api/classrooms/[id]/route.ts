import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { classrooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getClassroomData, getMediaFile, listClassroomMedia } from '@/lib/server/blob-storage';
import { restoreMediaDataUrls } from '@/lib/server/media-extractor';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const classroomId = params.id;
    
    console.log('[ClassroomsAPI] Fetching classroom:', classroomId);
    
    const pgDb = await ensureDb();
    
    // 从 PostgreSQL 获取元数据
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
    console.log('[ClassroomsAPI] Found classroom:', serverClassroom.name, 'dataUrl:', serverClassroom.dataUrl ? 'exists' : 'empty');
    
    // 从 Blob 获取完整数据
    let data: any = {};
    if (serverClassroom.dataUrl) {
      try {
        const blobData = await getClassroomData(classroomId);
        if (blobData) {
          data = blobData;
          console.log('[ClassroomsAPI] Blob data loaded, has stage:', !!data.stage, 'has scenes:', !!data.scenes);
        } else {
          console.log('[ClassroomsAPI] Blob data is null, using empty data');
        }
      } catch (blobError) {
        console.error('[ClassroomsAPI] Error loading Blob data:', blobError);
      }
    }
    
    // 检查数据完整性
    if (!data.stage || !data.scenes) {
      console.log('[ClassroomsAPI] Data incomplete, stage:', !!data.stage, 'scenes:', !!data.scenes);
      // 即使数据不完整，也尝试返回基本信息
      data.stage = data.stage || {};
      data.scenes = data.scenes || [];
    }
    
    // 下载媒体文件并还原为 data URL
    const mediaData: Record<string, string> = {};
    if (serverClassroom.dataUrl) {
      try {
        const mediaFiles = await listClassroomMedia(classroomId);
        console.log('[ClassroomsAPI] Found', mediaFiles.length, 'media files');
        
        for (const mediaFile of mediaFiles) {
          if (!mediaFile) continue;
          const mediaId = mediaFile.replace(/\.[^.]+$/, '');
          try {
            const dataUrl = await getMediaFile(classroomId, mediaFile);
            if (dataUrl) {
              mediaData[mediaId] = dataUrl;
            }
          } catch (mediaError) {
            console.error('[ClassroomsAPI] Error loading media file:', mediaFile, mediaError);
          }
        }
        
        // 还原媒体文件为 data URL
        if (Object.keys(mediaData).length > 0 && data.stage && data.scenes) {
          const restoredData = restoreMediaDataUrls(data, mediaData);
          data.stage = restoredData.stage;
          data.scenes = restoredData.scenes;
          console.log('[ClassroomsAPI] Media restored successfully');
        }
      } catch (mediaListError) {
        console.error('[ClassroomsAPI] Error listing media files:', mediaListError);
      }
    }
    
    // 构建 stage 对象
    const stage = {
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
    
    const scenes = data.scenes || [];
    console.log('[ClassroomsAPI] Returning', scenes.length, 'scenes');
    
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
    console.error('[ClassroomsAPI] Failed to fetch classroom:', error);
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch classroom',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}