import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { users, eq, or } from '@/lib/db/schema';
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
 * Get client IP from request headers
 */
function getClientIp(request: Request): string | null {
  // Try x-forwarded-for header (most common in proxy/CDN setups)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for may contain multiple IPs, the first one is the client
    return forwardedFor.split(',')[0].trim();
  }
  
  // Try other common headers
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  
  return null;
}

/**
 * POST /api/auth/password-login
 * Password login with phone and password
 * Supports admin login as any user
 * Also supports environment variable admin credentials
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, password, loginAsUserId } = body;
    const clientIp = getClientIp(request);

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone and password are required' },
        { status: 400 }
      );
    }

    // Check for environment variable admin credentials first
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (adminUsername && adminPassword && phone === adminUsername && password === adminPassword) {
      // Admin login via environment variables
      const token = generateToken({ userId: 'admin', openid: 'admin', isAdmin: true });
      
      return NextResponse.json({
        success: true,
        token,
        isAdmin: true,
        user: {
          id: 'admin',
          nickname: '管理员',
          avatarUrl: null,
          phone: adminUsername,
        },
      });
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

    let loginUser = user;

    // Admin can login as any user
    if (user.isAdmin && loginAsUserId) {
      const targetUserResults = await db.select()
        .from(users)
        .where(eq(users.id, loginAsUserId))
        .limit(1);

      if (targetUserResults[0]) {
        loginUser = targetUserResults[0];
      }
    }

    // Update last login time and IP
    await db.update(users)
      .set({ 
        lastLoginAt: Math.floor(Date.now() / 1000),
        lastLoginIp: clientIp,
      })
      .where(eq(users.id, loginUser.id));

    // Generate JWT
    const token = generateToken({ userId: loginUser.id, openid: loginUser.openid, isAdmin: Boolean(user.isAdmin) });

    return NextResponse.json({
      success: true,
      token,
      isAdmin: user.isAdmin,
      user: {
        id: loginUser.id,
        nickname: loginUser.nickname,
        avatarUrl: loginUser.avatarUrl,
        phone: loginUser.phone,
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
