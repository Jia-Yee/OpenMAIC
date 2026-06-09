import { NextResponse } from 'next/server';
import { getDb, initDb, autoSaveDb } from '@/lib/db';
import { users, asc, eq } from '@/lib/db/schema';
import type { NewUser } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth';
import { nanoid } from 'nanoid';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * Generate a unique OpenID
 */
function generateOpenId(): string {
  return `openid_${nanoid(32)}`;
}

/**
 * GET /api/admin/users
 * Get all users
 */
export async function GET() {
  try {
    const db = await ensureDb();

    const result = await db.select()
      .from(users)
      .orderBy(asc(users.createdAt));

    return NextResponse.json({ users: result });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Create a new user
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { openid: providedOpenid, nickname, avatarUrl, phone, password, isAdmin } = body;

    // Auto-generate openid if not provided
    const openid = providedOpenid || generateOpenId();

    const db = await ensureDb();

    // Check if openid already exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.openid, openid))
      .limit(1);

    if (existingUser[0]) {
      return NextResponse.json(
        { error: 'OpenID already exists' },
        { status: 400 }
      );
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await hashPassword(password);
    }

    const newUser: NewUser = {
      id: crypto.randomUUID(),
      openid,
      nickname: nickname || '',
      avatarUrl: avatarUrl || '',
      phone: phone || '',
      password: hashedPassword,
      isAdmin: isAdmin ? 1 : 0,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
    };

    await db.insert(users).values(newUser);

    // Auto-save database after write operation
    autoSaveDb();

    return NextResponse.json({ 
      success: true, 
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
