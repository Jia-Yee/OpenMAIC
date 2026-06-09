import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { learningProgress, courses, eq, and, like } from '@/lib/db/schema';
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
 * GET /api/user/progress?courseId=xxx
 * Get learning progress for a specific course
 * 
 * Headers:
 *   Authorization: Bearer <token>
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({
        success: true,
        progress: 0,
        completed: false,
        stars: 0,
      });
    }
    
    const db = await ensureDb();
    const userId = decoded.userId;
    
    const results = await db.select({
      progress: learningProgress.progress,
      completed: learningProgress.completed,
      stars: learningProgress.stars,
    })
      .from(learningProgress)
      .where(and(
        eq(learningProgress.userId, userId),
        eq(learningProgress.courseId, courseId || ''),
      ))
      .limit(1);
    
    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        progress: 0,
        completed: false,
        stars: 0,
      });
    }
    
    return NextResponse.json({
      success: true,
      progress: results[0].progress,
      completed: results[0].completed,
      stars: results[0].stars,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress', success: false },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/progress
 * Update learning progress
 * 
 * Body: { courseId: string, progress: number, completed?: boolean, stars?: number }
 * Headers:
 *   Authorization: Bearer <token>
 */
export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required', success: false },
        { status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token', success: false },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { courseId, progress, completed, stars } = body;
    
    if (!courseId || progress === undefined) {
      return NextResponse.json(
        { error: 'courseId and progress are required', success: false },
        { status: 400 }
      );
    }
    
    const db = await ensureDb();
    const userId = decoded.userId;
    
    // Check if progress exists
    const existing = await db.select()
      .from(learningProgress)
      .where(and(
        eq(learningProgress.userId, userId),
        eq(learningProgress.courseId, courseId),
      ))
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing progress
      await db.update(learningProgress)
        .set({
          progress: Math.min(100, Math.max(0, progress)),
          completed: completed !== undefined ? completed : existing[0].completed,
          stars: stars !== undefined ? Math.min(3, Math.max(0, stars)) : existing[0].stars,
          lastAccessAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(and(
          eq(learningProgress.userId, userId),
          eq(learningProgress.courseId, courseId),
        ));
    } else {
      // Create new progress record
      await db.insert(learningProgress).values({
        userId,
        courseId,
        progress: Math.min(100, Math.max(0, progress)),
        completed: completed ? 1 : 0,
        stars: stars || 0,
        lastAccessAt: Math.floor(Date.now() / 1000),
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Progress updated',
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress', success: false },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/progress/all?gradeId=xxx
 * Get all learning progress for a user in a grade
 * 
 * Headers:
 *   Authorization: Bearer <token>
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gradeId } = body;
    
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({
        success: true,
        progress: [],
      });
    }
    
    const db = await ensureDb();
    const userId = decoded.userId;
    
    const results = await db.select({
      courseId: learningProgress.courseId,
      courseTitle: courses.title,
      progress: learningProgress.progress,
      completed: learningProgress.completed,
      stars: learningProgress.stars,
      lastAccessAt: learningProgress.lastAccessAt,
    })
      .from(learningProgress)
      .leftJoin(courses, eq(learningProgress.courseId, courses.id))
      .where(and(
        eq(learningProgress.userId, userId),
        gradeId ? eq(courses.gradeId, gradeId) : like(courses.gradeId, '%'),
      ));
    
    const progressMap: Record<string, { progress: number | null; completed: boolean | null; stars: number | null }> = {};
    results.forEach((r: { courseId: string; progress: number | null; completed: number | null; stars: number | null }) => {
      progressMap[r.courseId] = {
        progress: r.progress,
        completed: r.completed ? true : r.completed === null ? null : false,
        stars: r.stars,
      };
    });
    
    return NextResponse.json({
      success: true,
      progress: progressMap,
    });
  } catch (error) {
    console.error('Error fetching all progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress', success: false },
      { status: 500 }
    );
  }
}
