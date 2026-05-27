import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { wechatSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return getDb();
}

/**
 * GET /api/wechat/login/callback
 * WeChat callback (mock for development)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionKey = searchParams.get('session_key');
    const mockOpenid = searchParams.get('mock_openid');

    if (!sessionKey) {
      return NextResponse.json({ error: 'session_key is required' }, { status: 400 });
    }

    const db = await ensureDb();

    // In development, allow mock openid parameter
    if (mockOpenid || process.env.NODE_ENV === 'development') {
      const openid = mockOpenid || `mock_openid_${Date.now()}`;

      await db.update(wechatSessions)
        .set({
          openid,
          status: 'confirmed',
          confirmedAt: new Date(),
        })
        .where(eq(wechatSessions.sessionKey, sessionKey));

      return NextResponse.json({ success: true, message: 'Login confirmed' });
    }

    // In production, verify WeChat signature and get openid
    // This would use the WeChat API
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
  } catch (error) {
    console.error('Error in WeChat callback:', error);
    return NextResponse.json(
      { error: 'Failed to process callback' },
      { status: 500 }
    );
  }
}
