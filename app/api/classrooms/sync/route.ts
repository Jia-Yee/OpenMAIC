import { NextResponse } from 'next/server';
import { saveClassroomToServer, updateClassroomOnServer } from '@/lib/server/classroom-server-db';
import { getDb, initDb } from '@/lib/db';
import { courses, grades, textbooks, subjects, eq } from '@/lib/db/schema';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

// POST /api/classrooms/sync - Save or update a classroom on the server
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description, sceneCount, data } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Classroom ID is required',
      }, { status: 400 });
    }

    // Check if classroom exists on server
    const { classroomExistsOnServer } = await import('@/lib/server/classroom-server-db');
    const exists = await classroomExistsOnServer(id);

    if (exists) {
      await updateClassroomOnServer({ id, name, description, sceneCount, data });
    } else {
      await saveClassroomToServer({ id, name, description, sceneCount, data });
    }

    // Also save to SQLite courses table for course management page
    const db = await ensureDb();
    
    // Check if course already exists in SQLite
    const existingCourse = await db.select()
      .from(courses)
      .where(eq(courses.id, id))
      .limit(1);
    
    if (existingCourse.length > 0) {
      // Update existing course
      await db.update(courses)
        .set({
          title: name || 'Untitled',
          description: description || '',
        })
        .where(eq(courses.id, id));
    } else {
      // Create new course with default grade (first grade of math subject)
      let defaultGradeId = '';
      
      try {
        // Try to find a default grade
        const mathSubject = await db.select()
          .from(subjects)
          .where(eq(subjects.code, 'math'))
          .limit(1);
        
        if (mathSubject.length > 0) {
          const textbook = await db.select()
            .from(textbooks)
            .where(eq(textbooks.subjectId, mathSubject[0].id))
            .limit(1);
          
          if (textbook.length > 0) {
            const grade = await db.select()
              .from(grades)
              .where(eq(grades.textbookId, textbook[0].id))
              .limit(1);
            
            if (grade.length > 0) {
              defaultGradeId = grade[0].id;
            }
          }
        }
        
        // Fallback: get any grade
        if (!defaultGradeId) {
          const anyGrade = await db.select().from(grades).limit(1);
          if (anyGrade.length > 0) {
            defaultGradeId = anyGrade[0].id;
          }
        }
      } catch (e) {
        console.error('Failed to get default grade:', e);
      }
      
      if (defaultGradeId) {
        await db.insert(courses).values({
          id,
          gradeId: defaultGradeId,
          title: name || 'Untitled',
          description: description || '',
          duration: 0,
          sortOrder: 0,
          isActive: 1,
          isFree: 0,
          createdAt: Math.floor(Date.now() / 1000),
        });
      } else {
        console.warn('No grade found, skipping course creation in SQLite');
      }
    }

    return NextResponse.json({
      success: true,
      message: exists ? 'Classroom updated' : 'Classroom saved',
    });
  } catch (error) {
    console.error('Failed to save classroom:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save classroom',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
