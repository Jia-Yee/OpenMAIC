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
import { ensureDb } from '@/lib/db';
import { classrooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('Classroom API');

// Production (Vercel) has no local filesystem, skip local reads
const isDev = !process.env.VERCEL && process.env.NODE_ENV !== 'production';

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

    let classroom = null;

    // Dev only: try reading from local filesystem first
    if (isDev) {
      classroom = await readClassroom(id);
      if (classroom && classroom.scenes && classroom.scenes.length > 0) {
        // Restore media files from local/R2
        const mediaData: Record<string, string> = {};
        const mediaFiles = await listClassroomMedia(id);
        for (const mediaFile of mediaFiles) {
          if (!mediaFile) continue;
          const mediaId = mediaFile.replace(/\.[^.]+$/, '');
          const dataUrl = await getMediaFile(id, mediaId);
          if (dataUrl) mediaData[mediaId] = dataUrl;
        }
        if (Object.keys(mediaData).length > 0) {
          const restoredData = restoreMediaDataUrls(classroom, mediaData);
          classroom.scenes = restoredData.scenes;
        }
        return apiSuccess({ classroom });
      }
    }

    // Primary path: PostgreSQL + R2 (both dev and production)
    const pgDb = await ensureDb();
    const results = await pgDb.select()
      .from(classrooms)
      .where(eq(classrooms.id, id))
      .limit(1);

    if (results.length > 0) {
      const serverClassroom = results[0];

      // Get full data from R2/Blob
      const data = (serverClassroom.dataUrl ? await getClassroomData(id) : null) || {} as any;

      if (!data.stage) data.stage = {};
      if (!data.scenes) data.scenes = [];

      // Restore media files
      if (serverClassroom.dataUrl) {
        const mediaData: Record<string, string> = {};
        const mediaFiles = await listClassroomMedia(id);
        for (const mediaFile of mediaFiles) {
          if (!mediaFile) continue;
          const mediaId = mediaFile.replace(/\.[^.]+$/, '');
          const dataUrl = await getMediaFile(id, mediaId);
          if (dataUrl) mediaData[mediaId] = dataUrl;
        }
        if (Object.keys(mediaData).length > 0 && data.stage && data.scenes) {
          const restoredData = restoreMediaDataUrls(data, mediaData);
          data.stage = restoredData.stage;
          data.scenes = restoredData.scenes;
        }
      }

      // Build stage object from PostgreSQL metadata + R2 data
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

      classroom = {
        id,
        stage,
        scenes: data.scenes || [],
        createdAt: new Date().toISOString(),
      };
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
