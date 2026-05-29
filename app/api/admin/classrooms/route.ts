import { NextResponse } from 'next/server';
import { listClassroomsFromServer } from '@/lib/server/classroom-server-db';

/**
 * GET /api/admin/classrooms
 * Get all classrooms from server storage
 */
export async function GET() {
  try {
    const classrooms = await listClassroomsFromServer();

    return NextResponse.json({
      success: true,
      classrooms,
      total: classrooms.length,
    });
  } catch (error) {
    console.error('Error fetching classrooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classrooms', success: false },
      { status: 500 }
    );
  }
}
