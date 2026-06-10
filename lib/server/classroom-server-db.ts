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
  
  // 从 Blob 获取完整数据
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
 */
export async function listClassroomsFromServer(): Promise<ClassroomListItem[]> {
  const db = await ensureDb();

  const result = await db.select()
    .from(classrooms)
    .orderBy(classrooms.updatedAt);

  return result.map((row: Classroom) => ({
    id: row.id,
    name: row.name,
    description: row.description || 'AI 生成的交互式课堂',
    sceneCount: row.sceneCount || 0,
    dataUrl: row.dataUrl || '',
    createdAt: row.createdAt ? new Date(row.createdAt * 1000).toISOString() : new Date().toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt * 1000).toISOString() : new Date().toISOString(),
  }));
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