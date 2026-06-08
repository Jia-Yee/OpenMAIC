import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { courses, subscriptions, coursePrerequisites } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * GET /api/user/courses?gradeId=xxx
 * Get user's available courses with unlock status
 * 
 * Headers:
 *   Authorization: Bearer <token>
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gradeId = searchParams.get('gradeId');
    
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const decoded = verifyToken(token);
    
    const db = await ensureDb();
    const userId = decoded?.userId;
    
    // Get user's active subscriptions if logged in
    let activeGradeIds: string[] = [];
    if (userId) {
      const userSubscriptions = await db.select({
        gradeId: subscriptions.gradeId,
        expiresAt: subscriptions.expiresAt,
      })
        .from(subscriptions)
        .where(and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active'),
        ));
      
      activeGradeIds = userSubscriptions
        .filter(s => new Date(s.expiresAt) > new Date())
        .map(s => s.gradeId);
    }
    
    if (!gradeId) {
      return NextResponse.json(
        { error: 'gradeId is required' },
        { status: 400 }
      );
    }
    
    // Get courses for the grade
    const coursesResult = await db.select({
      id: courses.id,
      title: courses.title,
      description: courses.description,
      coverUrl: courses.coverUrl,
      duration: courses.duration,
      sortOrder: courses.sortOrder,
      isFree: courses.isFree,
      classroomId: courses.classroomId,
      gradeId: courses.gradeId,
    })
      .from(courses)
      .where(eq(courses.gradeId, gradeId))
      .orderBy(asc(courses.sortOrder));
    
    // Fetch prerequisites for each course
    const coursesWithPrerequisites = await Promise.all(
      coursesResult.map(async (course) => {
        const prereqs = await db.select({
          prerequisiteId: coursePrerequisites.prerequisiteId,
        })
          .from(coursePrerequisites)
          .where(eq(coursePrerequisites.courseId, course.id));
        
        return {
          ...course,
          prerequisites: prereqs.map(p => p.prerequisiteId),
        };
      })
    );
    
    // Determine unlock status for each course
    const coursesWithUnlockStatus = coursesWithPrerequisites.map(course => {
      // Free courses are always unlocked
      if (course.isFree) {
        return { ...course, unlocked: true };
      }
      
      // If user is logged in and has subscription, course is unlocked
      if (userId && activeGradeIds.includes(course.gradeId)) {
        return { ...course, unlocked: true };
      }
      
      // Otherwise, check if course has no prerequisites (could be a trial)
      if (course.prerequisites.length === 0) {
        return { ...course, unlocked: false };
      }
      
      return { ...course, unlocked: false };
    });
    
    return NextResponse.json({
      success: true,
      courses: coursesWithUnlockStatus,
      isLoggedIn: !!userId,
      hasSubscription: activeGradeIds.length > 0,
    });
  } catch (error) {
    console.error('Error fetching user courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses', success: false },
      { status: 500 }
    );
  }
}
