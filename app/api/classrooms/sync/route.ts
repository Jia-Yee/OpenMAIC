import { NextResponse } from 'next/server';
import { saveClassroomToServer, updateClassroomOnServer } from '@/lib/server/classroom-server-db';

// POST /api/classrooms/sync - Save or update a classroom on the server
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description, sceneCount, data } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Classroom ID is required',
      }, { status: 400 });
    }

    // Check if classroom exists
    const { classroomExistsOnServer } = await import('@/lib/server/classroom-server-db');
    const exists = await classroomExistsOnServer(id);

    if (exists) {
      await updateClassroomOnServer({ id, name, description, sceneCount, data });
    } else {
      await saveClassroomToServer({ id, name, description, sceneCount, data });
    }

    return NextResponse.json({
      success: true,
      message: exists ? 'Classroom updated' : 'Classroom saved',
    });
  } catch (error) {
    console.error('Failed to save classroom:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save classroom',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
