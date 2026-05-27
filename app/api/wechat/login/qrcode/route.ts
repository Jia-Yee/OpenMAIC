import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { wechatSessions } from '@/lib/db/schema';
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
 * POST /api/wechat/login/qrcode
 * Generate a QR code for WeChat login
 */
export async function POST() {
  try {
    const db = await ensureDb();

    const sessionKey = nanoid(32);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // In production, this would call WeChat API to generate QR code
    // For development, we create a mock QR code URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=weixin://open/login?session_key=${sessionKey}`;

    await db.insert(wechatSessions).values({
      sessionKey,
      status: 'pending',
      qrCodeUrl,
      expiresAt,
    });

    return NextResponse.json({
      sessionKey,
      qrCodeUrl,
      expiresIn: 300, // seconds
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
