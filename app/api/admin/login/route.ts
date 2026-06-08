import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '用户名和密码都不能为空' },
        { status: 400 }
      );
    }

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (username === adminUsername && password === adminPassword) {
      const adminToken = Buffer.from(`${username}:${password}`).toString('base64');
      
      return NextResponse.json({
        success: true,
        token: adminToken,
        user: {
          username: adminUsername,
          role: 'admin',
          permissions: ['all'],
        },
      });
    }

    return NextResponse.json(
      { success: false, error: '用户名或密码错误' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Admin login endpoint. Use POST with username and password.',
  });
}