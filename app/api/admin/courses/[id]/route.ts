import { NextResponse } from 'next/server';
import { getDb, initDb, getSqliteDb } from '@/lib/db';
import { courses, coursePrerequisites } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { writeFileSync, existsSync } from 'fs';
import { dirname } from 'path';

const dbPath = process.env.DATABASE_PATH || './data/clover.db';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

// Save database to file
function saveDatabase() {
  try {
    const sqliteDb = getSqliteDb();
    if (sqliteDb && existsSync(dirname(dbPath))) {
      const data = sqliteDb.export();
      writeFileSync(dbPath, Buffer.from(data));
      console.log('✅ Database saved successfully');
    }
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

/**
 * GET /api/admin/courses/{id}
 * Get a single course by ID
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await ensureDb();

    const course = await db.select()
      .from(courses)
      .where(eq(courses.id, id))
      .limit(1);

    if (course.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Course not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      course: course[0],
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course', success: false },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/courses/{id}
 * Update a course
 * 
 * Body: { title?: string, description?: string, isFree?: boolean, ... }
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = await ensureDb();

    const updates: any = {};
    if (body.gradeId !== undefined) updates.gradeId = body.gradeId;
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.coverUrl !== undefined) updates.coverUrl = body.coverUrl;
    if (body.videoUrl !== undefined) updates.videoUrl = body.videoUrl;
    if (body.classroomId !== undefined) updates.classroomId = body.classroomId;
    if (body.duration !== undefined) updates.duration = body.duration;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.isFree !== undefined) updates.isFree = body.isFree;
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

    await db.update(courses)
      .set(updates)
      .where(eq(courses.id, id));

    // Save database to file
    saveDatabase();

    return NextResponse.json({
      success: true,
      message: 'Course updated successfully',
    });
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'Failed to update course', success: false },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/courses/{id}
 * Delete a course
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await ensureDb();

    await db.delete(courses)
      .where(eq(courses.id, id));

    // Save database to file
    saveDatabase();

    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'Failed to delete course', success: false },
      { status: 500 }
    );
  }
}
