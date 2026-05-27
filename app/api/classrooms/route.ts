import { NextResponse } from 'next/server';
import { listClassroomsFromServer, getClassroomFromServer } from '@/lib/server/classroom-server-db';

// GET /api/classrooms - List all classrooms from server
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('id');

    // If ID is provided, return specific classroom
    if (classroomId) {
      const classroom = await getClassroomFromServer(classroomId);
      if (!classroom) {
        return NextResponse.json({
          success: false,
          error: 'Classroom not found',
        }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        classroom,
      });
    }

    // Otherwise, return list of all classrooms
    const classrooms = await listClassroomsFromServer();

    return NextResponse.json({
      success: true,
      classrooms,
      total: classrooms.length,
      message: classrooms.length > 0 ? 'Loaded from server database' : 'No classrooms found'
    });
  } catch (error) {
    console.error('Failed to fetch classrooms:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch classrooms',
      message: error instanceof Error ? error.message : 'Unknown error',
      classrooms: []
    }, { status: 500 });
  }
}
