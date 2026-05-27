import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';

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
 * Get courses by grade
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

    return NextResponse.json({ courses: result });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
