import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { grades, asc, eq } from '@/lib/db/schema';

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
 * If no textbookId, return all grades
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const textbookId = searchParams.get('textbookId');

    const db = await ensureDb();

    let result;
    if (textbookId) {
      result = await db.select()
        .from(grades)
        .where(eq(grades.textbookId, textbookId))
        .orderBy(asc(grades.sortOrder));
    } else {
      result = await db.select()
        .from(grades)
        .orderBy(asc(grades.sortOrder));
    }

    // Transform to match expected format with price string
    const formatted = result.map((g: { price?: number; originalPrice?: number }) => ({
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
