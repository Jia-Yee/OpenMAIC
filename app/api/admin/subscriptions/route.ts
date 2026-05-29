import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { subscriptions, users, grades, textbooks, subjects } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const db = await ensureDb();

    let query = db.select({
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

    if (userId) {
      query = query.where(eq(subscriptions.userId, userId));
    }

    const result = await query;

    return NextResponse.json({ subscriptions: result });
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
 * Create a new subscription
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, gradeId, orderNo, tradeNo, amount, status, expiresAt } = body;

    if (!userId || !gradeId) {
      return NextResponse.json(
        { error: 'userId and gradeId are required' },
        { status: 400 }
      );
    }

    const db = await ensureDb();

    const newSubscription = {
      userId,
      gradeId,
      orderNo: orderNo || `ADMIN-${Date.now()}`,
      tradeNo: tradeNo || '',
      amount: amount || 0,
      status: status || 'active',
      paidAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    const result = await db.insert(subscriptions).values(newSubscription);

    return NextResponse.json({
      success: true,
      message: 'Subscription created successfully',
      subscription: { ...newSubscription, id: result.lastInsertRowId }
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
