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
  isFree?: boolean;
  classroomId?: string;
}

export default function CoursesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gradeId = searchParams.get('gradeId');
  const gradeName = searchParams.get('gradeName') || '课程';

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWechat, setShowWechat] = useState(false);

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
    if (course.classroomId) {
      router.push(`/mobile/classroom/${course.classroomId}?mode=adventure&courseId=${course.id}`);
    } else {
      router.push(`/mobile/classroom/${course.id}?mode=adventure&courseId=${course.id}`);
    }
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
                      {course.isFree && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          免费
                        </span>
                      )}
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

        {/* WeChat Contact Card */}
        <div className="mt-6 bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowWechat(!showWechat)}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm3.68 4.025c-3.694 0-6.963 2.507-6.963 5.812 0 3.327 3.269 5.835 6.963 5.835.753 0 1.48-.108 2.164-.312a.71.71 0 0 1 .573.08l1.465.857a.274.274 0 0 0 .135.042c.13 0 .235-.108.235-.241 0-.06-.023-.117-.038-.174l-.3-1.146a.48.48 0 0 1 .171-.535C21.742 19.42 22.5 17.68 22.5 15.828c0-3.305-3.269-5.812-7.222-5.812zm-2.427 3.2c.517 0 .936.425.936.95a.943.943 0 0 1-.936.95.943.943 0 0 1-.936-.95c0-.525.42-.95.936-.95zm4.854 0c.517 0 .936.425.936.95a.943.943 0 0 1-.936.95.943.943 0 0 1-.936-.95c0-.525.42-.95.936-.95z"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">添加客服微信</p>
                <p className="text-xs text-gray-500">获取更多学习资源</p>
              </div>
            </div>
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${showWechat ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showWechat && (
            <div className="px-4 pb-4 flex flex-col items-center">
              <img
                src="/viete-learning.jpg"
                alt="客服微信"
                className="w-48 h-48 rounded-lg object-cover"
              />
              <p className="text-xs text-gray-500 mt-2">扫码添加客服微信</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
