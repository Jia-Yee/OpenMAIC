import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { subscriptions, eq, and } from '@/lib/db/schema';
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
 * GET /api/user/subscriptions
 * Get user's active subscriptions
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const decoded = verifyToken(token);

    if (!decoded?.userId) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const db = await ensureDb();
    const now = Math.floor(Date.now() / 1000);

    const userSubscriptions = await db.select({
      id: subscriptions.id,
      gradeId: subscriptions.gradeId,
      status: subscriptions.status,
      expiresAt: subscriptions.expiresAt,
    })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, decoded.userId),
        eq(subscriptions.status, 'paid'),
      ));

    // Filter to only active (not expired) subscriptions
    const activeSubscriptions = userSubscriptions.filter(s => s.expiresAt > now);

    return NextResponse.json({
      success: true,
      subscriptions: activeSubscriptions,
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ success: false, error: '获取订阅失败' }, { status: 500 });
  }
}
