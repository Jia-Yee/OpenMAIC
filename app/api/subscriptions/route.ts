import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { subscriptions, grades } from '@/lib/db/schema';
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
 * GET /api/subscriptions
 * Get user's subscriptions
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = await ensureDb();

    const result = await db
      .select({
        id: subscriptions.id,
        gradeId: subscriptions.gradeId,
        status: subscriptions.status,
        orderNo: subscriptions.orderNo,
        amount: subscriptions.amount,
        paidAt: subscriptions.paidAt,
        expiresAt: subscriptions.expiresAt,
        createdAt: subscriptions.createdAt,
        gradeName: grades.name,
      })
      .from(subscriptions)
      .leftJoin(grades, eq(subscriptions.gradeId, grades.id))
      .where(eq(subscriptions.userId, payload.userId));

    return NextResponse.json({ subscriptions: result });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}
