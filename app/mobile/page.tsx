'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  iconUrl?: string;
}

interface User {
  id: string;
  nickname: string;
  avatarUrl?: string;
}

export default function MobileHome() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check login status
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token) {
      router.push('/mobile/login');
      return;
    }
    
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Parse user error:', e);
      }
    }
    
    loadSubjects();
  }, [router]);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/subjects');
      const data = await res.json();
      setSubjects(data.subjects || []);
    } catch (err) {
      console.error('Load subjects error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectClick = (subject: Subject) => {
    // Go to adventure mode directly
    router.push(`/mobile/adventure?subjectId=${subject.id}&subjectName=${encodeURIComponent(subject.name)}&gradeId=grade-rjb-1a`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/mobile/login');
  };

  const handleProfileClick = () => {
    router.push('/mobile/profile');
  };

  // Subject icons
  const subjectIcons: Record<string, string> = {
    math: '📐',
    chinese: '📖',
    english: '🔤',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">三叶草</h1>
            <p className="text-xs text-blue-100 mt-1">AI 交互式课堂</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleProfileClick}
              className="flex items-center gap-2 px-3 py-2 hover:bg-blue-500 rounded-lg transition"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center text-xs">
                  {user?.nickname?.[0] || '?'}
                </div>
              )}
              <span className="text-sm hidden sm:inline">{user?.nickname || '用户'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-20">
        {/* Welcome Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800">
            你好，{user?.nickname || '同学'} 👋
          </h2>
          <p className="text-sm text-gray-500 mt-1">选择你想学习的科目</p>
        </div>

        {/* Subjects Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-gray-500 text-sm">加载中...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-gray-500">暂无科目</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => handleSubjectClick(subject)}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all active:scale-95 text-left"
              >
                <div className="text-4xl mb-3">
                  {subjectIcons[subject.code] || '📖'}
                </div>
                <h3 className="font-semibold text-gray-800 text-lg">
                  {subject.name}
                </h3>
                {subject.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {subject.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-3">📊 学习概览</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-xs text-gray-500">已订阅</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-xs text-gray-500">已完成</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">0h</div>
              <div className="text-xs text-gray-500">学习时长</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 text-center text-xs text-gray-500">
        <p>三叶草 v1.0.0</p>
        <p className="mt-1">Powered by AI Multi-Agent Technology</p>
      </footer>
    </div>
  );
}
