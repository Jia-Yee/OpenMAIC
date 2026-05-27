import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { textbooks } from '@/lib/db/schema';
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
 * GET /api/textbooks?subjectId=xxx
 * Get textbooks by subject
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');

    if (!subjectId) {
      return NextResponse.json(
        { error: 'subjectId is required' },
        { status: 400 }
      );
    }

    const db = await ensureDb();

    const result = await db.select()
      .from(textbooks)
      .where(eq(textbooks.subjectId, subjectId))
      .orderBy(asc(textbooks.sortOrder));

    return NextResponse.json({ textbooks: result });
  } catch (error) {
    console.error('Error fetching textbooks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch textbooks' },
      { status: 500 }
    );
  }
}
