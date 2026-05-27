import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { grades } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * GET /api/grades?textbookId=xxx
 * Get grades by textbook
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const textbookId = searchParams.get('textbookId');

    if (!textbookId) {
      return NextResponse.json(
        { error: 'textbookId is required' },
        { status: 400 }
      );
    }

    const db = await ensureDb();

    const result = await db.select()
      .from(grades)
      .where(eq(grades.textbookId, textbookId))
      .orderBy(asc(grades.sortOrder));

    // Transform to match expected format with price string
    const formatted = result.map(g => ({
      ...g,
      price: g.price?.toString() || '199',
      originalPrice: g.originalPrice?.toString(),
    }));

    return NextResponse.json({ grades: formatted });
  } catch (error) {
    console.error('Error fetching grades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grades' },
      { status: 500 }
    );
  }
}
