import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { subjects } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { initDb } from '@/lib/db';

// Initialize database on first request
let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * GET /api/subjects
 * Get all active subjects
 */
export async function GET() {
  try {
    const db = await ensureDb();

    const result = await db.select()
      .from(subjects)
      .where(eq(subjects.isActive, true))
      .orderBy(asc(subjects.sortOrder));

    return NextResponse.json({ subjects: result });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}
