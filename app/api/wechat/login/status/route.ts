import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { wechatSessions, users, eq, and, gt } from '@/lib/db/schema';
import { generateToken } from '@/lib/auth';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * GET /api/wechat/login/status?sessionKey=xxx
 * Check login status (polling)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionKey = searchParams.get('sessionKey');

    if (!sessionKey) {
      return NextResponse.json({ error: 'sessionKey is required' }, { status: 400 });
    }

    const db = await ensureDb();

    // Get session
    const session = await db.select()
      .from(wechatSessions)
      .where(and(
        eq(wechatSessions.sessionKey, sessionKey),
        gt(wechatSessions.expiresAt, Date.now())
      ))
      .limit(1);

    if (!session[0]) {
      return NextResponse.json({
        status: 'expired',
        message: 'QR code expired, please refresh',
      });
    }

    if (session[0].status === 'pending') {
      return NextResponse.json({
        status: 'pending',
        message: 'Waiting for scan',
      });
    }

    if (session[0].status === 'scanned') {
      return NextResponse.json({
        status: 'scanned',
        message: 'Please confirm on your phone',
      });
    }

    if (session[0].status === 'confirmed' && session[0].openid) {
      // Get or create user
      let user = await db.select()
        .from(users)
        .where(eq(users.openid, session[0].openid))
        .limit(1);

      if (!user[0]) {
        // Create new user
        const userId = crypto.randomUUID();
        await db.insert(users).values({
          id: userId,
          openid: session[0].openid,
          nickname: '微信用户',
          lastLoginAt: Date.now(),
        });
        user = await db.select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
      } else {
        // Update last login
        await db.update(users)
          .set({ lastLoginAt: Date.now() })
          .where(eq(users.id, user[0].id));
      }

      // Generate JWT
      const token = generateToken({ userId: user[0].id, openid: user[0].openid });

      return NextResponse.json({
        status: 'confirmed',
        token,
        user: {
          id: user[0].id,
          nickname: user[0].nickname,
          avatarUrl: user[0].avatarUrl,
        },
      });
    }

    return NextResponse.json({
      status: 'error',
      message: 'Unknown status',
    });
  } catch (error) {
    console.error('Error checking login status:', error);
    return NextResponse.json(
      { error: 'Failed to check login status' },
      { status: 500 }
    );
  }
}
