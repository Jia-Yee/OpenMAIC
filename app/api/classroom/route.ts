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

/**
 * Restore media files as data URLs for a classroom
 */
async function restoreMediaForClassroom(id: string, classroom: any): Promise<any> {
  const mediaData: Record<string, string> = {};
  const mediaFiles = await listClassroomMedia(id);
  log.info(`Found ${mediaFiles.length} media files for classroom ${id}`);

  for (const mediaFile of mediaFiles) {
    if (!mediaFile) continue;
    const mediaId = mediaFile.replace(/\.[^.]+$/, '');
    const dataUrl = await getMediaFile(id, mediaId);
    if (dataUrl) {
      mediaData[mediaId] = dataUrl;
    }
  }

  if (Object.keys(mediaData).length > 0) {
    const restoredData = restoreMediaDataUrls(classroom, mediaData);
    classroom.scenes = restoredData.scenes;
  }

  return classroom;
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

    // Step 1: Try reading from local filesystem (handles both format A and B)
    let classroom = await readClassroom(id);
    log.info(`readClassroom(${id}): ${classroom ? `${classroom.scenes?.length || 0} scenes` : 'not found'}`);

    // Step 2: If local file has scenes, restore media and return
    if (classroom && classroom.scenes && classroom.scenes.length > 0) {
      classroom = await restoreMediaForClassroom(id, classroom);
      return apiSuccess({ classroom });
    }

    // Step 3: Fallback to PostgreSQL + Blob for production
    if (!classroom || !classroom.scenes || classroom.scenes.length === 0) {
      if (!classroom) {
        log.info(`Classroom not found in local storage, trying PostgreSQL + Blob: ${id}`);
      } else {
        log.info(`Classroom found in local storage but has no scenes, trying PostgreSQL + Blob: ${id}`);
      }

      const pgDb = await ensureDb();

      const results = await pgDb.select()
        .from(classrooms)
        .where(eq(classrooms.id, id))
        .limit(1);

      log.info(`PostgreSQL query result: ${results.length} records found`);

      if (results.length > 0) {
        const serverClassroom = results[0];
        log.info(`Found classroom in PostgreSQL: ${serverClassroom.name}, dataUrl: ${serverClassroom.dataUrl ? 'exists' : 'empty'}`);

        // Get full data from Blob
        const data = (serverClassroom.dataUrl ? await getClassroomData(id) : null) || {} as any;
        log.info(`Blob data: ${data ? 'exists' : 'null'}, has stage: ${!!data.stage}, has scenes: ${!!data.scenes}`);

        if (!data.stage || !data.scenes) {
          log.warn(`Blob data is incomplete for classroom ${id}: stage=${!!data.stage}, scenes=${!!data.scenes}`);
          data.stage = data.stage || {};
          data.scenes = data.scenes || [];
        }

        // Download media files and restore as data URLs
        if (serverClassroom.dataUrl) {
          const mediaData: Record<string, string> = {};
          const mediaFiles = await listClassroomMedia(id);
          log.info(`Found ${mediaFiles.length} media files for classroom ${id}`);

          for (const mediaFile of mediaFiles) {
            if (!mediaFile) continue;
            const mediaId = mediaFile.replace(/\.[^.]+$/, '');
            const dataUrl = await getMediaFile(id, mediaId);
            if (dataUrl) {
              mediaData[mediaId] = dataUrl;
            }
          }

          if (Object.keys(mediaData).length > 0 && data.stage && data.scenes) {
            const restoredData = restoreMediaDataUrls(data, mediaData);
            data.stage = restoredData.stage;
            data.scenes = restoredData.scenes;
          }
        }

        // Build stage object
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
