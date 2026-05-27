'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Course {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  videoUrl?: string;
  duration?: number;
  sortOrder: number;
}

interface Level {
  id: string;
  title: string;
  description?: string;
  locked: boolean;
  completed: boolean;
  stars: number; // 0-3
  isTrial?: boolean; // 试用关卡
}

export default function AdventureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = searchParams.get('subjectId');
  const gradeId = searchParams.get('gradeId');
  const subjectName = searchParams.get('subjectName') || '数学冒险';

  const [courses, setCourses] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockedCount, setUnlockedCount] = useState(2); // 前两关免费试用
  const [gradeInfo, setGradeInfo] = useState<{id: string; name: string} | null>(null);

  useEffect(() => {
    if (!subjectId) {
      router.push('/mobile');
      return;
    }
    loadGradesAndCourses();
  }, [subjectId, router]);

  const loadGradesAndCourses = async () => {
    try {
      setLoading(true);
      
      // Load textbooks for this subject
      const textbooksRes = await fetch(`/api/textbooks?subjectId=${subjectId}`);
      const textbooksData = await textbooksRes.json();
      const textbooks = textbooksData.textbooks || [];
      
      if (textbooks.length === 0) {
        setLoading(false);
        return;
      }
      
      // Get grades for first textbook
      const gradesRes = await fetch(`/api/grades?textbookId=${textbooks[0].id}`);
      const gradesData = await gradesRes.json();
      const grades = gradesData.grades || [];
      
      if (grades.length === 0) {
        setLoading(false);
        return;
      }
      
      // Use first grade (or passed gradeId)
      const targetGradeId = gradeId || grades[0].id;
      const targetGrade = grades.find((g: any) => g.id === targetGradeId) || grades[0];
      setGradeInfo({ id: targetGrade.id, name: targetGrade.name });
      
      // Load courses
      const coursesRes = await fetch(`/api/courses?gradeId=${targetGrade.id}`);
      const coursesData = await coursesRes.json();
      
      // Convert courses to levels with lock status
      const levels: Level[] = (coursesData.courses || []).map((course: Course, index: number) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        locked: index >= unlockedCount, // First 2 are free
        completed: false,
        stars: 0,
        isTrial: index < unlockedCount,
      }));
      
      setCourses(levels);
    } catch (err) {
      console.error('Load courses error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLevelClick = (level: Level) => {
    if (level.locked) {
      // Show unlock dialog
      return;
    }
    router.push(`/mobile/classroom/${level.id}?mode=adventure`);
  };

  const handleBack = () => {
    router.push('/mobile');
  };

  // Generate path positions for levels (snake pattern)
  const getLevelPosition = (index: number, total: number) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const isReverse = row % 2 === 1;
    const x = isReverse ? 2 - col : col;
    const y = row;
    return { x, y };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-900">
      {/* Stars background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-white">{gradeInfo?.name || subjectName}</h1>
            <p className="text-xs text-blue-200">知识冒险之旅</p>
          </div>
          <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1 rounded-full">
            <span className="text-yellow-400">⭐</span>
            <span className="text-white font-bold">{courses.filter(c => c.completed).length}/{courses.length}</span>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="px-4 mb-6">
        <div className="bg-white/10 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-green-400 to-blue-500 h-full transition-all duration-500"
            style={{ width: `${(courses.filter(c => c.completed).length / Math.max(courses.length, 1)) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-blue-200">学习进度</span>
          <span className="text-xs text-blue-200">
            {Math.round((courses.filter(c => c.completed).length / Math.max(courses.length, 1)) * 100)}%
          </span>
        </div>
      </div>

      {/* Main Content - Game Map */}
      <main className="px-4 pb-24 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-3"></div>
            <p className="text-white/80">加载冒险地图...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-white">冒险地图正在绘制中...</p>
          </div>
        ) : (
          <>
            {/* Level Grid */}
            <div className="space-y-4">
              {courses.map((level, index) => {
                const prevCompleted = index === 0 || courses[index - 1]?.completed;
                const canUnlock = !level.locked || prevCompleted;
                
                return (
                  <div key={level.id} className="relative">
                    {/* Connection line to previous */}
                    {index > 0 && (
                      <div className="absolute -top-4 left-1/2 w-1 h-4 bg-white/20 transform -translate-x-1/2" />
                    )}
                    
                    {/* Level Card */}
                    <button
                      onClick={() => handleLevelClick(level)}
                      disabled={level.locked && !canUnlock}
                      className={`w-full relative rounded-2xl p-4 transition-all transform ${
                        level.locked 
                          ? 'bg-gray-800/50 opacity-60' 
                          : level.completed
                          ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400/50'
                          : 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-2 border-blue-400/50 hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      {/* Trial badge */}
                      {level.isTrial && !level.locked && (
                        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                          免费
                        </div>
                      )}
                      
                      {/* Lock overlay */}
                      {level.locked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                          <div className="text-center">
                            <div className="text-4xl mb-2">🔒</div>
                            <p className="text-white/80 text-sm">解锁后可学习</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4">
                        {/* Level number */}
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold ${
                          level.completed 
                            ? 'bg-green-500 text-white' 
                            : level.locked
                            ? 'bg-gray-700 text-gray-400'
                            : 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                        }`}>
                          {level.completed ? '✓' : index + 1}
                        </div>
                        
                        {/* Level info */}
                        <div className="flex-1 text-left">
                          <h3 className={`font-bold ${level.locked ? 'text-gray-400' : 'text-white'}`}>
                            {level.title}
                          </h3>
                          {level.description && (
                            <p className="text-sm text-white/60 mt-0.5 line-clamp-1">
                              {level.description}
                            </p>
                          )}
                          
                          {/* Stars */}
                          <div className="flex gap-1 mt-2">
                            {[1, 2, 3].map(star => (
                              <span 
                                key={star} 
                                className={`text-lg ${star <= level.stars ? 'text-yellow-400' : 'text-gray-600'}`}
                              >
                                ⭐
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        {/* Arrow */}
                        {!level.locked && (
                          <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
            
            {/* Unlock all button */}
            {courses.some(l => l.locked) && (
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <button
                  onClick={handleBack}
                  className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-4 rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all active:scale-[0.98]"
                >
                  🎮 解锁全部关卡 · ¥199
                </button>
                <p className="text-center text-white/60 text-sm mt-2">
                  已解锁 {unlockedCount} 个免费试用关卡
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
