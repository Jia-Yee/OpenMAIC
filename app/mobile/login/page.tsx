'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const POLL_INTERVAL = 2000; // 2 seconds

export default function LoginPage() {
  const router = useRouter();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'pending' | 'scanned' | 'confirmed' | 'expired' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  // Generate QR code
  const generateQRCode = useCallback(async () => {
    try {
      setStatus('loading');
      setError(null);

      const res = await fetch('/api/wechat/login/qrcode', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate QR code');
      }

      setQrCodeUrl(data.qrCodeUrl);
      setSessionKey(data.sessionKey);
      setStatus('pending');
    } catch (err) {
      console.error('Generate QR code error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
      setStatus('error');
    }
  }, []);

  // Poll login status
  useEffect(() => {
    if (!sessionKey || status !== 'pending') return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/wechat/login/status?sessionKey=${sessionKey}`);
        const data = await res.json();

        if (data.status === 'confirmed' && data.token) {
          // Save token
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setStatus('confirmed');
          
          // Redirect to home
          setTimeout(() => {
            router.push('/mobile');
          }, 1000);
        } else if (data.status === 'expired') {
          setStatus('expired');
        } else if (data.status === 'scanned') {
          setStatus('scanned');
        }
      } catch (err) {
        console.error('Poll status error:', err);
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [sessionKey, status, router]);

  // Initial load
  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/mobile');
      return;
    }
    
    generateQRCode();
  }, [generateQRCode, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">三叶草</h1>
          <p className="text-gray-500">AI 交互式学习平台</p>
        </div>

        {/* QR Code Container */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-500">生成二维码中...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-8">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <p className="text-gray-700 mb-4">{error}</p>
              <button
                onClick={generateQRCode}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                重试
              </button>
            </div>
          )}

          {(status === 'pending' || status === 'scanned') && qrCodeUrl && (
            <>
              <div className="bg-gray-100 rounded-lg p-4 mb-4 flex items-center justify-center min-h-[200px]">
                {/* In production, this would render actual QR code image */}
                {qrCodeUrl.startsWith('http') ? (
                  <img
                    src={qrCodeUrl}
                    alt="微信扫码登录"
                    className="max-w-full max-h-48"
                  />
                ) : (
                  <div className="text-center">
                    <div className="text-6xl mb-4">📱</div>
                    <p className="text-sm text-gray-500 font-mono break-all">
                      {sessionKey}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="text-center">
                {status === 'pending' && (
                  <p className="text-gray-600">请使用微信扫描二维码登录</p>
                )}
                {status === 'scanned' && (
                  <p className="text-blue-600">请在手机上确认登录</p>
                )}
              </div>
            </>
          )}

          {status === 'confirmed' && (
            <div className="flex flex-col items-center py-8">
              <div className="text-green-500 text-5xl mb-4">✓</div>
              <p className="text-gray-700">登录成功，正在跳转...</p>
            </div>
          )}

          {status === 'expired' && (
            <div className="flex flex-col items-center py-8">
              <div className="text-orange-500 text-5xl mb-4">⏰</div>
              <p className="text-gray-700 mb-4">二维码已过期</p>
              <button
                onClick={generateQRCode}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                刷新二维码
              </button>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="text-center text-sm text-gray-400">
          <p>使用微信扫描二维码</p>
          <p>即可快速登录</p>
        </div>

        {/* Dev mode mock login */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-2">🔧 开发模式</p>
            <button
              onClick={async () => {
                // Mock login
                const mockToken = 'dev_mock_token';
                const mockUser = {
                  id: 'dev-user-1',
                  nickname: '测试用户',
                  avatarUrl: 'https://via.placeholder.com/100',
                };
                localStorage.setItem('token', mockToken);
                localStorage.setItem('user', JSON.stringify(mockUser));
                router.push('/mobile');
              }}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm"
            >
              模拟登录（开发模式）
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
