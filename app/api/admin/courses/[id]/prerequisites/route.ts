import { NextResponse } from 'next/server';
import { getDb, initDb, autoSaveDb } from '@/lib/db';
import { coursePrerequisites, courses, eq, and } from '@/lib/db/schema';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * GET /api/admin/courses/{id}/prerequisites
 * Get prerequisites for a course
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await ensureDb();

    const prereqs = await db.select({
      id: coursePrerequisites.id,
      prerequisiteId: coursePrerequisites.prerequisiteId,
      prerequisiteTitle: courses.title,
    })
      .from(coursePrerequisites)
      .leftJoin(courses, eq(coursePrerequisites.prerequisiteId, courses.id))
      .where(eq(coursePrerequisites.courseId, id));

    return NextResponse.json({
      success: true,
      prerequisites: prereqs,
    });
  } catch (error) {
    console.error('Error fetching prerequisites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prerequisites', success: false },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/courses/{id}/prerequisites
 * Add prerequisites to a course
 * 
 * Body: { prerequisiteIds: string[] }
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { prerequisiteIds } = body;

    if (!prerequisiteIds || !Array.isArray(prerequisiteIds)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid prerequisiteIds',
      }, { status: 400 });
    }

    const db = await ensureDb();

    for (const prereqId of prerequisiteIds) {
      if (await hasCircularDependency(db, id, prereqId)) {
        return NextResponse.json({
          success: false,
          error: 'Adding this prerequisite would create a circular dependency',
        }, { status: 400 });
      }
    }

    let addedCount = 0;
    for (const prerequisiteId of prerequisiteIds) {
      const existing = await db.select()
        .from(coursePrerequisites)
        .where(and(
          eq(coursePrerequisites.courseId, id),
          eq(coursePrerequisites.prerequisiteId, prerequisiteId)
        ));
      
      if (existing.length === 0) {
        await db.insert(coursePrerequisites).values({
          courseId: id as any,
          prerequisiteId,
          createdAt: Math.floor(Date.now() / 1000),
        } as any);
        addedCount++;
      }
    }

    // Save database to disk
    autoSaveDb();

    return NextResponse.json({
      success: true,
      message: `Added ${addedCount} prerequisites`,
      added: addedCount,
    });
  } catch (error) {
    console.error('Error adding prerequisites:', error);
    return NextResponse.json(
      { error: 'Failed to add prerequisites', success: false },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/courses/{id}/prerequisites?prerequisiteId=xxx
 * Remove a prerequisite from a course
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const prerequisiteId = url.searchParams.get('prerequisiteId');

    if (!prerequisiteId) {
      return NextResponse.json({
        success: false,
        error: 'Missing prerequisiteId parameter',
      }, { status: 400 });
    }

    const db = await ensureDb();

    const result = await db.delete(coursePrerequisites)
      .where(and(
        eq(coursePrerequisites.courseId, id),
        eq(coursePrerequisites.prerequisiteId, prerequisiteId)
      ));

    // Save database to disk
    autoSaveDb();

    return NextResponse.json({
      success: true,
      deleted: 1,
    });
  } catch (error) {
    console.error('Error removing prerequisite:', error);
    return NextResponse.json(
      { error: 'Failed to remove prerequisite', success: false },
      { status: 500 }
    );
  }
}

async function hasCircularDependency(
  db: ReturnType<typeof getDb>,
  courseId: string,
  prerequisiteId: string,
  visited: Set<string> = new Set()
): Promise<boolean> {
  if (visited.has(courseId)) return false;
  visited.add(courseId);

  if (prerequisiteId === courseId) return true;

  const prereqs = await db.select({ prerequisiteId: coursePrerequisites.prerequisiteId })
    .from(coursePrerequisites)
    .where(eq(coursePrerequisites.courseId, prerequisiteId));

  for (const prereq of prereqs) {
    if (await hasCircularDependency(db, courseId, prereq.prerequisiteId, visited)) {
      return true;
    }
  }

  return false;
}
