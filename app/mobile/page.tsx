'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlayIcon, LockIcon, ClockIcon } from 'lucide-react';

interface Classroom {
  id: string;
  title: string;
  description?: string;
  accessType: 'public' | 'private' | 'paid' | 'subscription';
  price?: number;
  trialEnabled?: boolean;
  thumbnail?: string;
  sceneCount?: number;
  createdAt: string;
}

export default function MobileHome() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    try {
      setLoading(true);
      console.log('正在从服务器加载课程列表...');

      // 从服务器 API 加载课程列表
      const response = await fetch('/api/classrooms');
      const result = await response.json();

      console.log('服务器返回:', result);

      if (!result.success) {
        throw new Error(result.message || '加载失败');
      }

      const classroomList: Classroom[] = result.classrooms.map((item: any) => ({
        id: item.id,
        title: item.name || '未命名课堂',
        description: item.description || 'AI 生成的交互式课堂',
        accessType: 'public',
        price: undefined,
        trialEnabled: false,
        thumbnail: undefined,
        sceneCount: item.sceneCount,
        createdAt: item.createdAt,
      }));

      console.log('转换后的课程列表:', classroomList);

      setClassrooms(classroomList);
      setDebugInfo(result.classrooms);
      setError(undefined);

      if (classroomList.length === 0) {
        console.log('服务器中暂无课程');
      }
    } catch (err) {
      console.error('加载课程失败:', err);
      setError('加载失败，请刷新页面重试');
      setClassrooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClassroomClick = (classroom: Classroom) => {
    if (classroom.accessType === 'public') {
      router.push(`/mobile/classroom/${classroom.id}`);
    } else {
      // 显示购买对话框或提示
      alert(`此课程需要购买（¥${classroom.price}）\n\n请联系管理员获取访问权限`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部导航栏 */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">OpenMAIC</h1>
            <p className="text-xs text-blue-100 mt-1">AI 交互式课堂</p>
          </div>
          <button
            onClick={loadClassrooms}
            className="p-2 hover:bg-blue-500 rounded-full transition"
            title="刷新"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="p-4 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-600 mb-2">{error}</p>
            <button
              onClick={loadClassrooms}
              className="text-blue-600 underline hover:text-blue-700"
            >
              重试
            </button>
          </div>
        ) : classrooms.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">暂无课程</h3>
            <p className="text-sm text-gray-500 mb-6">当前设备的浏览器数据库中没有课程</p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
              <h4 className="font-medium text-blue-900 mb-2">💡 如何添加课程？</h4>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>访问 Web 端生成课堂：<br/>
                  <a 
                    href="http://192.168.1.4:3000/" 
                    className="text-blue-600 underline hover:text-blue-700 break-all"
                  >
                    http://192.168.1.4:3000/
                  </a>
                </li>
                <li>输入主题，点击生成课堂</li>
                <li>返回此页面刷新即可看到课程</li>
              </ol>
            </div>

            <button
              onClick={() => window.location.href = 'http://192.168.1.4:3000/'}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
            >
              <span>前往 Web 端生成课堂</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>

        ) : (
          <div className="grid gap-4">
            {classrooms.map((classroom) => (
              <div
                key={classroom.id}
                onClick={() => handleClassroomClick(classroom)}
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow active:scale-95 transform duration-150"
              >
                {/* 课程缩略图区域 */}
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 relative">
                  {classroom.thumbnail ? (
                    <img
                      src={classroom.thumbnail}
                      alt={classroom.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-4xl">📚</span>
                    </div>
                  )}

                  {/* 权限标识 */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {classroom.accessType !== 'public' && (
                      <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                        <LockIcon size={12} />
                        ¥{classroom.price}
                      </span>
                    )}
                    {classroom.trialEnabled && (
                      <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                        可试看
                      </span>
                    )}
                  </div>
                </div>

                {/* 课程内容区 */}
                <div className="p-4">
                  <h2 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
                    {classroom.title}
                  </h2>
                  
                  {classroom.description && (
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                      {classroom.description}
                    </p>
                  )}

                  {/* 元信息 */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      {classroom.sceneCount && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {classroom.sceneCount} 个场景
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <ClockIcon size={14} />
                        {new Date(classroom.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="mt-4">
                    {classroom.accessType === 'public' ? (
                      <button className="w-full bg-blue-500 text-white py-2.5 rounded-lg font-medium hover:bg-blue-600 active:bg-blue-700 transition flex items-center justify-center gap-2">
                        <PlayIcon size={18} />
                        开始学习
                      </button>
                    ) : (
                      <button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2.5 rounded-lg font-medium hover:from-yellow-600 hover:to-orange-600 active:from-yellow-700 active:to-orange-700 transition flex items-center justify-center gap-2">
                        <LockIcon size={18} />
                        解锁课程
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* 调试信息面板（仅开发环境） */}
        {debugInfo && debugInfo.length > 0 && process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs">
            <h3 className="font-bold mb-2">🔍 调试信息</h3>
            <pre className="overflow-auto max-h-60">
              {JSON.stringify(debugInfo.map(s => ({
                id: s.id,
                name: s.name,
                nameType: typeof s.name,
                nameLength: s.name?.length,
                description: s.description
              })), null, 2)}
            </pre>
          </div>
        )}
      </main>

      {/* 底部说明 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 text-center text-xs text-gray-500">
        <p>OpenMAIC Player v0.1.0</p>
        <p className="mt-1">Powered by AI Multi-Agent Technology</p>
      </footer>
    </div>
  );
}
