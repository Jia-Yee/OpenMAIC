import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { courses, grades, textbooks, subjects, classrooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { uploadClassroomData, uploadMediaFile } from '@/lib/server/blob-storage';
import { extractMediaFromClassroom, replaceMediaUrlsInClassroom } from '@/lib/server/media-extractor';

/**
 * POST /api/admin/classrooms/[id]/upload
 * Upload a single classroom with full data to server
 * 
 * Body: {
 *   id: string,
 *   name: string,
 *   description?: string,
 *   sceneCount: number,
 *   data: any (full classroom content including stage and scenes)
 * }
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const classroomId = params.id;
    
    const body = await request.json();
    const { name, description, sceneCount, data } = body;

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'name is required',
      }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);

    // 上传完整数据到 Vercel Blob
    let dataUrl = '';
    if (data && Object.keys(data).length > 0) {
      // 提取媒体文件
      const mediaFiles = extractMediaFromClassroom(data);
      console.log(`Found ${mediaFiles.length} media files to upload`);
      
      // 上传媒体文件并构建媒体URL映射
      const mediaMap: Record<string, string> = {};
      for (const media of mediaFiles) {
        const url = await uploadMediaFile(classroomId, media.filename, media.src);
        mediaMap[media.id] = url;
        console.log(`Uploaded media ${media.id} to ${url}`);
      }
      
      // 将数据URL替换为Blob URL
      const processedData = replaceMediaUrlsInClassroom(data, mediaMap);
      
      // 上传处理后的JSON数据
      dataUrl = await uploadClassroomData(classroomId, processedData);
      console.log(`Uploaded classroom data to Blob: ${dataUrl}`);
    }

    const db = await ensureDb();

    // 只保存元数据到 PostgreSQL
    await db.insert(classrooms).values({
      id: classroomId,
      name: name || 'Untitled',
      description: description,
      sceneCount: sceneCount || 0,
      dataUrl: dataUrl,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: classrooms.id,
      set: {
        name: name || 'Untitled',
        description: description,
        sceneCount: sceneCount || 0,
        dataUrl: dataUrl,
        updatedAt: now,
      },
    });

    // 确保课程记录存在
    const existingCourse = await db.select()
      .from(courses)
      .where(eq(courses.id, classroomId))
      .limit(1);

    if (existingCourse.length === 0) {
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
          title: name || 'Untitled',
          description: description || '',
          classroomId: classroomId,
          duration: 0,
          sortOrder: 0,
          isActive: 1,
          isFree: 0,
          createdAt: now,
        } as any);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Classroom ${classroomId} uploaded successfully`,
      id: classroomId,
    });
  } catch (error) {
    console.error('Error uploading classroom:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to upload classroom',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}