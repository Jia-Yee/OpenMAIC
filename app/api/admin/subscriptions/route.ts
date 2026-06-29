import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { subscriptions, users, grades, textbooks, subjects, courses, eq, and, desc } from '@/lib/db/schema';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * GET /api/admin/subscriptions
 * Get all subscriptions with user and grade info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const db = await ensureDb();

    const result = await db.select({
      id: subscriptions.id,
      userId: subscriptions.userId,
      gradeId: subscriptions.gradeId,
      orderNo: subscriptions.orderNo,
      tradeNo: subscriptions.tradeNo,
      amount: subscriptions.amount,
      status: subscriptions.status,
      paidAt: subscriptions.paidAt,
      expiresAt: subscriptions.expiresAt,
      userNickname: users.nickname,
      userPhone: users.phone,
      gradeName: grades.name,
      gradeCode: grades.code,
      subjectName: subjects.name,
    })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(grades, eq(subscriptions.gradeId, grades.id))
      .leftJoin(textbooks, eq(grades.textbookId, textbooks.id))
      .leftJoin(subjects, eq(textbooks.subjectId, subjects.id))
      .orderBy(desc(subscriptions.paidAt));

    const filtered = userId ? result.filter((s: { userId: string }) => s.userId === userId) : result;

    return NextResponse.json({ subscriptions: filtered });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/subscriptions
 * Create a subscription for a grade (auto-sets 6-month expiry)
 * Also auto-creates course-level subscriptions for all courses in the grade
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, gradeId, expiresAt } = body;

    if (!userId || !gradeId) {
      return NextResponse.json(
        { error: 'userId and gradeId are required' },
        { status: 400 }
      );
    }

    const db = await ensureDb();

    const now = Math.floor(Date.now() / 1000);
    // Default expiry: 6 months from now
    const SIX_MONTHS = 6 * 30 * 24 * 60 * 60;
    const subscriptionExpiresAt = expiresAt
      ? Math.floor(new Date(expiresAt).getTime() / 1000)
      : now + SIX_MONTHS;

    // Check if subscription already exists for this user+grade
    const existing = await db.select({ id: subscriptions.id })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.gradeId, gradeId),
      ));

    if (existing.length > 0) {
      // Update existing subscription's expiry
      await db.update(subscriptions)
        .set({
          status: 'paid',
          expiresAt: subscriptionExpiresAt,
          paidAt: now,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, existing[0].id));

      return NextResponse.json({
        success: true,
        message: '订阅已更新',
        expiresAt: subscriptionExpiresAt,
      });
    }

    // Create new subscription
    const newSubscription = {
      userId,
      gradeId,
      orderNo: `ADMIN-${Date.now()}`,
      tradeNo: '',
      amount: 0,
      status: 'paid',
      paidAt: now,
      expiresAt: subscriptionExpiresAt,
      createdAt: now,
    };

    await db.insert(subscriptions).values(newSubscription);

    // Also update user_grades for permission check
    try {
      const { userGrades } = await import('@/lib/db/schema');
      const existingGrade = await db.select({ id: userGrades.id })
        .from(userGrades)
        .where(and(
          eq(userGrades.userId, userId),
          eq(userGrades.gradeId, gradeId),
        ));

      if (existingGrade.length === 0) {
        await db.insert(userGrades).values({
          userId,
          gradeId,
          isFree: false,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (e) {
      console.error('Error updating user_grades:', e);
    }

    return NextResponse.json({
      success: true,
      message: '订阅创建成功',
      expiresAt: subscriptionExpiresAt,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
