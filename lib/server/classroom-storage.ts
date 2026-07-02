import { promises as fs } from 'fs';
import path from 'path';
import type { NextRequest } from 'next/server';
import type { Scene, Stage } from '@/lib/types/stage';

export const CLASSROOMS_DIR = path.join(process.cwd(), 'data', 'classrooms');
export const CLASSROOM_JOBS_DIR = path.join(process.cwd(), 'data', 'classroom-jobs');

const isServerless = process.env.VERCEL || process.env.NODE_ENV === 'production';

async function ensureDir(dir: string) {
  if (isServerless) {
    console.log('[ClassroomStorage] Skipping mkdir in serverless environment');
    return;
  }
  await fs.mkdir(dir, { recursive: true });
}

export async function ensureClassroomsDir() {
  if (isServerless) {
    console.log('[ClassroomStorage] Skipping ensureClassroomsDir in serverless environment');
    return;
  }
  await ensureDir(CLASSROOMS_DIR);
}

export async function ensureClassroomJobsDir() {
  if (isServerless) {
    console.log('[ClassroomStorage] Skipping ensureClassroomJobsDir in serverless environment');
    return;
  }
  await ensureDir(CLASSROOM_JOBS_DIR);
}

export async function writeJsonFileAtomic(filePath: string, data: unknown) {
  if (isServerless) {
    console.log('[ClassroomStorage] Skipping writeJsonFileAtomic in serverless environment');
    return;
  }
  
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

  // Format A: top-level stage and scenes
  if (raw.stage && raw.scenes) {
    return {
      id: raw.id || id,
      stage: raw.stage,
      scenes: raw.scenes,
      createdAt: raw.createdAt || new Date().toISOString(),
    };
  }

  // Format B: nested in data.stage / data.scenes
  if (raw.data && raw.data.stage && raw.data.scenes) {
    return {
      id: raw.id || id,
      stage: raw.data.stage,
      scenes: raw.data.scenes,
      createdAt: raw.createdAt || new Date().toISOString(),
    };
  }

  // Partial data: has stage but no scenes (or empty scenes)
  if (raw.stage) {
    return {
      id: raw.id || id,
      stage: raw.stage,
      scenes: raw.scenes || [],
      createdAt: raw.createdAt || new Date().toISOString(),
    };
  }

  // Format B partial: has data.stage but data.scenes is missing/empty
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

export async function readClassroom(id: string): Promise<PersistedClassroomData | null> {
  const filePath = path.join(CLASSROOMS_DIR, `${id}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const raw = JSON.parse(content);
    const result = normalizeClassroomData(raw, id);
    if (result) {
      console.log(`[readClassroom] ${id}: ${result.scenes?.length || 0} scenes, format=${raw.data ? 'server' : 'persist'}`);
    }
    return result;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

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

  await ensureClassroomsDir();
  const filePath = path.join(CLASSROOMS_DIR, `${data.id}.json`);
  await writeJsonFileAtomic(filePath, classroomData);

  return {
    ...classroomData,
    url: `${baseUrl}/classroom/${data.id}`,
  };
}
