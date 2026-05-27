import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { subscriptions, grades } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';
import { nanoid } from 'nanoid';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * POST /api/subscriptions/create-order
 * Create a new subscription order
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
    const { gradeId, mock } = body;

    if (!gradeId) {
      return NextResponse.json({ error: 'gradeId is required' }, { status: 400 });
    }

    const db = await ensureDb();

    // Get grade info
    const grade = await db.select().from(grades).where(eq(grades.id, gradeId)).limit(1);
    if (!grade[0]) {
      return NextResponse.json({ error: 'Grade not found' }, { status: 404 });
    }

    const orderNo = `ORD${Date.now()}${nanoid(6)}`;
    const amount = grade[0].price || 199;

    // Create subscription record
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await db.insert(subscriptions).values({
      userId: payload.userId,
      gradeId,
      orderNo,
      amount,
      status: 'pending',
      expiresAt,
    });

    // Mock mode: auto-complete payment
    if (mock) {
      return NextResponse.json({
        orderNo,
        amount,
        status: 'pending',
        mock: true,
      });
    }

    // In production, this would return WeChat Pay parameters
    return NextResponse.json({
      orderNo,
      amount,
      status: 'pending',
      // WeChat Pay params would go here
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
