/**
 * Server-side Classroom Storage
 *
 * Uses the file system to store classrooms as JSON files.
 * This allows multiple devices to access the same classrooms
 * when they are connected to the same server.
 */

import { promises as fs } from 'fs';
import path from 'path';

export const CLASSROOMS_DIR = path.join(process.cwd(), 'data', 'classrooms');

// Ensure the directory exists
async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function ensureClassroomsDir() {
  await ensureDir(CLASSROOMS_DIR);
}

export interface PersistedClassroom {
  id: string;
  name: string;
  description?: string;
  sceneCount: number;
  createdAt: number;
  updatedAt: number;
  data: any; // Full classroom data (stage + scenes)
}

export interface ClassroomListItem {
  id: string;
  name: string;
  description: string;
  sceneCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Save a classroom to the server file system
 */
export async function saveClassroomToServer(classroom: {
  id: string;
  name: string;
  description?: string;
  sceneCount: number;
  data: any;
}): Promise<void> {
  await ensureClassroomsDir();

  const filePath = path.join(CLASSROOMS_DIR, `${classroom.id}.json`);
  const content = {
    ...classroom,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const tempPath = `${filePath}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(content, null, 2), 'utf-8');
  await fs.rename(tempPath, filePath);

  console.log(`[ServerDB] Saved classroom: ${classroom.id}`);
}

/**
 * Update an existing classroom on the server
 */
export async function updateClassroomOnServer(classroom: {
  id: string;
  name?: string;
  description?: string;
  sceneCount?: number;
  data?: any;
}): Promise<void> {
  const filePath = path.join(CLASSROOMS_DIR, `${classroom.id}.json`);

  let existing: any = null;
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    existing = JSON.parse(content);
  } catch (e) {
    // File doesn't exist, create new
    existing = {
      id: classroom.id,
      createdAt: Date.now(),
    };
  }

  const updated = {
    ...existing,
    ...classroom,
    updatedAt: Date.now(),
  };

  const tempPath = `${filePath}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(updated, null, 2), 'utf-8');
  await fs.rename(tempPath, filePath);

  console.log(`[ServerDB] Updated classroom: ${classroom.id}`);
}

/**
 * Get a classroom from the server
 */
export async function getClassroomFromServer(id: string): Promise<PersistedClassroom | null> {
  const filePath = path.join(CLASSROOMS_DIR, `${id}.json`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw e;
  }
}

/**
 * Get all classrooms from the server (for listing)
 */
export async function listClassroomsFromServer(): Promise<ClassroomListItem[]> {
  await ensureClassroomsDir();

  const files = await fs.readdir(CLASSROOMS_DIR);
  const classrooms: ClassroomListItem[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    try {
      const content = await fs.readFile(path.join(CLASSROOMS_DIR, file), 'utf-8');
      const data = JSON.parse(content);

      classrooms.push({
        id: data.id,
        name: data.name,
        description: data.description || 'AI 生成的交互式课堂',
        sceneCount: data.sceneCount || 0,
        createdAt: new Date(data.createdAt).toISOString(),
        updatedAt: new Date(data.updatedAt).toISOString(),
      });
    } catch (e) {
      console.error(`[ServerDB] Failed to read classroom file ${file}:`, e);
    }
  }

  // Sort by updatedAt descending
  classrooms.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return classrooms;
}

/**
 * Delete a classroom from the server
 */
export async function deleteClassroomFromServer(id: string): Promise<void> {
  const filePath = path.join(CLASSROOMS_DIR, `${id}.json`);

  try {
    await fs.unlink(filePath);
    console.log(`[ServerDB] Deleted classroom: ${id}`);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw e;
    }
  }
}

/**
 * Check if a classroom exists on the server
 */
export async function classroomExistsOnServer(id: string): Promise<boolean> {
  const filePath = path.join(CLASSROOMS_DIR, `${id}.json`);

  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
