import { NextResponse } from 'next/server';
import { listClassroomsFromServer } from '@/lib/server/classroom-server-db';
import { getDb, initDb } from '@/lib/db';
import { courses, grades, subjects, textbooks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * POST /api/admin/classrooms/sync
 * Sync classrooms to courses table
 * 
 * Body: {
 *   gradeId?: string,       // Optional: specific grade to sync to
 *   isFree?: boolean,       // Default: false
 *   classroomIds?: string[] // Optional: specific classroom IDs to sync
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gradeId, isFree = false, classroomIds } = body;

    let allClassrooms = await listClassroomsFromServer();
    
    // Filter classrooms if specific IDs are provided
    const classrooms = classroomIds && classroomIds.length > 0
      ? allClassrooms.filter(c => classroomIds.includes(c.id))
      : allClassrooms;
    
    if (classrooms.length === 0) {
      return NextResponse.json({
        success: true,
        message: classroomIds ? 'No matching classrooms found' : 'No classrooms to sync',
        synced: 0,
        skipped: 0,
      });
    }

    const db = await ensureDb();
    
    // Get default grade if not specified
    let targetGradeId = gradeId;
    if (!targetGradeId) {
      // Find first grade with math subject
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
            targetGradeId = grade[0].id;
          }
        }
      }
      
      // Fallback: get any grade
      if (!targetGradeId) {
        const anyGrade = await db.select().from(grades).limit(1);
        if (anyGrade.length > 0) {
          targetGradeId = anyGrade[0].id;
        }
      }
    }

    if (!targetGradeId) {
      return NextResponse.json({
        success: false,
        error: 'No grade found. Please create a grade first.',
      }, { status: 400 });
    }

    let syncedCount = 0;
    let skippedCount = 0;

    // Get existing course IDs to check for duplicates
    const existingCourses = await db.select({ id: courses.id })
      .from(courses)
      .where(eq(courses.gradeId, targetGradeId));
    const existingIds = new Set(existingCourses.map(c => c.id));

    for (const classroom of classrooms) {
      if (existingIds.has(classroom.id)) {
        skippedCount++;
        continue;
      }

      try {
        await db.insert(courses).values({
          id: classroom.id,
          gradeId: targetGradeId,
          title: classroom.name || 'Untitled',
          description: classroom.description || '',
          duration: 0,
          isActive: true,
          isFree: isFree,
          sortOrder: syncedCount,
        });
        syncedCount++;
      } catch (err) {
        console.error(`Failed to sync classroom ${classroom.id}:`, err);
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} classrooms, skipped ${skippedCount}`,
      synced: syncedCount,
      skipped: skippedCount,
      gradeId: targetGradeId,
    });
  } catch (error) {
    console.error('Error syncing classrooms:', error);
    return NextResponse.json(
      { error: 'Failed to sync classrooms', success: false },
      { status: 500 }
    );
  }
}
