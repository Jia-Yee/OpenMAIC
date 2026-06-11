'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const POLL_INTERVAL = 2000; // 2 seconds

type LoginMode = 'wechat' | 'password';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('wechat');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'pending' | 'scanned' | 'confirmed' | 'expired' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
          
          // Redirect to adventure page
          setTimeout(() => {
            router.push('/mobile/adventure?subjectId=subject-math&subjectName=数学&gradeId=grade-rjb-1a');
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
    
    if (mode === 'wechat') {
      generateQRCode();
    }
  }, [generateQRCode, router, mode]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/auth/password-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setTimeout(() => {
          router.push('/mobile/adventure?subjectId=subject-math&subjectName=数学&gradeId=grade-rjb-1a');
        }, 500);
      } else {
        setLoginError(data.error || '登录失败');
      }
    } catch (err) {
      console.error('Password login error:', err);
      setLoginError('登录失败，请稍后重试');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-2xl">
              🎓
            </div>
            <h1 className="text-2xl font-bold text-blue-600">韦达学习</h1>
          </div>
          <p className="text-gray-500">AI 交互式学习平台</p>
        </div>

        {/* Mode Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => {
              setMode('wechat');
              setLoginError(null);
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              mode === 'wechat' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            微信扫码登录
          </button>
          <button
            onClick={() => {
              setMode('password');
              setLoginError(null);
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              mode === 'password' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            手机号密码登录
          </button>
        </div>

        {/* WeChat Login */}
        {mode === 'wechat' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
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
        )}

        {/* Password Login */}
        {mode === 'password' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入手机号"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入密码"
                  required
                />
              </div>
              
              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{loginError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition"
              >
                {isLoggingIn ? '登录中...' : '登录'}
              </button>
            </form>
          </div>
        )}

        {/* Dev mode mock login */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-2">🔧 开发模式</p>
            <button
              onClick={async () => {
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
