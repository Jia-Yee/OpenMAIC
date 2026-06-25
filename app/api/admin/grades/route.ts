import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb, autoSaveDb } from '@/lib/db';
import { grades, textbooks, subjects, eq, asc } from '@/lib/db/schema';

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
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const textbookId = searchParams.get('textbookId');

    const db = await ensureDb();

    const result = await db.select({
      id: grades.id,
      textbookId: grades.textbookId,
      name: grades.name,
      code: grades.code,
      description: grades.description,
      coverUrl: grades.coverUrl,
      price: grades.price,
      originalPrice: grades.originalPrice,
      treasureClassroomId: grades.treasureClassroomId,
      treasurePoints: grades.treasurePoints,
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

    const filtered = textbookId ? result.filter((g: { textbookId: string }) => g.textbookId === textbookId) : result;

    return NextResponse.json({ grades: filtered });
  } catch (error) {
    console.error('Error fetching grades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grades' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/grades
 * Update grade treasure settings
 * Body: { gradeId, treasureClassroomId?, treasurePoints? }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { gradeId, treasureClassroomId, treasurePoints } = body;

    if (!gradeId) {
      return NextResponse.json({ error: 'Missing gradeId' }, { status: 400 });
    }

    const db = await ensureDb();

    const updateData: Record<string, any> = {};
    if (treasureClassroomId !== undefined) updateData.treasureClassroomId = treasureClassroomId || null;
    if (treasurePoints !== undefined) updateData.treasurePoints = treasurePoints;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await db.update(grades)
      .set(updateData)
      .where(eq(grades.id, gradeId));

    autoSaveDb();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating grade:', error);
    return NextResponse.json(
      { error: 'Failed to update grade' },
      { status: 500 }
    );
  }
}
