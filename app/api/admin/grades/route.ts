import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { grades, textbooks, subjects } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * GET /api/admin/grades
 * Get all grades with textbook and subject info
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const textbookId = searchParams.get('textbookId');

    const db = await ensureDb();

    let query = db.select({
      id: grades.id,
      textbookId: grades.textbookId,
      name: grades.name,
      code: grades.code,
      description: grades.description,
      coverUrl: grades.coverUrl,
      price: grades.price,
      originalPrice: grades.originalPrice,
      sortOrder: grades.sortOrder,
      isActive: grades.isActive,
      textbookName: textbooks.name,
      subjectId: subjects.id,
      subjectName: subjects.name,
    })
      .from(grades)
      .leftJoin(textbooks, eq(grades.textbookId, textbooks.id))
      .leftJoin(subjects, eq(textbooks.subjectId, subjects.id))
      .orderBy(asc(grades.sortOrder));

    if (textbookId) {
      query = query.where(eq(grades.textbookId, textbookId));
    }

    const result = await query;

    return NextResponse.json({ grades: result });
  } catch (error) {
    console.error('Error fetching grades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grades' },
      { status: 500 }
    );
  }
}
