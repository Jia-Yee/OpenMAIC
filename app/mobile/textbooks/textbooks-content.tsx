'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Textbook {
  id: string;
  name: string;
  publisher?: string;
  gradeRange?: string;
  description?: string;
  coverUrl?: string;
}

export default function TextbooksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = searchParams.get('subjectId');
  const subjectName = searchParams.get('subjectName') || '科目';

  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectId) {
      router.push('/mobile');
      return;
    }
    loadTextbooks();
  }, [subjectId, router]);

  const loadTextbooks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/textbooks?subjectId=${subjectId}`);
      const data = await res.json();
      setTextbooks(data.textbooks || []);
    } catch (err) {
      console.error('Load textbooks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTextbookClick = (textbook: Textbook) => {
    router.push(`/mobile/grades?textbookId=${textbook.id}&textbookName=${encodeURIComponent(textbook.name)}`);
  };

  const handleBack = () => {
    router.push('/mobile');
  };

  // Textbook colors
  const textbookColors = [
    'from-red-50 to-red-100 border-red-200',
    'from-blue-50 to-blue-100 border-blue-200',
    'from-green-50 to-green-100 border-green-200',
    'from-purple-50 to-purple-100 border-purple-200',
    'from-orange-50 to-orange-100 border-orange-200',
  ];

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
            <h1 className="text-lg font-semibold text-gray-800">{subjectName}</h1>
            <p className="text-xs text-gray-500">选择教材版本</p>
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
        ) : textbooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-gray-500">暂无教材</p>
          </div>
        ) : (
          <div className="space-y-3">
            {textbooks.map((textbook, index) => (
              <button
                key={textbook.id}
                onClick={() => handleTextbookClick(textbook)}
                className={`w-full bg-gradient-to-r ${textbookColors[index % textbookColors.length]} border rounded-xl p-4 text-left transition-all active:scale-98`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-lg">
                      {textbook.name}
                    </h3>
                    {textbook.publisher && (
                      <p className="text-sm text-gray-600 mt-1">{textbook.publisher}</p>
                    )}
                    {textbook.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                        {textbook.description}
                      </p>
                    )}
                    {textbook.gradeRange && (
                      <div className="inline-block mt-2 px-2 py-1 bg-white/50 rounded text-xs text-gray-600">
                        {textbook.gradeRange}
                      </div>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
