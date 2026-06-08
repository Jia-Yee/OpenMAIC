import { NextResponse } from 'next/server';
import { getDb, initDb, autoSaveDb } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * PUT /api/admin/courses/reorder
 * Reorder courses within a grade
 * 
 * Body: {
 *   gradeId: string,
 *   order: [{ courseId: string, sortOrder: number }]
 * }
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { gradeId, order } = body;

    if (!gradeId || !order || !Array.isArray(order)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid parameters',
      }, { status: 400 });
    }

    const db = await ensureDb();

    // Update each course's sort order
    for (const item of order) {
      await db.update(courses)
        .set({ sortOrder: item.sortOrder })
        .where(eq(courses.id, item.courseId));
    }

    // Refresh the order to ensure continuity
    const orderedCourses = await db.select()
      .from(courses)
      .where(eq(courses.gradeId, gradeId))
      .orderBy(courses.sortOrder);

    let currentOrder = 0;
    for (const course of orderedCourses) {
      if (course.sortOrder !== currentOrder) {
        await db.update(courses)
          .set({ sortOrder: currentOrder })
          .where(eq(courses.id, course.id));
      }
      currentOrder++;
    }

    // Save database to disk
    autoSaveDb();

    return NextResponse.json({
      success: true,
      message: 'Courses reordered successfully',
      count: order.length,
    });
  } catch (error) {
    console.error('Error reordering courses:', error);
    return NextResponse.json(
      { error: 'Failed to reorder courses', success: false },
      { status: 500 }
    );
  }
}
