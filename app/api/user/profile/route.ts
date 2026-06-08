import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { users, subscriptions, courses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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
 * GET /api/user/courses
 * Get user's enrolled courses with progress
 * 
 * Headers:
 *   Authorization: Bearer <token>
 */
export async function GET(request: Request) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header missing or invalid' },
        { status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    const db = await ensureDb();
    const userId = decoded.userId;
    
    // Get user's active subscriptions
    const userSubscriptions = await db.select({
      gradeId: subscriptions.gradeId,
      expiresAt: subscriptions.expiresAt,
    })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
      ));
    
    const activeGradeIds = userSubscriptions
      .filter(s => new Date(s.expiresAt) > new Date())
      .map(s => s.gradeId);
    
    // Get free courses (not requiring subscription)
    const freeCourses = await db.select({
      id: courses.id,
      title: courses.title,
      description: courses.description,
      gradeId: courses.gradeId,
      isFree: courses.isFree,
      sortOrder: courses.sortOrder,
    })
      .from(courses)
      .where(eq(courses.isFree, true));
    
    // Get subscribed courses
    const subscribedCourses = activeGradeIds.length > 0
      ? await db.select({
          id: courses.id,
          title: courses.title,
          description: courses.description,
          gradeId: courses.gradeId,
          isFree: courses.isFree,
          sortOrder: courses.sortOrder,
        })
          .from(courses)
          .where(courses.gradeId.in(activeGradeIds))
      : [];
    
    // Combine and deduplicate
    const courseSet = new Map();
    [...freeCourses, ...subscribedCourses].forEach(course => {
      courseSet.set(course.id, course);
    });
    
    const userCourses = Array.from(courseSet.values()).sort((a, b) => a.sortOrder - b.sortOrder);
    
    return NextResponse.json({
      success: true,
      courses: userCourses,
      subscribedGrades: activeGradeIds.length,
    });
  } catch (error) {
    console.error('Error fetching user courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses', success: false },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/profile
 * Get user profile info
 * 
 * Headers:
 *   Authorization: Bearer <token>
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header missing or invalid' },
        { status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    const db = await ensureDb();
    const userId = decoded.userId;
    
    // Get user info
    const userResults = await db.select({
      id: users.id,
      nickname: users.nickname,
      avatarUrl: users.avatarUrl,
      phone: users.phone,
      lastLoginAt: users.lastLoginAt,
    })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!userResults[0]) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get active subscriptions count
    const activeSubscriptions = await db.select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
      ));
    
    const expiredCount = activeSubscriptions.filter(s => new Date(s.expiresAt) < new Date()).length;
    const validCount = activeSubscriptions.length - expiredCount;
    
    return NextResponse.json({
      success: true,
      user: {
        ...userResults[0],
        subscriptionCount: validCount,
        totalSubscriptions: activeSubscriptions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile', success: false },
      { status: 500 }
    );
  }
}
