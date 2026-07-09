import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { textbooks, subjects, grades, eq, asc } from '@/lib/db/schema';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/** GET /api/admin/textbooks - 获取所有教材（含科目名和年级数量），支持?subjectId过滤 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');

    const db = await ensureDb();

    let query = db.select({
      id: textbooks.id,
      subjectId: textbooks.subjectId,
      name: textbooks.name,
      publisher: textbooks.publisher,
      gradeRange: textbooks.gradeRange,
      description: textbooks.description,
      coverUrl: textbooks.coverUrl,
      sortOrder: textbooks.sortOrder,
      isActive: textbooks.isActive,
      subjectName: subjects.name,
    })
    .from(textbooks)
    .leftJoin(subjects, eq(textbooks.subjectId, subjects.id));

    let result;
    if (subjectId) {
      result = await query.where(eq(textbooks.subjectId, subjectId)).orderBy(asc(textbooks.sortOrder));
    } else {
      result = await query.orderBy(asc(subjects.sortOrder), asc(textbooks.sortOrder));
    }

    // 统计每个教材的年级数量
    const allGrades = await db.select({ textbookId: grades.textbookId }).from(grades);
    const gradeCountMap: Record<string, number> = {};
    for (const g of allGrades) {
      gradeCountMap[g.textbookId] = (gradeCountMap[g.textbookId] || 0) + 1;
    }

    const finalResult = result.map(t => ({
      ...t,
      gradeCount: gradeCountMap[t.id] || 0,
    }));

    return NextResponse.json({ textbooks: finalResult });
  } catch (error) {
    console.error('Error fetching textbooks:', error);
    return NextResponse.json({ error: 'Failed to fetch textbooks' }, { status: 500 });
  }
}

/** POST /api/admin/textbooks - 新增教材 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subjectId, name, publisher, gradeRange, description, sortOrder, isActive } = body;

    if (!subjectId || !name) {
      return NextResponse.json({ error: '所属科目和名称为必填项' }, { status: 400 });
    }

    const db = await ensureDb();
    const id = `textbook-${Date.now()}`;
    const result = await db.insert(textbooks).values({
      id,
      subjectId,
      name,
      publisher: publisher || null,
      gradeRange: gradeRange || null,
      description: description || null,
      sortOrder: sortOrder ?? 0,
      isActive: isActive ?? 1,
    }).returning();

    return NextResponse.json({ success: true, textbook: result[0] });
  } catch (error: any) {
    console.error('Error creating textbook:', error);
    return NextResponse.json({ error: 'Failed to create textbook' }, { status: 500 });
  }
}

/** PUT /api/admin/textbooks - 更新教材 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, publisher, gradeRange, description, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const db = await ensureDb();
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (publisher !== undefined) updateData.publisher = publisher || null;
    if (gradeRange !== undefined) updateData.gradeRange = gradeRange || null;
    if (description !== undefined) updateData.description = description || null;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await db.update(textbooks).set(updateData).where(eq(textbooks.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating textbook:', error);
    return NextResponse.json({ error: 'Failed to update textbook' }, { status: 500 });
  }
}

/** DELETE /api/admin/textbooks - 删除教材 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const db = await ensureDb();

    // 检查是否有关联年级
    const relatedGrades = await db.select({ id: grades.id })
      .from(grades)
      .where(eq(grades.textbookId, id))
      .limit(1);

    if (relatedGrades.length > 0) {
      return NextResponse.json({ error: '该教材下还有年级，无法删除' }, { status: 409 });
    }

    await db.delete(textbooks).where(eq(textbooks.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting textbook:', error);
    return NextResponse.json({ error: 'Failed to delete textbook' }, { status: 500 });
  }
}
