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
}

export default function CoursesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gradeId = searchParams.get('gradeId');
  const gradeName = searchParams.get('gradeName') || '课程';

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gradeId) {
      router.push('/mobile');
      return;
    }
    loadCourses();
  }, [gradeId, router]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/courses?gradeId=${gradeId}`);
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (err) {
      console.error('Load courses error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = (course: Course) => {
    // Navigate to classroom or video player
    router.push(`/mobile/classroom/${course.id}`);
  };

  const handleBack = () => {
    router.back();
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}小时${m > 0 ? m + '分钟' : ''}`;
    return `${m}分钟`;
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
          <div>
            <h1 className="text-lg font-semibold text-gray-800">{gradeName}</h1>
            <p className="text-xs text-gray-500">选择课程</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-gray-500 text-sm">加载中...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-gray-500">暂无课程内容</p>
            <p className="text-sm text-gray-400 mt-2">课程正在制作中，敬请期待</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course, index) => (
              <button
                key={course.id}
                onClick={() => handleCourseClick(course)}
                className="w-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-98 text-left"
              >
                {/* Cover Image */}
                {course.coverUrl && (
                  <div className="aspect-video bg-gray-100 relative">
                    <img
                      src={course.coverUrl}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                    {course.videoUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">第{index + 1}课</span>
                    </div>
                    {course.duration && (
                      <span className="text-xs text-gray-500">{formatDuration(course.duration)}</span>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-gray-800 mb-1">
                    {course.title}
                  </h3>
                  
                  {course.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {course.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
