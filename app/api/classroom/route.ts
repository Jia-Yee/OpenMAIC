import { type NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import {
  buildRequestOrigin,
  isValidClassroomId,
  persistClassroom,
  readClassroom,
} from '@/lib/server/classroom-storage';
import { getClassroomData, listClassroomMedia, getMediaFile } from '@/lib/server/blob-storage';
import { restoreMediaDataUrls } from '@/lib/server/media-extractor';
import { ensureDb } from '@/lib/db';
import { classrooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('Classroom API');

export async function POST(request: NextRequest) {
  let stageId: string | undefined;
  let sceneCount: number | undefined;
  try {
    const body = await request.json();
    const { stage, scenes } = body;
    stageId = stage?.id;
    sceneCount = scenes?.length;

    if (!stage || !scenes) {
      return apiError(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD,
        400,
        'Missing required fields: stage, scenes',
      );
    }

    const id = stage.id || randomUUID();
    const baseUrl = buildRequestOrigin(request);

    const persisted = await persistClassroom({ id, stage: { ...stage, id }, scenes }, baseUrl);

    return apiSuccess({ id: persisted.id, url: persisted.url }, 201);
  } catch (error) {
    log.error(
      `Classroom storage failed [stageId=${stageId ?? 'unknown'}, scenes=${sceneCount ?? 0}]:`,
      error,
    );
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to store classroom',
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return apiError(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD,
        400,
        'Missing required parameter: id',
      );
    }

    if (!isValidClassroomId(id)) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, 'Invalid classroom id');
    }

    let classroom = await readClassroom(id);

    // 如果本地文件系统没有，尝试从 PostgreSQL + Blob 读取
    if (!classroom) {
      log.info(`Classroom not found in local storage, trying PostgreSQL + Blob: ${id}`);
      
      const pgDb = await ensureDb();
      
      const results = await pgDb.select()
        .from(classrooms)
        .where(eq(classrooms.id, id))
        .limit(1);
      
      log.info(`PostgreSQL query result: ${results.length} records found`);
      
      if (results.length > 0) {
        const serverClassroom = results[0];
        log.info(`Found classroom in PostgreSQL: ${serverClassroom.name}, dataUrl: ${serverClassroom.dataUrl ? 'exists' : 'empty'}`);
        
        // 从 Blob 获取完整数据
        const data = (serverClassroom.dataUrl ? await getClassroomData(id) : null) || {} as any;
        log.info(`Blob data: ${data ? 'exists' : 'null'}, has stage: ${!!data.stage}, has scenes: ${!!data.scenes}`);
        
        // 检查 Blob 数据是否完整
        if (!data.stage || !data.scenes) {
          log.warn(`Blob data is incomplete for classroom ${id}: stage=${!!data.stage}, scenes=${!!data.scenes}`);
          // 如果 Blob 数据不完整，返回错误
          return NextResponse.json({
            success: false,
            error: 'INCOMPLETE_DATA',
            message: `Classroom data in Blob is incomplete. Please re-sync the classroom.`,
            dataUrl: serverClassroom.dataUrl || null,
          }, { status: 500 });
        }
        
        // 下载媒体文件并还原为 data URL
        const mediaData: Record<string, string> = {};
        if (serverClassroom.dataUrl) {
          const mediaFiles = await listClassroomMedia(id);
          log.info(`Found ${mediaFiles.length} media files for classroom ${id}`);
          
          for (const mediaFile of mediaFiles) {
            if (!mediaFile) continue;
            const mediaId = mediaFile.replace(/\.[^.]+$/, '');
            const dataUrl = await getMediaFile(id, mediaFile);
            if (dataUrl) {
              mediaData[mediaId] = dataUrl;
            }
          }
          
          // 还原媒体文件为 data URL
          if (Object.keys(mediaData).length > 0 && data.stage && data.scenes) {
            const restoredData = restoreMediaDataUrls(data, mediaData);
            data.stage = restoredData.stage;
            data.scenes = restoredData.scenes;
          }
        }
        
        // 构建 stage 对象（与 /api/classrooms/[id] 保持一致）
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
        log.info(`Classroom loaded from PostgreSQL + Blob: ${id}, ${scenes.length} scenes`);
        
        classroom = {
          id,
          stage,
          scenes,
          createdAt: new Date().toISOString(),
        };
      }
    }

    if (!classroom) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 404, 'Classroom not found');
    }

    return apiSuccess({ classroom });
  } catch (error) {
    log.error(
      `Classroom retrieval failed [id=${request.nextUrl.searchParams.get('id') ?? 'unknown'}]:`,
      error,
    );
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to retrieve classroom',
      error instanceof Error ? error.message : String(error),
    );
  }
}
