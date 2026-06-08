import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { courses, grades, textbooks, subjects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { saveClassroomToServer } from '@/lib/server/classroom-server-db';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * POST /api/admin/courses/import-to-classrooms
 * Import courses from SQLite to server filesystem as classrooms
 * 
 * Body: {
 *   gradeId?: string,       // Optional: specific grade to import
 *   courseIds?: string[]    // Optional: specific course IDs to import
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gradeId, courseIds } = body;

    const db = await ensureDb();
    
    // Build query
    let query = db.select({
      id: courses.id,
      gradeId: courses.gradeId,
      title: courses.title,
      description: courses.description,
    }).from(courses);

    // Filter by grade or course IDs if provided
    if (courseIds && courseIds.length > 0) {
      query = query.where(eq(courses.id, courseIds[0])); // Simplified for single ID
    } else if (gradeId) {
      query = query.where(eq(courses.gradeId, gradeId));
    }

    const coursesToImport = await query;

    let imported = 0;
    let skipped = 0;

    for (const course of coursesToImport) {
      // Create classroom data from course
      const classroomData = {
        id: course.id,
        name: course.title,
        description: course.description || '从课程导入的课堂',
        sceneCount: 1,
        data: {
          stage: {
            name: course.title,
            description: course.description || '',
            createdAt: Date.now(),
          },
          scenes: [],
        },
      };

      try {
        await saveClassroomToServer(classroomData);
        imported++;
      } catch (e) {
        console.error(`Failed to import course ${course.id}:`, e);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `导入了 ${imported} 个课程到课堂，${skipped} 个已跳过`,
      imported,
      skipped,
    });
  } catch (error) {
    console.error('Error importing courses:', error);
    return NextResponse.json(
      { error: '导入失败', success: false },
      { status: 500 }
    );
  }
}
