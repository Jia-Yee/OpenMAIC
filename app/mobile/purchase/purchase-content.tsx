'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface PurchaseState {
  status: 'idle' | 'processing' | 'success' | 'error';
  message?: string;
}

export default function PurchaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gradeId = searchParams.get('gradeId');
  const gradeName = searchParams.get('gradeName') || '课程';
  const price = searchParams.get('price') || '199';

  const [state, setState] = useState<PurchaseState>({ status: 'idle' });

  useEffect(() => {
    if (!gradeId) {
      router.push('/mobile');
      return;
    }
  }, [gradeId, router]);

  const handlePurchase = async () => {
    try {
      setState({ status: 'processing' });

      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/mobile/login');
        return;
      }

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

      // In production, this would open WeChat Pay
      // For now, simulate successful payment
      await simulatePayment(data.orderNo);
      
    } catch (err) {
      console.error('Purchase error:', err);
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : '购买失败，请重试',
      });
    }
  };

  const simulatePayment = async (orderNo: string) => {
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    const token = localStorage.getItem('token');
    
    // Verify payment
    const res = await fetch('/api/subscriptions/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderNo }),
    });

    const data = await res.json();

    if (data.success) {
      setState({ status: 'success' });
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/mobile/courses?gradeId=${gradeId}&gradeName=${encodeURIComponent(gradeName)}`);
      }, 2000);
    } else {
      throw new Error('支付验证失败');
    }
  };

  const handleBack = () => {
    router.back();
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
          <h1 className="text-lg font-semibold text-gray-800">购买课程</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{gradeName}</h2>
          
          <div className="border-t border-gray-100 pt-4 mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">课程价格</span>
              <span className="font-semibold text-gray-800">¥{price}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">有效期</span>
              <span className="text-gray-800">365 天</span>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-blue-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">购买说明</span>
            </div>
            <p className="text-sm text-blue-600 mt-2">
              购买后有效期 1 年，期间可无限次学习。课程内容将持续更新。
            </p>
          </div>
        </div>

        {/* Purchase Status */}
        {state.status === 'processing' && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
              <p className="text-gray-600">正在处理支付...</p>
            </div>
          </div>
        )}

        {state.status === 'success' && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
            <div className="flex flex-col items-center">
              <div className="text-green-500 text-5xl mb-3">✓</div>
              <p className="text-gray-800 font-medium">购买成功！</p>
              <p className="text-sm text-gray-500 mt-1">正在跳转...</p>
            </div>
          </div>
        )}

        {state.status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-red-700">{state.message}</p>
          </div>
        )}

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={state.status === 'processing'}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition"
        >
          {state.status === 'processing' ? '处理中...' : `立即购买 ¥${price}`}
        </button>

        {/* Dev mode skip - direct access */}
        <button
          onClick={() => {
            router.push(`/mobile/courses?gradeId=${gradeId}&gradeName=${encodeURIComponent(gradeName)}`);
          }}
          className="w-full mt-4 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition"
        >
          🔧 开发模式：直接进入课程
        </button>
      </main>
    </div>
  );
}
