'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  nickname: string;
  avatarUrl?: string;
}

interface Subscription {
  id: string;
  gradeId: string;
  gradeName?: string;
  status: string;
  expiresAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
    loadSubscriptions();
  }, []);

  const loadUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Parse user error:', e);
      }
    }
  };

  const loadSubscriptions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await fetch('/api/subscriptions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      // Filter only paid and active subscriptions
      const active = (data.subscriptions || []).filter(
        (sub: Subscription) => sub.status === 'paid' && new Date(sub.expiresAt) > new Date()
      );
      setSubscriptions(active);
    } catch (err) {
      console.error('Load subscriptions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/mobile/login');
  };

  const handleBack = () => {
    router.back();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">个人中心</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {/* User Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
          <div className="flex items-center gap-4">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl text-blue-600">
                {user?.nickname?.[0] || '?'}
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {user?.nickname || '未知用户'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">ID: {user?.id?.slice(0, 8)}...</p>
            </div>
          </div>
        </div>

        {/* Subscriptions */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
          <h3 className="font-semibold text-gray-800 mb-4">我的订阅</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-500">暂无订阅</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{sub.gradeName || '课程'}</p>
                    <p className="text-sm text-gray-500">
                      有效期至 {formatDate(sub.expiresAt)}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    有效
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full px-6 py-4 text-left text-red-600 hover:bg-gray-50 transition flex items-center justify-between"
          >
            <span>退出登录</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        {/* App Info */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>三叶草 v1.0.0</p>
          <p className="mt-1">Powered by AI Multi-Agent Technology</p>
        </div>
      </main>
    </div>
  );
}
