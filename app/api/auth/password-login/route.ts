import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateToken, comparePassword } from '@/lib/auth';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * POST /api/auth/password-login
 * Password login with phone and password
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone and password are required' },
        { status: 400 }
      );
    }

    const db = await ensureDb();

    // Find user by phone
    const userResults = await db.select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (!userResults[0]) {
      return NextResponse.json(
        { error: 'Invalid phone or password' },
        { status: 401 }
      );
    }

    const user = userResults[0];

    // Check if password exists
    if (!user.password) {
      return NextResponse.json(
        { error: 'Password not set for this user' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await comparePassword(password, user.password);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid phone or password' },
        { status: 401 }
      );
    }

    // Update last login time
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Generate JWT
    const token = generateToken({ userId: user.id, openid: user.openid });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Error in password login:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}
