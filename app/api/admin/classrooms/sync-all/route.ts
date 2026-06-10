import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { courses, grades, textbooks, subjects, classrooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/admin/classrooms/sync-all
 * Sync classroom metadata to server (without full data content)
 * 
 * Body: {
 *   classrooms: Array<{
 *     id: string,
 *     name: string,
 *     description?: string,
 *     sceneCount: number
 *   }>
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { classrooms: classroomsData } = body;

    if (!classroomsData || !Array.isArray(classroomsData)) {
      return NextResponse.json({
        success: false,
        error: 'classrooms array is required',
      }, { status: 400 });
    }

    const db = await ensureDb();
    let syncedCount = 0;
    let skippedCount = 0;
    const now = Math.floor(Date.now() / 1000);

    for (const classroom of classroomsData) {
      if (!classroom.id) continue;

      try {
        // 只同步元数据，不包含完整的 data 字段
        // data 字段将在首次访问时从 IndexedDB 补充
        await db.insert(classrooms).values({
          id: classroom.id,
          name: classroom.name || 'Untitled',
          description: classroom.description,
          sceneCount: classroom.sceneCount || 0,
          createdAt: now,
          updatedAt: now,
        }).onConflictDoUpdate({
          target: classrooms.id,
          set: {
            name: classroom.name || 'Untitled',
            description: classroom.description,
            sceneCount: classroom.sceneCount || 0,
            updatedAt: now,
          },
        });

        // 确保课程记录存在
        const existingCourse = await db.select()
          .from(courses)
          .where(eq(courses.id, classroom.id))
          .limit(1);

        if (existingCourse.length > 0) {
          await db.update(courses)
            .set({
              title: classroom.name || 'Untitled',
              description: classroom.description || '',
              classroomId: classroom.id,
            })
            .where(eq(courses.id, classroom.id));
        } else {
          let defaultGradeId = '';
          try {
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
              gradeId: defaultGradeId as any,
              title: classroom.name || 'Untitled',
              description: classroom.description || '',
              classroomId: classroom.id,
              duration: 0,
              sortOrder: 0,
              isActive: 1,
              isFree: 0,
              createdAt: now,
            } as any);
          }
        }

        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync classroom ${classroom.id}:`, error);
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} classrooms (metadata only), skipped ${skippedCount}`,
      synced: syncedCount,
      skipped: skippedCount,
    });
  } catch (error) {
    console.error('Error syncing all classrooms:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to sync classrooms',
    }, { status: 500 });
  }
}