import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb, autoSaveDb } from '@/lib/db';
import { userPoints, grades, eq, and } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * GET /api/user/points?userId=xxx
 * Get user's total points and points breakdown
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const db = await ensureDb();

    // Get total points
    const totalResult = await db.select({
      total: sql<number>`COALESCE(SUM(${userPoints.points}), 0)`,
    })
      .from(userPoints)
      .where(eq(userPoints.userId, userId));

    // Get points by grade
    const gradePoints = await db.select({
      gradeId: userPoints.gradeId,
      gradeName: grades.name,
      points: sql<number>`COALESCE(SUM(${userPoints.points}), 0)`,
    })
      .from(userPoints)
      .leftJoin(grades, eq(userPoints.gradeId, grades.id))
      .where(eq(userPoints.userId, userId))
      .groupBy(userPoints.gradeId, grades.name);

    // Get recent points history
    const recentPoints = await db.select()
      .from(userPoints)
      .where(eq(userPoints.userId, userId))
      .orderBy(sql`${userPoints.createdAt} DESC`)
      .limit(20);

    return NextResponse.json({
      success: true,
      totalPoints: totalResult[0]?.total || 0,
      gradePoints,
      recentPoints,
    });
  } catch (error) {
    console.error('Error fetching user points:', error);
    return NextResponse.json(
      { error: 'Failed to fetch points' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/points
 * Award points to user (called when treasure quiz is completed)
 * Body: { userId, gradeId, points, reason }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, gradeId, points, reason } = body;

    if (!userId || !gradeId || !points || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await ensureDb();

    // Check if user already earned treasure points for this grade
    const existing = await db.select()
      .from(userPoints)
      .where(and(
        eq(userPoints.userId, userId),
        eq(userPoints.gradeId, gradeId),
        eq(userPoints.reason, 'treasure_completion'),
      ));

    if (existing.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Already earned treasure points for this grade',
      }, { status: 400 });
    }

    await db.insert(userPoints).values({
      userId,
      gradeId,
      points,
      reason,
      createdAt: Math.floor(Date.now() / 1000),
    } as any);

    autoSaveDb();

    // Get updated total
    const totalResult = await db.select({
      total: sql<number>`COALESCE(SUM(${userPoints.points}), 0)`,
    })
      .from(userPoints)
      .where(eq(userPoints.userId, userId));

    return NextResponse.json({
      success: true,
      pointsAwarded: points,
      totalPoints: totalResult[0]?.total || 0,
    });
  } catch (error) {
    console.error('Error awarding points:', error);
    return NextResponse.json(
      { error: 'Failed to award points' },
      { status: 500 }
    );
  }
}
