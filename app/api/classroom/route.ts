import { type NextRequest } from 'next/server';
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

    // 如果本地文件系统没有，尝试从 Blob 读取
    if (!classroom) {
      log.info(`Classroom not found in local storage, trying Blob: ${id}`);
      
      const data = await getClassroomData(id);
      if (data) {
        // 下载媒体文件并还原为 data URL
        const mediaData: Record<string, string> = {};
        const mediaFiles = await listClassroomMedia(id);
        
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
        
        classroom = {
          id,
          stage: data.stage,
          scenes: data.scenes || [],
          createdAt: new Date().toISOString(),
        };
        
        log.info(`Classroom loaded from Blob: ${id}`);
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
