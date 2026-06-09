import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { courses, coursePrerequisites, asc, eq } from '@/lib/db/schema';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * GET /api/courses?gradeId=xxx
 * Get courses by grade with prerequisites
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gradeId = searchParams.get('gradeId');

    if (!gradeId) {
      return NextResponse.json(
        { error: 'gradeId is required' },
        { status: 400 }
      );
    }

    const db = await ensureDb();

    const result = await db.select()
      .from(courses)
      .where(eq(courses.gradeId, gradeId))
      .orderBy(asc(courses.sortOrder));

    // Fetch prerequisites for each course
    const coursesWithPrerequisites = await Promise.all(
      result.map(async (course: { id: string; title: string }) => {
        const prereqs = await db.select({
          prerequisiteId: coursePrerequisites.prerequisiteId,
        })
          .from(coursePrerequisites)
          .where(eq(coursePrerequisites.courseId, course.id));
        
        const prerequisiteIds = prereqs.map((p: { prerequisiteId: string }) => p.prerequisiteId);
        console.log('Course:', course.title, 'prerequisites from DB:', prerequisiteIds);
        
        return {
          ...course,
          prerequisites: prerequisiteIds,
        };
      })
    );

    return NextResponse.json({ courses: coursesWithPrerequisites });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
