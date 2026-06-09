import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { userGrades, grades, textbooks, subjects, eq, and } from '@/lib/db/schema';
import type { NewUserGrade } from '@/lib/db/schema';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * GET /api/admin/users/[id]/grades
 * Get user's grade permissions
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const db = await ensureDb();

    const userGradesResult = await db.select({
      id: userGrades.id,
      userId: userGrades.userId,
      gradeId: userGrades.gradeId,
      isActive: userGrades.isActive,
      gradeName: grades.name,
      gradeCode: grades.code,
      textbookId: grades.textbookId,
      textbookName: textbooks.name,
      subjectId: subjects.id,
      subjectName: subjects.name,
    })
      .from(userGrades)
      .leftJoin(grades, eq(userGrades.gradeId, grades.id))
      .leftJoin(textbooks, eq(grades.textbookId, textbooks.id))
      .leftJoin(subjects, eq(textbooks.subjectId, subjects.id))
      .where(eq(userGrades.userId, id));

    return NextResponse.json({ userGrades: userGradesResult });
  } catch (error) {
    console.error('Error fetching user grades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user grades' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/[id]/grades
 * Update user's grade permissions
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { gradeIds } = body;

    if (!gradeIds || !Array.isArray(gradeIds)) {
      return NextResponse.json(
        { error: 'gradeIds is required and must be an array' },
        { status: 400 }
      );
    }

    const db = await ensureDb();

    // Begin transaction
    await db.transaction(async (tx: any) => {
      // Delete existing permissions
      await tx.delete(userGrades).where(eq(userGrades.userId, id));

      // Insert new permissions
      const newUserGrades: NewUserGrade[] = gradeIds.map((gradeId: string) => ({
        userId: id,
        gradeId,
        isActive: 1,
      }));

      if (newUserGrades.length > 0) {
        await tx.insert(userGrades).values(newUserGrades);
      }
    });

    return NextResponse.json({ success: true, message: 'Permissions updated successfully' });
  } catch (error) {
    console.error('Error updating user grades:', error);
    return NextResponse.json(
      { error: 'Failed to update user grades' },
      { status: 500 }
    );
  }
}
