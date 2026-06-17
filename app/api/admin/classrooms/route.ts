import { NextResponse } from 'next/server';
import { listClassroomsFromServer, saveClassroomToServer, updateClassroomOnServer, classroomExistsOnServer } from '@/lib/server/classroom-server-db';

/**
 * GET /api/admin/classrooms
 * Get all classrooms from server storage
 */
export async function GET() {
  try {
    const classrooms = await listClassroomsFromServer();
    return NextResponse.json({ classrooms });
  } catch (error) {
    console.error('Error fetching classrooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classrooms' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/classrooms
 * Create or update a classroom in the database
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description, sceneCount } = body;
    
    if (!id || !name) {
      return NextResponse.json({
        success: false,
        error: 'Classroom ID and name are required',
      }, { status: 400 });
    }
    
    const exists = await classroomExistsOnServer(id);
    
    const dataUrl = `classrooms/${id}/manifest.json`;
    
    if (exists) {
      await updateClassroomOnServer({ id, name, description: description || '', sceneCount: sceneCount || 0, dataUrl });
    } else {
      await saveClassroomToServer({ id, name, description: description || '', sceneCount: sceneCount || 0, dataUrl });
    }
    
    return NextResponse.json({
      success: true,
      message: `Classroom "${name}" saved successfully`,
    });
  } catch (error) {
    console.error('Error saving classroom:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save classroom',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
