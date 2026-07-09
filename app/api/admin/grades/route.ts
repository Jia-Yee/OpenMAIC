import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { grades, textbooks, subjects, courses, eq, asc } from '@/lib/db/schema';

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
    return NextResponse.json({ error: 'Failed to fetch grades' }, { status: 500 });
  }
}

/**
 * POST /api/admin/grades
 * 新增年级
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { textbookId, name, code, description, price, sortOrder, isActive } = body;

    if (!textbookId || !name) {
      return NextResponse.json({ error: '所属教材和名称为必填项' }, { status: 400 });
    }

    const db = await ensureDb();
    const id = `grade-${Date.now()}`;
    const result = await db.insert(grades).values({
      id,
      textbookId,
      name,
      code: code || null,
      description: description || null,
      price: price || '0',
      sortOrder: sortOrder ?? 0,
      isActive: isActive ?? 1,
    }).returning();

    return NextResponse.json({ success: true, grade: result[0] });
  } catch (error) {
    console.error('Error creating grade:', error);
    return NextResponse.json({ error: 'Failed to create grade' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/grades
 * 更新年级信息
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { gradeId, name, code, description, price, treasureClassroomId, treasurePoints, sortOrder, isActive } = body;

    if (!gradeId) {
      return NextResponse.json({ error: 'Missing gradeId' }, { status: 400 });
    }

    const db = await ensureDb();

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code || null;
    if (description !== undefined) updateData.description = description || null;
    if (price !== undefined) updateData.price = price;
    if (treasureClassroomId !== undefined) updateData.treasureClassroomId = treasureClassroomId || null;
    if (treasurePoints !== undefined) updateData.treasurePoints = treasurePoints;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await db.update(grades).set(updateData).where(eq(grades.id, gradeId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating grade:', error);
    return NextResponse.json({ error: 'Failed to update grade' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/grades
 * 删除年级
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const db = await ensureDb();

    // 检查是否有关联课程
    const relatedCourses = await db.select({ id: courses.id })
      .from(courses)
      .where(eq(courses.gradeId, id))
      .limit(1);

    if (relatedCourses.length > 0) {
      return NextResponse.json({ error: '该年级下还有课程，无法删除' }, { status: 409 });
    }

    await db.delete(grades).where(eq(grades.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting grade:', error);
    return NextResponse.json({ error: 'Failed to delete grade' }, { status: 500 });
  }
}
