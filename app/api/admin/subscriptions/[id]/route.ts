import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { subscriptions, userGrades, eq, and } from '@/lib/db/schema';

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

    const updateData: any = { updatedAt: Math.floor(Date.now() / 1000) };
    if (body.status !== undefined) updateData.status = body.status;
    if (body.expiresAt !== undefined) {
      // expiresAt is a unix timestamp (integer seconds)
      updateData.expiresAt = typeof body.expiresAt === 'number'
        ? body.expiresAt
        : Math.floor(new Date(body.expiresAt).getTime() / 1000);
    }
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

    // Get subscription info before deleting
    const subResult = await db.select({ userId: subscriptions.userId, gradeId: subscriptions.gradeId })
      .from(subscriptions)
      .where(eq(subscriptions.id, id));

    // Delete subscription
    await db.delete(subscriptions)
      .where(eq(subscriptions.id, id));

    // Also remove from user_grades
    if (subResult.length > 0) {
      try {
        await db.delete(userGrades)
          .where(and(
            eq(userGrades.userId, subResult[0].userId),
            eq(userGrades.gradeId, subResult[0].gradeId),
          ));
      } catch (e) {
        console.error('Error removing user_grades:', e);
      }
    }

    return NextResponse.json({ success: true, message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}
