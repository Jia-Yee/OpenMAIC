import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { subscriptions, eq } from '@/lib/db/schema';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * GET /api/admin/subscriptions/[id]
 * Get subscription by ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const db = await ensureDb();

    const result = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id));

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ subscription: result[0] });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/subscriptions/[id]
 * Update subscription
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const db = await ensureDb();

    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.expiresAt !== undefined) updateData.expiresAt = new Date(body.expiresAt);
    if (body.amount !== undefined) updateData.amount = body.amount;

    await db.update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, id));

    return NextResponse.json({ success: true, message: 'Subscription updated successfully' });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/subscriptions/[id]
 * Delete subscription
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const db = await ensureDb();

    await db.update(subscriptions)
      .set({
        status: 'expired',
      })
      .where(eq(subscriptions.id, id));

    return NextResponse.json({ success: true, message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}
