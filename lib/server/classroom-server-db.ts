/**
 * Server-side Classroom Storage
 *
 * Uses PostgreSQL database to store classroom metadata
 * and Vercel Blob to store classroom content data.
 */

import { ensureDb } from '@/lib/db';
import { classrooms, type Classroom } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getClassroomData } from './blob-storage';

export interface PersistedClassroom {
  id: string;
  name: string;
  description?: string;
  sceneCount: number;
  data: any;
  createdAt: number;
  updatedAt: number;
}

export interface ClassroomListItem {
  id: string;
  name: string;
  description: string;
  sceneCount: number;
  dataUrl: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Save a classroom to the database
 */
export async function saveClassroomToServer(classroom: {
  id: string;
  name: string;
  description?: string;
  sceneCount: number;
  dataUrl: string;
}): Promise<void> {
  const db = await ensureDb();
  const now = Math.floor(Date.now() / 1000);

  await db.insert(classrooms).values({
    id: classroom.id,
    name: classroom.name,
    description: classroom.description,
    sceneCount: classroom.sceneCount,
    dataUrl: classroom.dataUrl,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: classrooms.id,
    set: {
      name: classroom.name,
      description: classroom.description,
      sceneCount: classroom.sceneCount,
      dataUrl: classroom.dataUrl,
      updatedAt: now,
    },
  });

  console.log(`[ServerDB] Saved classroom to database: ${classroom.id}`);
}

/**
 * Update an existing classroom on the server
 */
export async function updateClassroomOnServer(classroom: {
  id: string;
  name?: string;
  description?: string;
  sceneCount?: number;
  dataUrl?: string;
}): Promise<void> {
  const db = await ensureDb();
  const now = Math.floor(Date.now() / 1000);

  const updateData: Record<string, any> = {
    updatedAt: now,
  };

  if (classroom.name !== undefined) updateData.name = classroom.name;
  if (classroom.description !== undefined) updateData.description = classroom.description;
  if (classroom.sceneCount !== undefined) updateData.sceneCount = classroom.sceneCount;
  if (classroom.dataUrl !== undefined) updateData.dataUrl = classroom.dataUrl;

  await db.update(classrooms)
    .set(updateData)
    .where(eq(classrooms.id, classroom.id));

  console.log(`[ServerDB] Updated classroom in database: ${classroom.id}`);
}

/**
 * Get a classroom from the database and Blob
 */
export async function getClassroomFromServer(id: string): Promise<PersistedClassroom | null> {
  const db = await ensureDb();

  const result = await db.select()
    .from(classrooms)
    .where(eq(classrooms.id, id));

  if (result.length === 0) {
    return null;
  }

  const row = result[0];
  
  let data = null;
  if (row.dataUrl) {
    data = await getClassroomData(id);
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sceneCount: row.sceneCount || 0,
    data: data,
    createdAt: row.createdAt || 0,
    updatedAt: row.updatedAt || 0,
  };
}

/**
 * Get all classrooms from the database (for listing)
 * In dev mode, also scans local filesystem for classrooms not in DB
 */
export async function listClassroomsFromServer(): Promise<ClassroomListItem[]> {
  const isDev = !process.env.VERCEL && process.env.NODE_ENV !== 'production';
  const db = await ensureDb();

  // Get classrooms from PostgreSQL
  const result = await db.select()
    .from(classrooms)
    .orderBy(classrooms.updatedAt);

  const dbItems: ClassroomListItem[] = result.map((row: Classroom) => ({
    id: row.id,
    name: row.name,
    description: row.description || 'AI 生成的交互式课堂',
    sceneCount: row.sceneCount || 0,
    dataUrl: row.dataUrl || '',
    createdAt: row.createdAt ? new Date(row.createdAt * 1000).toISOString() : new Date().toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt * 1000).toISOString() : new Date().toISOString(),
  }));

  if (!isDev) {
    return dbItems;
  }

  // Dev mode: also scan local filesystem for classrooms not in DB
  const fs = await import('fs');
  const path = await import('path');
  const classroomsDir = path.join(process.cwd(), 'data', 'classrooms');

  try {
    await fs.promises.access(classroomsDir);
  } catch {
    return dbItems;
  }

  const entries = await fs.promises.readdir(classroomsDir);
  const jsonFiles = entries.filter((f: string) => f.endsWith('.json'));
  const dbIds = new Set(dbItems.map((c: ClassroomListItem) => c.id));

  const localItems: ClassroomListItem[] = [];
  for (const file of jsonFiles) {
    const id = file.replace('.json', '');

    try {
      const content = await fs.promises.readFile(path.join(classroomsDir, file), 'utf-8');
      const data = JSON.parse(content);

      // Handle both formats
      let name = '', description = '', sceneCount = 0, createdAt = '', updatedAt = '';
      if (data.data && typeof data.data === 'object') {
        // Format B: server format
        name = data.name || '';
        description = data.description || '';
        sceneCount = data.data.scenes?.length || data.sceneCount || 0;
        createdAt = data.data.stage?.createdAt || '';
        updatedAt = data.data.stage?.updatedAt || '';
      } else if (data.stage) {
        // Format A: persistClassroom format
        name = data.stage.name || '';
        description = data.stage.description || '';
        sceneCount = data.scenes?.length || 0;
        createdAt = data.stage.createdAt || data.createdAt || '';
        updatedAt = data.stage.updatedAt || '';
      }

      if (dbIds.has(id)) {
        // Update DB item's sceneCount from local file if DB has 0
        const dbItem = dbItems.find((c: ClassroomListItem) => c.id === id);
        if (dbItem && sceneCount > 0 && dbItem.sceneCount === 0) {
          dbItem.sceneCount = sceneCount;
          dbItem.name = name || dbItem.name;
        }
        continue;
      }

      localItems.push({
        id,
        name: name || id,
        description: description || 'AI 生成的交互式课堂',
        sceneCount,
        dataUrl: `classrooms/${id}/manifest.json`,
        createdAt: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
        updatedAt: updatedAt ? new Date(updatedAt).toISOString() : new Date().toISOString(),
      });
    } catch {
      // Skip invalid files
    }
  }

  console.log(`[listClassroomsFromServer] DB: ${dbItems.length}, Local-only: ${localItems.length}`);
  return [...dbItems, ...localItems];
}

/**
 * Delete a classroom from the database
 */
export async function deleteClassroomFromServer(id: string): Promise<void> {
  const db = await ensureDb();

  await db.delete(classrooms)
    .where(eq(classrooms.id, id));

  console.log(`[ServerDB] Deleted classroom from database: ${id}`);
}

/**
 * Check if a classroom exists on the server
 */
export async function classroomExistsOnServer(id: string): Promise<boolean> {
  const db = await ensureDb();

  const result = await db.select({ id: classrooms.id })
    .from(classrooms)
    .where(eq(classrooms.id, id));

  return result.length > 0;
}