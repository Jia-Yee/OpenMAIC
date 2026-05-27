'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Grade {
  id: string;
  name: string;
  code?: string;
  description?: string;
  price: string;
  originalPrice?: string;
}

interface Subscription {
  id: string;
  gradeId: string;
  status: string;
  expiresAt: string;
}

export default function GradesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const textbookId = searchParams.get('textbookId');
  const textbookName = searchParams.get('textbookName') || '教材';

  const [grades, setGrades] = useState<Grade[]>([]);
  const [subscriptions, setSubscriptions] = useState<Map<string, Subscription>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!textbookId) {
      router.push('/mobile');
      return;
    }
    loadGrades();
    loadSubscriptions();
  }, [textbookId, router]);

  const loadGrades = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/grades?textbookId=${textbookId}`);
      const data = await res.json();
      setGrades(data.grades || []);
    } catch (err) {
      console.error('Load grades error:', err);
    } finally {
      setLoading(false);
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
      
      const subMap = new Map<string, Subscription>();
      (data.subscriptions || []).forEach((sub: Subscription) => {
        subMap.set(sub.gradeId, sub);
      });
      setSubscriptions(subMap);
    } catch (err) {
      console.error('Load subscriptions error:', err);
    }
  };

  const handleGradeClick = (grade: Grade) => {
    const subscription = subscriptions.get(grade.id);
    
    if (subscription && subscription.status === 'paid') {
      // Already subscribed, go to courses
      router.push(`/mobile/courses?gradeId=${grade.id}&gradeName=${encodeURIComponent(grade.name)}`);
    } else {
      // Not subscribed, go to purchase page
      router.push(`/mobile/purchase?gradeId=${grade.id}&gradeName=${encodeURIComponent(grade.name)}&price=${grade.price}`);
    }
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
          <div>
            <h1 className="text-lg font-semibold text-gray-800">{textbookName}</h1>
            <p className="text-xs text-gray-500">选择年级</p>
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
        ) : grades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-gray-500">暂无年级课程</p>
          </div>
        ) : (
          <div className="space-y-3">
            {grades.map((grade) => {
              const subscription = subscriptions.get(grade.id);
              const isSubscribed = subscription && subscription.status === 'paid';
              const isExpired = subscription && new Date(subscription.expiresAt) < new Date();
              
              return (
                <button
                  key={grade.id}
                  onClick={() => handleGradeClick(grade)}
                  className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-98 text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800 text-lg">
                      {grade.name}
                    </h3>
                    {isSubscribed && !isExpired ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        已订阅
                      </span>
                    ) : isExpired ? (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                        已过期
                      </span>
                    ) : null}
                  </div>
                  
                  {grade.description && (
                    <p className="text-sm text-gray-500 mb-3">{grade.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      {isSubscribed && !isExpired ? (
                        <span className="text-sm text-gray-500">
                          有效期至 {formatDate(subscription.expiresAt)}
                        </span>
                      ) : (
                        <>
                          <span className="text-xl font-bold text-blue-600">
                            ¥{grade.price}
                          </span>
                          {grade.originalPrice && (
                            <span className="text-sm text-gray-400 line-through">
                              ¥{grade.originalPrice}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
