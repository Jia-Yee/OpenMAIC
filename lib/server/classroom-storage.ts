import { promises as fs } from 'fs';
import path from 'path';
import type { NextRequest } from 'next/server';
import type { Scene, Stage } from '@/lib/types/stage';
import { uploadClassroomData } from '@/lib/server/blob-storage';

export const CLASSROOMS_DIR = path.join(process.cwd(), 'data', 'classrooms');
export const CLASSROOM_JOBS_DIR = path.join(process.cwd(), 'data', 'classroom-jobs');

const isDev = !process.env.VERCEL && process.env.NODE_ENV !== 'production';

async function ensureDir(dir: string) {
  if (!isDev) return;
  await fs.mkdir(dir, { recursive: true });
}

export async function ensureClassroomsDir() {
  await ensureDir(CLASSROOMS_DIR);
}

export async function ensureClassroomJobsDir() {
  await ensureDir(CLASSROOM_JOBS_DIR);
}

export async function writeJsonFileAtomic(filePath: string, data: unknown) {
  if (!isDev) return;

  const dir = path.dirname(filePath);
  await ensureDir(dir);

  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(tempFilePath, content, 'utf-8');
  await fs.rename(tempFilePath, filePath);
}

export function buildRequestOrigin(req: NextRequest): string {
  return req.headers.get('x-forwarded-host')
    ? `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('x-forwarded-host')}`
    : req.nextUrl.origin;
}

export interface PersistedClassroomData {
  id: string;
  stage: Stage;
  scenes: Scene[];
  createdAt: string;
}

export function isValidClassroomId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Normalize classroom data from different storage formats:
 * Format A (persistClassroom): {stage: {...}, scenes: [...], createdAt: "..."}
 * Format B (server/folder): {id, name, data: {stage: {...}, scenes: [...]}}
 */
function normalizeClassroomData(raw: any, id: string): PersistedClassroomData | null {
  if (!raw) return null;

  if (raw.stage && raw.scenes) {
    return {
      id: raw.id || id,
      stage: raw.stage,
      scenes: raw.scenes,
      createdAt: raw.createdAt || new Date().toISOString(),
    };
  }

  if (raw.data && raw.data.stage && raw.data.scenes) {
    return {
      id: raw.id || id,
      stage: raw.data.stage,
      scenes: raw.data.scenes,
      createdAt: raw.createdAt || new Date().toISOString(),
    };
  }

  if (raw.stage) {
    return {
      id: raw.id || id,
      stage: raw.stage,
      scenes: raw.scenes || [],
      createdAt: raw.createdAt || new Date().toISOString(),
    };
  }

  if (raw.data && raw.data.stage) {
    return {
      id: raw.id || id,
      stage: raw.data.stage,
      scenes: raw.data.scenes || [],
      createdAt: raw.createdAt || new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Read classroom from local file system (dev only)
 * Production should read from PostgreSQL + R2 via /api/classroom
 */
export async function readClassroom(id: string): Promise<PersistedClassroomData | null> {
  if (!isDev) return null;

  const filePath = path.join(CLASSROOMS_DIR, `${id}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const raw = JSON.parse(content);
    const result = normalizeClassroomData(raw, id);
    if (result) {
      console.log(`[readClassroom] ${id}: ${result.scenes?.length || 0} scenes`);
    }
    return result;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Persist classroom data.
 * Dev: write to local file only
 * Production: upload to R2 only
 */
export async function persistClassroom(
  data: {
    id: string;
    stage: Stage;
    scenes: Scene[];
  },
  baseUrl: string,
): Promise<PersistedClassroomData & { url: string }> {
  const classroomData: PersistedClassroomData = {
    id: data.id,
    stage: data.stage,
    scenes: data.scenes,
    createdAt: new Date().toISOString(),
  };

  if (isDev) {
    // Dev: write to local file only
    await ensureClassroomsDir();
    const filePath = path.join(CLASSROOMS_DIR, `${data.id}.json`);
    await writeJsonFileAtomic(filePath, classroomData);
  } else {
    // Production: upload to R2
    try {
      await uploadClassroomData(data.id, classroomData);
    } catch (error) {
      console.error('[persistClassroom] R2 upload failed:', error);
    }
  }

  return {
    ...classroomData,
    url: `${baseUrl}/classroom/${data.id}`,
  };
}
