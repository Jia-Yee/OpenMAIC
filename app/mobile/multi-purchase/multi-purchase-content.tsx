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

type PurchaseState = {
  status: 'idle' | 'processing' | 'success' | 'error';
  message?: string;
};

export default function MultiPurchaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const textbookId = searchParams.get('textbookId');
  const textbookName = searchParams.get('textbookName') || '教材';

  const [grades, setGrades] = useState<Grade[]>([]);
  const [subscriptions, setSubscriptions] = useState<Map<string, Subscription>>(new Map());
  const [selectedGradeIds, setSelectedGradeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [purchaseState, setPurchaseState] = useState<PurchaseState>({ status: 'idle' });

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

  const toggleGrade = (gradeId: string) => {
    setSelectedGradeIds(prev => {
      const next = new Set(prev);
      if (next.has(gradeId)) {
        next.delete(gradeId);
      } else {
        next.add(gradeId);
      }
      return next;
    });
  };

  const selectAll = () => {
    const availableGrades = grades.filter(grade => {
      const sub = subscriptions.get(grade.id);
      return !sub || sub.status !== 'paid' || new Date(sub.expiresAt) < new Date();
    });
    setSelectedGradeIds(new Set(availableGrades.map(g => g.id)));
  };

  const clearSelection = () => {
    setSelectedGradeIds(new Set());
  };

  const calculateTotalPrice = () => {
    let total = 0;
    selectedGradeIds.forEach(id => {
      const grade = grades.find(g => g.id === id);
      if (grade) {
        total += parseFloat(grade.price);
      }
    });
    return total.toFixed(2);
  };

  const handlePurchase = async () => {
    if (selectedGradeIds.size === 0) {
      setPurchaseState({
        status: 'error',
        message: '请至少选择一个年级'
      });
      return;
    }

    try {
      setPurchaseState({ status: 'processing' });

      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/mobile/login');
        return;
      }

      // 逐个创建订单并模拟支付
      const gradeIds = Array.from(selectedGradeIds);
      let successCount = 0;

      for (const gradeId of gradeIds) {
        // Create order
        const res = await fetch('/api/subscriptions/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ gradeId }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || '创建订单失败');
        }

        // Simulate payment
        await simulatePayment(data.orderNo);
        successCount++;
      }

      setPurchaseState({
        status: 'success',
        message: `成功购买 ${successCount} 个年级课程！`
      });

      // Refresh subscriptions
      await loadSubscriptions();

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/mobile/grades?textbookId=${textbookId}&textbookName=${encodeURIComponent(textbookName)}`);
      }, 2000);
      
    } catch (err) {
      console.error('Purchase error:', err);
      setPurchaseState({
        status: 'error',
        message: err instanceof Error ? err.message : '购买失败，请重试',
      });
    }
  };

  const simulatePayment = async (orderNo: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const token = localStorage.getItem('token');
    
    const res = await fetch('/api/subscriptions/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderNo }),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error('支付验证失败');
    }
  };

  const handleBack = () => {
    router.back();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const isGradeSubscribed = (gradeId: string) => {
    const subscription = subscriptions.get(gradeId);
    return subscription && subscription.status === 'paid' && new Date(subscription.expiresAt) >= new Date();
  };

  const isGradeExpired = (gradeId: string) => {
    const subscription = subscriptions.get(gradeId);
    return subscription && new Date(subscription.expiresAt) < new Date();
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
            <h1 className="text-lg font-semibold text-gray-800">选择年级</h1>
            <p className="text-xs text-gray-500">{textbookName}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-32">
        {/* Selection Controls */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">快速选择</span>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
              >
                全选
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                清除
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            已选择 <span className="font-semibold text-blue-600">{selectedGradeIds.size}</span> 个年级
          </div>
        </div>

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
              const isSubscribed = isGradeSubscribed(grade.id);
              const isExpired = isGradeExpired(grade.id);
              const isSelected = selectedGradeIds.has(grade.id);
              
              return (
                <div
                  key={grade.id}
                  className={`w-full bg-white rounded-xl p-4 shadow-sm transition-all ${
                    isSelected ? 'ring-2 ring-blue-500' : ''
                  } ${isSubscribed ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    {!isSubscribed ? (
                      <button
                        onClick={() => toggleGrade(grade.id)}
                        className="mt-0.5 flex-shrink-0"
                      >
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-white border-gray-300 hover:border-blue-500'
                        }`}>
                          {isSelected && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ) : (
                      <div className="mt-0.5 flex-shrink-0">
                        <div className="w-6 h-6 rounded-md bg-green-100 border-2 border-green-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                    
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800 text-lg">
                          {grade.name}
                        </h3>
                        {isSubscribed ? (
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
                          {isSubscribed ? (
                            <span className="text-sm text-gray-500">
                              有效期至 {formatDate(subscriptions.get(grade.id)!.expiresAt)}
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
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Purchase Status Overlay */}
      {purchaseState.status === 'processing' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-800 font-medium">正在处理...</p>
            <p className="text-sm text-gray-500 mt-1">请稍候</p>
          </div>
        </div>
      )}

      {purchaseState.status === 'success' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm text-center">
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <p className="text-gray-800 font-medium text-lg">{purchaseState.message}</p>
            <p className="text-sm text-gray-500 mt-2">正在跳转...</p>
          </div>
        </div>
      )}

      {/* Sticky Purchase Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        {purchaseState.status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <p className="text-sm text-red-700">{purchaseState.message}</p>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm text-gray-500">合计：</span>
            <span className="text-2xl font-bold text-blue-600">¥{calculateTotalPrice()}</span>
          </div>
        </div>
        
        <button
          onClick={handlePurchase}
          disabled={selectedGradeIds.size === 0 || purchaseState.status === 'processing'}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          {purchaseState.status === 'processing' ? '处理中...' : `立即购买 (${selectedGradeIds.size})`}
        </button>
        
        {/* Dev mode skip */}
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={() => {
              router.push(`/mobile/grades?textbookId=${textbookId}&textbookName=${encodeURIComponent(textbookName)}`);
            }}
            className="w-full mt-3 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition text-sm"
          >
            🔧 开发模式：跳过
          </button>
        )}
      </div>
    </div>
  );
}
