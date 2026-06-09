import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb, getSqliteDb } from '@/lib/db';
import { courses, grades, textbooks, subjects, eq, asc } from '@/lib/db/schema';
import type { NewCourse } from '@/lib/db/schema';
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
 * GET /api/admin/courses
 * Get all courses with grade info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gradeId = searchParams.get('gradeId');

    const db = await ensureDb();

    const result = await db.select({
      id: courses.id,
      gradeId: courses.gradeId,
      title: courses.title,
      description: courses.description,
      coverUrl: courses.coverUrl,
      videoUrl: courses.videoUrl,
      classroomId: courses.classroomId,
      duration: courses.duration,
      sortOrder: courses.sortOrder,
      semester: courses.semester,
      isActive: courses.isActive,
      isFree: courses.isFree,
      gradeName: grades.name,
      gradeCode: grades.code,
      textbookName: textbooks.name,
      subjectName: subjects.name,
    })
      .from(courses)
      .leftJoin(grades, eq(courses.gradeId, grades.id))
      .leftJoin(textbooks, eq(grades.textbookId, textbooks.id))
      .leftJoin(subjects, eq(textbooks.subjectId, subjects.id))
      .orderBy(asc(courses.sortOrder));

    const filtered = gradeId ? result.filter((c: { gradeId: string }) => c.gradeId === gradeId) : result;

    return NextResponse.json({ courses: filtered });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/courses
 * Create a new course
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gradeId, title, description, coverUrl, videoUrl, classroomId, duration, sortOrder, semester, isFree } = body;

    if (!gradeId || !title) {
      return NextResponse.json(
        { error: 'gradeId and title are required' },
        { status: 400 }
      );
    }

    const db = await ensureDb();

    const newCourse: NewCourse = {
      gradeId,
      title,
      description: description || '',
      coverUrl: coverUrl || '',
      videoUrl: videoUrl || '',
      classroomId: classroomId || '',
      duration: duration || 0,
      sortOrder: sortOrder || 0,
      semester: semester || 'full',
      isActive: 1,
      isFree: isFree ? 1 : 0,
      createdAt: Date.now(),
    };

    await db.insert(courses).values(newCourse);

    // Save database to file
    saveDatabase();

    return NextResponse.json({
      success: true,
      message: 'Course created successfully',
    });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
}
