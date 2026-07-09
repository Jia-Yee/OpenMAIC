import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { subjects, textbooks, eq, asc } from '@/lib/db/schema';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/** GET /api/admin/subjects - 获取所有科目（含教材数量） */
export async function GET() {
  try {
    const db = await ensureDb();
    const allSubjects = await db.select().from(subjects).orderBy(asc(subjects.sortOrder));

    // 统计每个科目的教材数量
    const allTextbooks = await db.select({
      subjectId: textbooks.subjectId,
    }).from(textbooks);

    const textbookCountMap: Record<string, number> = {};
    for (const t of allTextbooks) {
      textbookCountMap[t.subjectId] = (textbookCountMap[t.subjectId] || 0) + 1;
    }

    const result = allSubjects.map((s: any) => ({
      ...s,
      textbookCount: textbookCountMap[s.id] || 0,
    }));

    return NextResponse.json({ subjects: result });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
  }
}

/** POST /api/admin/subjects - 新增科目 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, description, sortOrder, isActive } = body;

    if (!name || !code) {
      return NextResponse.json({ error: '名称和代码为必填项' }, { status: 400 });
    }

    const db = await ensureDb();
    const id = `subject-${code}`;
    const result = await db.insert(subjects).values({
      id,
      name,
      code,
      description: description || null,
      sortOrder: sortOrder ?? 0,
      isActive: isActive ?? 1,
    }).returning();

    return NextResponse.json({ success: true, subject: result[0] });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: '科目代码已存在' }, { status: 409 });
    }
    console.error('Error creating subject:', error);
    return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 });
  }
}

/** PUT /api/admin/subjects - 更新科目 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, code, description, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const db = await ensureDb();
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (description !== undefined) updateData.description = description || null;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await db.update(subjects).set(updateData).where(eq(subjects.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating subject:', error);
    return NextResponse.json({ error: 'Failed to update subject' }, { status: 500 });
  }
}

/** DELETE /api/admin/subjects - 删除科目 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const db = await ensureDb();

    // 检查是否有关联教材
    const relatedTextbooks = await db.select({ id: textbooks.id })
      .from(textbooks)
      .where(eq(textbooks.subjectId, id))
      .limit(1);

    if (relatedTextbooks.length > 0) {
      return NextResponse.json({ error: '该科目下还有教材，无法删除' }, { status: 409 });
    }

    await db.delete(subjects).where(eq(subjects.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting subject:', error);
    return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 });
  }
}
