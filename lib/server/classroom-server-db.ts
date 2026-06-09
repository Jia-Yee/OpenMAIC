/**
 * Server-side Classroom Storage
 *
 * Uses PostgreSQL database to store classrooms.
 * This allows multiple devices to access the same classrooms
 * when they are connected to the same server.
 */

import { getDb } from '@/lib/db';
import { classrooms, type Classroom } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
  data: any;
}): Promise<void> {
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);

  await db.insert(classrooms).values({
    id: classroom.id,
    name: classroom.name,
    description: classroom.description,
    sceneCount: classroom.sceneCount,
    data: JSON.stringify(classroom.data),
    createdAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: classrooms.id,
    set: {
      name: classroom.name,
      description: classroom.description,
      sceneCount: classroom.sceneCount,
      data: JSON.stringify(classroom.data),
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
  data?: any;
}): Promise<void> {
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);

  const updateData: Record<string, any> = {
    updatedAt: now,
  };

  if (classroom.name !== undefined) updateData.name = classroom.name;
  if (classroom.description !== undefined) updateData.description = classroom.description;
  if (classroom.sceneCount !== undefined) updateData.sceneCount = classroom.sceneCount;
  if (classroom.data !== undefined) updateData.data = JSON.stringify(classroom.data);

  await db.update(classrooms)
    .set(updateData)
    .where(eq(classrooms.id, classroom.id));

  console.log(`[ServerDB] Updated classroom in database: ${classroom.id}`);
}

/**
 * Get a classroom from the database
 */
export async function getClassroomFromServer(id: string): Promise<PersistedClassroom | null> {
  const db = await getDb();

  const result = await db.select()
    .from(classrooms)
    .where(eq(classrooms.id, id));

  if (result.length === 0) {
    return null;
  }

  const row = result[0];
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sceneCount: row.sceneCount || 0,
    data: row.data ? JSON.parse(row.data) : null,
    createdAt: row.createdAt || 0,
    updatedAt: row.updatedAt || 0,
  };
}

/**
 * Get all classrooms from the database (for listing)
 */
export async function listClassroomsFromServer(): Promise<ClassroomListItem[]> {
  const db = await getDb();

  const result = await db.select()
    .from(classrooms)
    .orderBy(classrooms.updatedAt);

  return result.map((row: Classroom) => ({
    id: row.id,
    name: row.name,
    description: row.description || 'AI 生成的交互式课堂',
    sceneCount: row.sceneCount || 0,
    createdAt: row.createdAt ? new Date(row.createdAt * 1000).toISOString() : new Date().toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt * 1000).toISOString() : new Date().toISOString(),
  }));
}

/**
 * Delete a classroom from the database
 */
export async function deleteClassroomFromServer(id: string): Promise<void> {
  const db = await getDb();

  await db.delete(classrooms)
    .where(eq(classrooms.id, id));

  console.log(`[ServerDB] Deleted classroom from database: ${id}`);
}

/**
 * Check if a classroom exists on the server
 */
export async function classroomExistsOnServer(id: string): Promise<boolean> {
  const db = await getDb();

  const result = await db.select({ id: classrooms.id })
    .from(classrooms)
    .where(eq(classrooms.id, id));

  return result.length > 0;
}