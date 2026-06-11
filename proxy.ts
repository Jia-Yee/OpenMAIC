import { NextRequest, NextResponse } from 'next/server';

/** Convert string to Uint8Array */
function encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** Convert ArrayBuffer to hex string */
function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Verify an HMAC-signed token using Web Crypto API (Edge-compatible) */
async function verifyToken(token: string, accessCode: string): Promise<boolean> {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;

  const timestamp = token.substring(0, dotIndex);
  const signature = token.substring(dotIndex + 1);

  const keyData = encode(accessCode);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const data = encode(timestamp);
  const expected = bufToHex(await crypto.subtle.sign('HMAC', key, data.buffer as ArrayBuffer));

  // Constant-length comparison (not truly constant-time in JS, but sufficient here)
  if (signature.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Set security headers on response */
function setSecurityHeaders(response: NextResponse, request: NextRequest): void {
  const { protocol, hostname } = request.nextUrl;
  const isHttps = protocol === 'https:';
  const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  const isDev = process.env.NODE_ENV === 'development';
  
  // X-Content-Type-Options
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // X-XSS-Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer-Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions-Policy
  response.headers.set('Permissions-Policy', 'geolocation=(self), camera=(self), microphone=(self), fullscreen=(self)');
  
  // HSTS only in production and HTTPS
  if (isProduction && isHttps) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // X-Frame-Options
  const extraAncestors = process.env.ALLOWED_FRAME_ANCESTORS?.trim();
  if (!extraAncestors) {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  }
  
  // Content-Security-Policy
  const cspDirectives: string[] = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval'${isProduction && !isDev ? ' https://*.vercel-insights.com https://*.googletagmanager.com' : ''}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' data: blob: https://*.vercel-storage.com https://*.blob.core.windows.net`,
    `media-src 'self' data: blob: https://*.vercel-storage.com`,
    `connect-src 'self'${isProduction && !isDev ? ' https://api.openai.com https://api.minimax.chat' : ''} https://*.vercel-storage.com https://blob.vercel-storage.com ws://localhost:* wss://localhost:*`,
    `frame-src 'self' https://*.youtube.com https://*.google.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ];
  
  // Only add upgrade-insecure-requests in production HTTPS environment
  if (isProduction && isHttps) {
    cspDirectives.push('upgrade-insecure-requests');
  }
  
  // Frame ancestors
  const frameAncestors = extraAncestors ? `'self' ${extraAncestors}` : "'self'";
  cspDirectives.push(`frame-ancestors ${frameAncestors}`);
  
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
}

export async function proxy(request: NextRequest) {
  const accessCode = process.env.ACCESS_CODE;
  let response: NextResponse;

  if (!accessCode) {
    response = NextResponse.next();
    setSecurityHeaders(response, request);
    return response;
  }

  const { pathname } = request.nextUrl;

  // Whitelist: access-code endpoints, health check, admin API, auth API, user API, mobile API
  if (pathname.startsWith('/api/access-code/') || pathname === '/api/health' || pathname.startsWith('/api/admin/') || pathname.startsWith('/api/auth/') || pathname.startsWith('/api/user/') || pathname.startsWith('/api/classrooms/')) {
    response = NextResponse.next();
    setSecurityHeaders(response, request);
    return response;
  }

  // Check cookie — validate HMAC signature, not just existence
  const cookie = request.cookies.get('openmaic_access');
  if (cookie?.value && (await verifyToken(cookie.value, accessCode))) {
    response = NextResponse.next();
    setSecurityHeaders(response, request);
    return response;
  }

  // API requests without valid cookie → 401
  if (pathname.startsWith('/api/')) {
    response = NextResponse.json(
      { success: false, errorCode: 'INVALID_REQUEST', error: 'Access code required' },
      { status: 401 },
    );
    setSecurityHeaders(response, request);
    return response;
  }

  // Page requests → let through, frontend shows modal
  response = NextResponse.next();
  setSecurityHeaders(response, request);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logos/).*)'],
};
