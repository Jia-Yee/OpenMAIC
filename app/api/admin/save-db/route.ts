import { NextResponse } from 'next/server';
import { writeFileSync, existsSync } from 'fs';
import { dirname } from 'path';
import { getDb } from '@/lib/db';

const dbPath = process.env.DATABASE_PATH || './data/clover.db';

/**
 * POST /api/admin/save-db
 * Manually save database to file
 */
export async function POST() {
  try {
    const db = getDb();
    
    // Get the underlying SQLite database
    const sqliteDb = (db as any).__session?.db;
    
    if (sqliteDb && existsSync(dirname(dbPath))) {
      const data = sqliteDb.export();
      writeFileSync(dbPath, Buffer.from(data));
      
      return NextResponse.json({
        success: true,
        message: 'Database saved successfully',
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Database not available',
    }, { status: 500 });
  } catch (error) {
    console.error('Error saving database:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save database',
    }, { status: 500 });
  }
}