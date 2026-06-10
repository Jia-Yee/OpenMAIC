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

interface Grade {
  id: string;
  name: string;
  price: number;
  textbookId: string;
  hasFreeTrial?: boolean;
  progress?: number;
}

interface User {
  id: string;
  nickname: string;
  avatarUrl?: string;
}

interface UserProgress {
  gradeId: string;
  gradeName: string;
  subjectId: string;
  subjectName: string;
  completedCourses: number;
  totalCourses: number;
  progress: number;
}

export default function MobileHome() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradesWithFree, setGradesWithFree] = useState<Grade[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check login status
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    // Development mode: allow without login
    const isDev = process.env.NODE_ENV === 'development';
    
    // If logged in, redirect directly to adventure page
    if ((token || isDev) && !window.location.pathname.includes('login')) {
      router.push('/mobile/adventure?subjectId=subject-math&subjectName=数学&gradeId=grade-rjb-1a');
      return;
    }
    
    if (!token && !isDev) {
      router.push('/mobile/login');
      return;
    }
    
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Parse user error:', e);
        // Dev fallback
        if (isDev) {
          setUser({ id: 'dev-user', nickname: '测试用户' });
        }
      }
    } else if (isDev) {
      setUser({ id: 'dev-user', nickname: '测试用户' });
    }
    
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load subjects
      const subjectsRes = await fetch('/api/subjects');
      const subjectsData = await subjectsRes.json();
      setSubjects(subjectsData.subjects || []);
      
      // Load grades with free trial for each subject
      const mathSubject = (subjectsData.subjects || []).find((s: Subject) => s.code === 'math');
      if (mathSubject) {
        const textbooksRes = await fetch(`/api/textbooks?subjectId=${mathSubject.id}`);
        const textbooksData = await textbooksRes.json();
        const textbooks = textbooksData.textbooks || [];
        
        if (textbooks.length > 0) {
          const gradesRes = await fetch(`/api/grades?textbookId=${textbooks[0].id}`);
          const gradesData = await gradesRes.json();
          const grades = gradesData.grades || [];
          
          // For each grade, check if it has courses (free trial)
          const gradesWithTrial = await Promise.all(
            grades.map(async (grade: Grade) => {
              const coursesRes = await fetch(`/api/courses?gradeId=${grade.id}`);
              const coursesData = await coursesRes.json();
              const courses = coursesData.courses || [];
              return {
                ...grade,
                hasFreeTrial: courses.length >= 2,
              };
            })
          );
          
          setGradesWithFree(gradesWithTrial);
        }
      }
      
      // Mock user progress (in real app, load from backend)
      // For now, show first grade as "in progress"
      if (gradesWithFree.length > 0) {
        setUserProgress([{
          gradeId: gradesWithFree[0].id,
          gradeName: gradesWithFree[0].name,
          subjectId: mathSubject.id,
          subjectName: mathSubject.name,
          completedCourses: 0,
          totalCourses: 5,
          progress: 0,
        }]);
      }
      
    } catch (err) {
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectClick = (subject: Subject) => {
    // Find first grade with free trial or just first grade
    const grade = gradesWithFree.find(g => g.hasFreeTrial) || gradesWithFree[0];
    router.push(`/mobile/adventure?subjectId=${subject.id}&subjectName=${encodeURIComponent(subject.name)}&gradeId=${grade?.id || 'grade-rjb-1a'}`);
  };

  const handleGradeClick = (grade: Grade, subject: Subject) => {
    router.push(`/mobile/adventure?subjectId=${subject.id}&subjectName=${encodeURIComponent(subject.name)}&gradeId=${grade.id}`);
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

  const mathSubject = subjects.find(s => s.code === 'math');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">韦达数学</h1>
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

        {/* User Progress Section */}
        {userProgress.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">📖 学习进度</h3>
            <div className="space-y-3">
              {userProgress.map((progress) => (
                <button
                  key={progress.gradeId}
                  onClick={() => router.push(`/mobile/adventure?subjectId=${progress.subjectId}&subjectName=${encodeURIComponent(progress.subjectName)}&gradeId=${progress.gradeId}`)}
                  className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-95 text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-lg font-medium text-gray-800">{progress.gradeName}</span>
                      <span className="text-sm text-gray-500 ml-2">{progress.subjectName}</span>
                    </div>
                    <span className="text-sm text-blue-600 font-medium">{Math.round(progress.progress)}%</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    已完成 {progress.completedCourses}/{progress.totalCourses} 课
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Grades with Free Trial Section */}
        {gradesWithFree.length > 0 && mathSubject && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">🌟 免费试学</h3>
              <span className="text-xs text-gray-500">前2课免费</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {gradesWithFree.slice(0, 4).map((grade) => (
                <button
                  key={grade.id}
                  onClick={() => handleGradeClick(grade, mathSubject)}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-95 text-left relative overflow-hidden"
                >
                  {grade.hasFreeTrial && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded-bl-lg">
                      免费
                    </div>
                  )}
                  <div className="text-sm font-medium text-gray-800">{grade.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {grade.hasFreeTrial ? '前2课免费试学' : '订阅解锁'}
                  </div>
                  {grade.price > 0 && (
                    <div className="text-xs text-orange-600 mt-1">¥{grade.price}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

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
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">📚 全部科目</h3>
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
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-3">📊 学习概览</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{gradesWithFree.filter(g => g.hasFreeTrial).length}</div>
              <div className="text-xs text-gray-500">可试学</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-xs text-gray-500">已完成</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{gradesWithFree.length}</div>
              <div className="text-xs text-gray-500">课程总数</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 text-center text-xs text-gray-500">
        <p>韦达数学 v1.0.0</p>
        <p className="mt-1">Powered by AI Multi-Agent Technology</p>
      </footer>
    </div>
  );
}
