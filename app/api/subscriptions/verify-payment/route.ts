import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { subscriptions, eq } from '@/lib/db/schema';
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
 * POST /api/subscriptions/verify-payment
 * Verify payment and activate subscription
 */
export async function POST(request: Request) {
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

    const body = await request.json();
    const { orderNo } = body;

    if (!orderNo) {
      return NextResponse.json({ error: 'orderNo is required' }, { status: 400 });
    }

    const db = await ensureDb();

    // Get subscription
    const sub = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.orderNo, orderNo))
      .limit(1);

    if (!sub[0]) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (sub[0].userId !== payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update subscription to paid
    await db.update(subscriptions)
      .set({
        status: 'paid',
        paidAt: Math.floor(Date.now() / 1000),
      })
      .where(eq(subscriptions.id, sub[0].id));

    return NextResponse.json({
      success: true,
      subscriptionId: sub[0].id,
      status: 'paid',
      expiresAt: sub[0].expiresAt,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
