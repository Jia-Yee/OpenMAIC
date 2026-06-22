'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon, PauseIcon, SquareIcon, Volume2Icon, MessageCircleIcon } from 'lucide-react';
import { useMobilePlayback } from '@/lib/hooks/use-mobile-playback';
import { CapacitorTTS } from '@/lib/hooks/use-capacitor-tts';
import type { PPTElement, PPTTextElement, PPTShapeElement, PPTImageElement, PPTLineElement, PPTLatexElement } from '@/lib/types/slides';
import { validateClassroomId, validateMode, sanitizeImageUrl } from '@/lib/utils/security';

// Types for scene data
interface SceneData {
  id: string;
  title: string;
  type: string;
  order: number;
  content: any;
  actions: any[];
  whiteboards: any[];
}

interface ClassroomData {
  id: string;
  title: string;
  description?: string;
  accessGranted: boolean;
}

export default function MobileClassroomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classroomId = params.id as string;
  const mode = searchParams.get('mode') || 'learning';
  const courseId = searchParams.get('courseId') || '';

  const [classroom, setClassroom] = useState<ClassroomData | null>(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [scenes, setScenes] = useState<SceneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!validateClassroomId(classroomId)) {
      setValidationError('无效的课程ID');
      setLoading(false);
      return;
    }
    
    if (!validateMode(mode)) {
      setValidationError('无效的模式参数');
      setLoading(false);
      return;
    }
    
    loadClassroom();
  }, [classroomId, mode]);

  const loadClassroom = async () => {
    try {
      setLoading(true);
      console.log('正在从服务器加载课程:', classroomId);

      // 从服务器 API 加载课程
      const response = await fetch(`/api/classrooms/${classroomId}`);
      const result = await response.json();

      if (!result.success) {
        console.error('课程不存在:', classroomId);
        alert('课程不存在，请返回课程列表');
        router.push('/mobile');
        return;
      }

      const data = result;
      console.log(`加载成功: ${data.title || '未命名'}, ${data.sceneCount} 个场景`);

      setClassroom({
        id: data.id,
        title: data.title || '未命名课堂',
        description: data.description || 'AI 生成的交互式课堂',
        accessGranted: data.accessGranted,
      });

      // 如果服务器返回了场景数据，使用它
      if (data.scenes && Array.isArray(data.scenes)) {
        const sceneList: SceneData[] = data.scenes.map((scene: any, index: number) => ({
          id: scene.id,
          title: scene.title,
          type: scene.type,
          order: scene.order || index,
          content: scene.content,
          actions: scene.actions || [],
          whiteboards: scene.whiteboard || [],
        }));
        setScenes(sceneList);
      } else {
        // 如果服务器没有返回完整课程数据，提示用户
        console.warn('服务器未返回完整课程数据');
        setScenes([]);
      }

      setError(null);
    } catch (err) {
      console.error('加载课程失败:', err);
      setError('加载课程失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // Get current scene
  const currentScene = scenes[currentSceneIndex];

  // Get actions for current scene
  const currentActions = useMemo(() => {
    if (!currentScene) return [];
    return currentScene.actions || [];
  }, [currentScene]);

  // Playback hook
  const {
    state: playbackState,
    currentActionIndex,
    lectureText,
    activeSpotlight,
    activeLaser,
    whiteboardStack,
    isSpeaking,
    play,
    pause,
    stop,
    prev,
    next,
  } = useMobilePlayback({
    actions: currentActions,
    disableTTS: !ttsEnabled,
    onSpeechStart: (text) => {
      console.log('开始朗读:', text.substring(0, 50) + '...');
    },
    onSpeechEnd: () => {
      console.log('朗读结束');
    },
    onEnd: () => {
      // 当前场景播放完成，自动前进到下一个场景
      console.log('[Page] Scene playback ended, advancing to next scene');
      handleNextScene();
    },
  });

  // Navigation handlers
  const handleNextScene = useCallback(() => {
    if (currentSceneIndex < scenes.length - 1) {
      stop();
      setCurrentSceneIndex(prev => prev + 1);
    } else {
      handleCourseComplete();
    }
  }, [currentSceneIndex, scenes.length, stop]);

  const handleCourseComplete = async () => {
    if (completed || !courseId) return;
    
    console.log('[Page] Course completed, updating progress');
    setCompleted(true);
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('[Page] No token, skipping progress update');
      return;
    }
    
    try {
      const response = await fetch('/api/user/progress', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId,
          progress: 100,
          completed: true,
          stars: 1,
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('[Page] Progress updated successfully');
      } else {
        console.error('[Page] Failed to update progress:', result.error);
      }
    } catch (err) {
      console.error('[Page] Error updating progress:', err);
    }
  };

  const handlePrevScene = useCallback(() => {
    if (currentSceneIndex > 0) {
      stop();
      setCurrentSceneIndex(prev => prev - 1);
    }
  }, [currentSceneIndex, stop]);

  // Playback control handlers
  const handlePlayPause = useCallback(() => {
    if (playbackState === 'playing') {
      pause();
    } else if (playbackState === 'paused') {
      play();
    } else {
      play();
    }
  }, [playbackState, pause, play]);

  // 监听用户交互以启用 TTS
  useEffect(() => {
    const enableTTS = () => {
      console.log('[Page] User interaction detected, enabling TTS');
      CapacitorTTS.onUserInteraction();
    };

    // 添加用户交互监听器
    window.addEventListener('click', enableTTS);
    window.addEventListener('touchstart', enableTTS);
    window.addEventListener('keydown', enableTTS);

    return () => {
      window.removeEventListener('click', enableTTS);
      window.removeEventListener('touchstart', enableTTS);
      window.removeEventListener('keydown', enableTTS);
    };
  }, []);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  // TTS handler — 统一走 CapacitorTTS，避免双音
  const handleSpeak = useCallback(async (text: string) => {
    if (!ttsEnabled || !text) return;
    try {
      await CapacitorTTS.speak({
        text,
        lang: 'zh-CN',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      });
    } catch (err) {
      console.warn('[Page] TTS speak failed:', err);
    }
  }, [ttsEnabled]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载课程中...</p>
        </div>
      </div>
    );
  }

  // Validation error state
  if (validationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <p className="text-red-600 mb-2">{validationError}</p>
          <p className="text-gray-500 text-sm mb-4">请检查链接是否正确</p>
          <button
            onClick={() => router.push('/mobile')}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            返回课程列表
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-4">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadClassroom}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // No scenes state
  if (!currentScene || scenes.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-white shadow-sm px-4 py-3 flex items-center">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeftIcon size={24} />
          </button>
          <h1 className="font-bold text-lg truncate flex-1 mx-4">{classroom?.title || '课堂'}</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">暂无内容</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* 顶部导航栏 */}
      <header className="shrink-0 bg-white shadow-sm px-4 py-2 flex items-center justify-between z-10">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeftIcon size={24} />
        </button>

        <div className="flex-1 text-center mx-2">
          <h1 className="font-bold text-base truncate">{classroom?.title || '课堂'}</h1>
          <p className="text-xs text-gray-500">
            场景 {currentSceneIndex + 1} / {scenes.length}
          </p>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-2 rounded-full transition ${showChat ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
            title="AI 对话"
          >
            <MessageCircleIcon size={20} />
          </button>
        </div>
      </header>

      {/* 场景类型和标题 */}
      <div className="shrink-0 bg-white px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
            {currentScene.type === 'slide' ? '幻灯片' :
             currentScene.type === 'quiz' ? '测验' :
             currentScene.type === 'interactive' ? '交互' : '其他'}
          </span>
          <span className="font-medium text-sm truncate">{currentScene.title || '无标题'}</span>
        </div>
      </div>

      {/* 主要内容区 - 幻灯片渲染 */}
      <main className="flex-1 overflow-hidden p-3 bg-gray-100">
        <div className="h-full flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-md overflow-hidden" style={{ width: '100%', maxHeight: 'calc(100vh - 200px)' }}>
            {/* 幻灯片内容渲染 */}
            <SlideRenderer
              scene={currentScene}
              spotlightTarget={activeSpotlight?.elementId || null}
            />

            {/* 白板覆盖层 */}
            {whiteboardStack.length > 0 && (
              <div className="absolute inset-0 bg-white z-10">
                <div className="p-4 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">白板</span>
                    <button
                      onClick={() => handleStop()}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <SquareIcon size={16} />
                    </button>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-2 relative overflow-hidden">
                    {whiteboardStack.map((el: any) => (
                      <WhiteboardElementRenderer key={el.id} element={el} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 朗读文本覆盖 */}
            {lectureText && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-8">
                <p className="text-white text-sm leading-relaxed">{lectureText}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 播放进度条 */}
      {currentActions.length > 0 && (
        <div className="shrink-0 px-4 py-2 bg-white border-t">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{currentActionIndex + 1} / {currentActions.length}</span>
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${((currentActionIndex + 1) / currentActions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* AI 聊天面板（可折叠） */}
      {showChat && (
        <div className="shrink-0 border-t bg-white max-h-48 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <MessageCircleIcon size={18} />
              AI 助手
            </h3>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              <p>💡 提示：在此输入您的问题，AI 老师会为您解答</p>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="输入问题..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部播放控制栏 */}
      <footer className="shrink-0 bg-white border-t px-4 py-3">
        <div className="flex items-center justify-between">
          {/* 上一个 */}
          <button
            onClick={handlePrevScene}
            disabled={currentSceneIndex === 0}
            className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <ChevronLeftIcon size={20} />
            <span className="text-sm">上一个</span>
          </button>

          {/* 播放控制 */}
          <div className="flex items-center gap-2">
            {/* 停止 */}
            <button
              onClick={handleStop}
              disabled={playbackState === 'idle'}
              className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              title="停止"
            >
              <SquareIcon size={20} />
            </button>

            {/* 播放/暂停 */}
            <button
              onClick={handlePlayPause}
              disabled={currentActions.length === 0}
              className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              title={playbackState === 'playing' ? '暂停' : '播放'}
            >
              {playbackState === 'playing' ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
            </button>

            {/* TTS 朗读 */}
            {lectureText && ttsEnabled && (
              <button
                onClick={() => handleSpeak(lectureText)}
                disabled={isSpeaking}
                className="p-2 rounded-full hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="重新朗读"
              >
                <Volume2Icon size={20} />
              </button>
            )}
          </div>

          {/* 下一个 */}
          <button
            onClick={handleNextScene}
            disabled={currentSceneIndex === scenes.length - 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <span className="text-sm">下一个</span>
            <ChevronRightIcon size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
}

// ==================== Slide Renderer ====================

interface SlideRendererProps {
  scene: SceneData;
  spotlightTarget: string | null;
}

function SlideRenderer({ scene, spotlightTarget }: SlideRendererProps) {
  console.log('[SlideRenderer] Scene type:', scene.type);
  console.log('[SlideRenderer] Scene title:', scene.title);
  console.log('[SlideRenderer] Scene content:', scene.content);
  
  // Handle quiz scenes
  if (scene.type === 'quiz') {
    return <QuizRenderer scene={scene} />;
  }

  // Handle interactive scenes
  if (scene.type === 'interactive') {
    return <InteractiveRenderer scene={scene} />;
  }

  const canvas = scene.content?.canvas;
  const elements = canvas?.elements || [];

  if (!canvas) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-lg font-bold mb-2">{scene.title || '无标题'}</h2>
          <p className="text-gray-500 text-sm">无法加载幻灯片内容</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center p-2 overflow-hidden"
      style={{
        backgroundColor: canvas.theme?.backgroundColor || '#ffffff',
      }}
    >
      {/* Use fixed-size canvas (1000x562.5 = 16:9) and scale to fit - same as OpenMAIC */}
      <div
        className="relative overflow-hidden rounded-lg shadow-lg"
        style={{
          width: 1000,
          height: 562.5,
          objectFit: 'contain',
        }}
      >
        {/* Defs for SVG markers */}
        <svg className="absolute w-0 h-0">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
            </marker>
          </defs>
        </svg>
        
        {elements.map((element: PPTElement) => (
          <SlideElement
            key={element.id}
            element={element}
            spotlightTarget={spotlightTarget}
          />
        ))}
      </div>
    </div>
  );
}

// ==================== Quiz Renderer ====================

interface QuizRendererProps {
  scene: SceneData;
}

type QuizPhase = 'not_started' | 'answering' | 'grading' | 'reviewing';

interface QuestionResult {
  questionId: string;
  correct: boolean | null;
  status: 'correct' | 'incorrect';
  earned: number;
}

function QuizRenderer({ scene }: QuizRendererProps) {
  const [phase, setPhase] = useState<QuizPhase>('not_started');
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [results, setResults] = useState<QuestionResult[]>([]);
  
  const questions = scene.content?.questions || [];
  const totalPoints = questions.reduce((sum: number, q: any) => sum + (q.points ?? 1), 0);

  const allAnswered = questions.every((q: any) => {
    const a = answers[q.id];
    if (!a) return false;
    if (Array.isArray(a)) return a.length > 0;
    return (a as string).trim().length > 0;
  });

  const handleSetAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    setPhase('grading');
    setTimeout(() => {
      const mockResults: QuestionResult[] = questions.map((q: any) => {
        const isCorrect = Math.random() > 0.3;
        return {
          questionId: q.id,
          correct: isCorrect,
          status: isCorrect ? 'correct' : 'incorrect',
          earned: isCorrect ? (q.points ?? 1) : Math.round((q.points ?? 1) * 0.5),
        };
      });
      setResults(mockResults);
      setPhase('reviewing');
    }, 1500);
  };

  const handleRetry = () => {
    setPhase('not_started');
    setAnswers({});
    setResults([]);
  };

  const resultMap: Record<string, QuestionResult> = {};
  results.forEach((r) => {
    resultMap[r.questionId] = r;
  });

  const earnedScore = results.reduce((sum, r) => sum + r.earned, 0);
  const correctCount = results.filter((r) => r.status === 'correct').length;

  if (phase === 'not_started') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-50 rounded-2xl flex items-center justify-center shadow-lg mb-6">
          <span className="text-4xl">📝</span>
        </div>
        <h2 className="text-xl font-bold text-gray-800 text-center mb-2">{scene.title}</h2>
        <p className="text-gray-500 text-sm mb-6">准备好测试你的知识了吗？</p>
        
        <div className="flex gap-6 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <span className="text-violet-500 text-sm font-medium">📚</span>
            </div>
            <span className="text-gray-600">{questions.length} 道题目</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <span className="text-violet-500 text-sm font-medium">🏆</span>
            </div>
            <span className="text-gray-600">共 {totalPoints} 分</span>
          </div>
        </div>

        <button
          onClick={() => setPhase('answering')}
          className="px-8 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          开始测验
          <span>→</span>
        </button>
      </div>
    );
  }

  if (phase === 'grading') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">AI 正在评分...</p>
        <p className="text-gray-400 text-sm mt-1">请稍候...</p>
      </div>
    );
  }

  if (phase === 'reviewing') {
    const pct = totalPoints > 0 ? Math.round((earnedScore / totalPoints) * 100) : 0;
    const colorClass = pct >= 80 ? 'from-emerald-500 to-teal-500' : pct >= 60 ? 'from-amber-500 to-yellow-500' : 'from-red-500 to-rose-500';
    const message = pct >= 80 ? '太棒了！' : pct >= 60 ? '继续加油！' : '需要复习';

    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
          <div className="flex items-center gap-2">
            <span className="text-green-500 text-lg">✓</span>
            <span className="font-semibold text-gray-800">测验报告</span>
          </div>
          <button
            onClick={handleRetry}
            className="text-sm text-gray-500 hover:text-violet-500"
          >
            重新开始
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className={`rounded-2xl p-6 bg-gradient-to-r text-white shadow-lg ${colorClass} mb-6`}>
            <p className="text-white/80 text-sm mb-1">{message}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{earnedScore}</span>
              <span className="text-white/60">/ {totalPoints}</span>
            </div>
            <div className="flex gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-white/30 rounded-full"></span>
                {correctCount} 正确
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-white/30 rounded-full"></span>
                {questions.length - correctCount} 错误
              </span>
            </div>
          </div>

          {questions.map((question: any, index: number) => {
            const result = resultMap[question.id];
            const isCorrect = result?.status === 'correct';
            return (
              <div
                key={question.id}
                className={`rounded-xl p-4 mb-4 border ${
                  isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isCorrect ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{question.question}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {question.type === 'single' ? '单选题' : question.type === 'multiple' ? '多选题' : '简答题'}
                      {' · '} {question.points ?? 1} 分
                    </p>
                    {question.type === 'short_answer' && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-400 mb-1">你的答案</p>
                        <p className="text-sm text-gray-700">{answers[question.id] || '未作答'}</p>
                      </div>
                    )}
                    {question.type === 'single' && question.options && (
                      <div className="mt-3 space-y-2">
                        {question.options.map((opt: any) => {
                          const isSelected = answers[question.id] === opt.value;
                          const isCorrectOpt = result?.correct && opt.value === question.answer;
                          return (
                            <div
                              key={opt.value}
                              className={`p-2 rounded-lg text-sm ${
                                isCorrectOpt ? 'bg-green-200 text-green-800' :
                                isSelected && !isCorrect ? 'bg-red-200 text-red-800' :
                                'bg-white text-gray-600'
                              }`}
                            >
                              {opt.value}. {opt.label}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {question.analysis && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                        <span className="font-medium">解析：</span>
                        {question.analysis}
                      </div>
                    )}
                  </div>
                  {result && (
                    <span className={`text-xl ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-2">
          <span className="text-violet-500 text-lg">📝</span>
          <span className="font-semibold text-gray-800">答题中</span>
          <span className="text-xs text-gray-400">
            {Object.keys(answers).filter((k) => {
              const a = answers[k];
              if (Array.isArray(a)) return a.length > 0;
              return typeof a === 'string' && a.trim().length > 0;
            }).length} / {questions.length}
          </span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            allAnswered
              ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          提交答案
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {questions.map((question: any, index: number) => {
          return (
            <div key={question.id} className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-start gap-3 mb-3">
                <span className="w-7 h-7 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-800">{question.question}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {question.type === 'single' ? '单选题' : question.type === 'multiple' ? '多选题' : '简答题'}
                    {' · '} {question.points ?? 1} 分
                  </p>
                </div>
              </div>

              {question.type === 'single' && question.options && (
                <div className="space-y-2">
                  {question.options.map((opt: any) => (
                    <button
                      key={opt.value}
                      onClick={() => handleSetAnswer(question.id, opt.value)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        answers[question.id] === opt.value
                          ? 'border-violet-400 bg-violet-50'
                          : 'border-gray-200 hover:border-violet-200'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        answers[question.id] === opt.value
                          ? 'bg-violet-500 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {opt.value}
                      </span>
                      <span className="text-gray-700">{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {question.type === 'multiple' && question.options && (
                <div className="space-y-2">
                  {question.options.map((opt: any) => {
                    const selected = (answers[question.id] as string[])?.includes(opt.value) || false;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          const current = (answers[question.id] as string[]) || [];
                          if (selected) {
                            handleSetAnswer(question.id, current.filter((v) => v !== opt.value));
                          } else {
                            handleSetAnswer(question.id, [...current, opt.value]);
                          }
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          selected
                            ? 'border-violet-400 bg-violet-50'
                            : 'border-gray-200 hover:border-violet-200'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                          selected
                            ? 'bg-violet-500 text-white'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {selected ? '✓' : opt.value}
                        </span>
                        <span className="text-gray-700">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {question.type === 'short_answer' && (
                <div className="relative">
                  <textarea
                    value={(answers[question.id] as string) || ''}
                    onChange={(e) => handleSetAnswer(question.id, e.target.value)}
                    placeholder="请输入你的答案..."
                    className="w-full min-h-[100px] p-3 pb-10 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                  />
                  <button
                    onClick={() => {
                      const recognition = new (window as any).webkitSpeechRecognition || new (window as any).SpeechRecognition();
                      recognition.lang = 'zh-CN';
                      recognition.onresult = (event: any) => {
                        const text = event.results[0][0].transcript;
                        const current = (answers[question.id] as string) || '';
                        handleSetAnswer(question.id, current + (current ? ' ' : '') + text);
                      };
                      recognition.start();
                    }}
                    className="absolute bottom-3 left-3 w-8 h-8 bg-violet-100 text-violet-500 rounded-full flex items-center justify-center hover:bg-violet-200 transition-colors"
                  >
                    🎤
                  </button>
                  <span className="absolute bottom-3 right-3 text-xs text-gray-400">
                    {(answers[question.id] as string || '').length} 字
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== Fallback Interactive ====================

interface FallbackInteractiveProps {
  scene: SceneData;
}

function FallbackInteractive({ scene }: FallbackInteractiveProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  const wheelItems = [
    { label: '3 ÷ 1/3 = 9', color: '#ef4444' },
    { label: '2 ÷ 1/2 = 4', color: '#f97316' },
    { label: '4 ÷ 1/4 = 16', color: '#eab308' },
    { label: '5 ÷ 1/5 = 25', color: '#22c55e' },
    { label: '6 ÷ 1/2 = 12', color: '#14b8a6' },
    { label: '8 ÷ 1/4 = 32', color: '#3b82f6' },
    { label: '10 ÷ 1/5 = 50', color: '#8b5cf6' },
    { label: '9 ÷ 1/3 = 27', color: '#ec4899' },
  ];

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setResult(null);
    
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * wheelItems.length);
      setResult(wheelItems[randomIndex].label);
      setIsSpinning(false);
    }, 3000);
  };

  if (scene.title?.includes('转盘')) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{scene.title}</h3>
        
        <div className="relative w-64 h-64 mb-6">
          <div 
            className={`absolute inset-0 rounded-full border-4 border-gray-200 shadow-lg transition-transform duration-[3000ms] ease-out ${
              isSpinning ? 'animate-spin' : ''
            }`}
            style={{ animationDuration: '3s' }}
          >
            {wheelItems.map((item, index) => {
              const angle = (index * 360) / wheelItems.length;
              return (
                <div
                  key={index}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(from ${angle}deg, ${item.color} 0deg, ${item.color} 45deg, transparent 45deg)`,
                  }}
                />
              );
            })}
            
            <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-violet-500"></div>
            </div>
          </div>
          
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-16 border-transparent border-b-violet-500"></div>
        </div>
        
        <button
          onClick={handleSpin}
          disabled={isSpinning}
          className={`px-8 py-3 rounded-full font-medium transition-all ${
            isSpinning
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {isSpinning ? '转动中...' : '开始转动'}
        </button>
        
        {result && (
          <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
            <p className="text-green-700 font-medium text-center">🎉 {result}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <span className="text-3xl">🎮</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{scene.title}</h3>
      <p className="text-gray-500 text-sm text-center">暂无交互内容</p>
    </div>
  );
}

// ==================== Interactive Renderer ====================

interface InteractiveRendererProps {
  scene: SceneData;
}

function InteractiveRenderer({ scene }: InteractiveRendererProps) {
  const content = scene.content;
  
  if (!content?.html) {
    return <FallbackInteractive scene={scene} />;
  }

  return (
    <div className="w-full h-full bg-white">
      <iframe
        srcDoc={content.html}
        className="w-full h-full border-0"
        title={`Interactive Scene ${scene.id}`}
        sandbox="allow-scripts allow-forms allow-popups"
        style={{ minHeight: '500px' }}
      />
    </div>
  );
}

function extractContent(html: string): { styles: string; scripts: string; bodyContent: string } {
  let styles = '';
  let scripts = '';
  
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleRegex.exec(html)) !== null) {
    styles += match[1] + '\n';
  }
  
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  while ((match = scriptRegex.exec(html)) !== null) {
    scripts += match[1] + '\n';
  }
  
  const bodyStart = html.indexOf('<body');
  if (bodyStart === -1) {
    return { styles, scripts, bodyContent: html };
  }
  
  const bodyOpenEnd = html.indexOf('>', bodyStart);
  if (bodyOpenEnd === -1) {
    return { styles, scripts, bodyContent: html };
  }
  
  const bodyEnd = html.lastIndexOf('</body>');
  if (bodyEnd === -1) {
    return { styles, scripts, bodyContent: html.substring(bodyOpenEnd + 1) };
  }
  
  return { styles, scripts, bodyContent: html.substring(bodyOpenEnd + 1, bodyEnd) };
}

function patchHtmlForIframe(html: string): string {
  const iframeCss = `<style data-iframe-patch>
  html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    overflow-y: auto;
  }
  body { min-height: 100vh; }
</style>`;

  const headIdx = html.indexOf('<head>');
  if (headIdx !== -1) {
    const insertPos = headIdx + 6;
    return html.substring(0, insertPos) + '\n' + iframeCss + html.substring(insertPos);
  }

  const headWithAttrs = html.indexOf('<head ');
  if (headWithAttrs !== -1) {
    const closeAngle = html.indexOf('>', headWithAttrs);
    if (closeAngle !== -1) {
      const insertPos = closeAngle + 1;
      return html.substring(0, insertPos) + '\n' + iframeCss + html.substring(insertPos);
    }
  }

  return iframeCss + html;
}

// ==================== Slide Element Renderer ====================

interface SlideElementProps {
  element: PPTElement;
  spotlightTarget: string | null;
}

function SlideElement({ element, spotlightTarget }: SlideElementProps) {
  const isSpotlighted = spotlightTarget === element.id;

  // Type-specific rendering - use pixel values directly like OpenMAIC
  switch (element.type) {
    case 'text':
      return <TextElement element={element as PPTTextElement} isSpotlighted={isSpotlighted} />;
    case 'shape':
      return <ShapeElement element={element as PPTShapeElement} isSpotlighted={isSpotlighted} />;
    case 'image':
      return <ImageElement element={element as PPTImageElement} isSpotlighted={isSpotlighted} />;
    case 'line':
      return <LineElement element={element as PPTLineElement} isSpotlighted={isSpotlighted} />;
    case 'latex':
      return <LatexElement element={element as PPTLatexElement} isSpotlighted={isSpotlighted} />;
    default:
      return null;
  }
}

// ==================== Text Element ====================

interface TextElementProps {
  element: PPTTextElement;
  isSpotlighted: boolean;
}

function TextElement({ element, isSpotlighted }: TextElementProps) {
  const style: React.CSSProperties = {
    position: 'absolute',
    top: `${element.top}px`,
    left: `${element.left}px`,
    width: `${element.width}px`,
    height: `${element.height}px`,
    transform: element.rotate ? `rotate(${element.rotate}deg)` : undefined,
    color: element.defaultColor || '#333333',
    fontFamily: element.defaultFontName || 'Microsoft YaHei',
    fontSize: element.textType === 'title' ? '32px' : element.textType === 'subtitle' ? '24px' : '18px',
    fontWeight: element.textType === 'title' || element.textType === 'subtitle' ? 'bold' : 'normal',
    lineHeight: element.lineHeight || 1.5,
    opacity: element.opacity ?? 1,
    backgroundColor: element.fill,
    padding: '10px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    filter: isSpotlighted ? 'brightness(1.2)' : undefined,
    transition: 'filter 0.3s ease',
  };

  return (
    <div
      style={style}
      className={isSpotlighted ? 'ring-4 ring-yellow-400 rounded' : ''}
      dangerouslySetInnerHTML={{ __html: element.content || '' }}
    />
  );
}

// ==================== Shape Element ====================

interface ShapeElementProps {
  element: PPTShapeElement;
  isSpotlighted: boolean;
}

function ShapeElement({ element, isSpotlighted }: ShapeElementProps) {
  const style: React.CSSProperties = {
    position: 'absolute',
    top: `${element.top}px`,
    left: `${element.left}px`,
    width: `${element.width}px`,
    height: `${element.height}px`,
    transform: element.rotate ? `rotate(${element.rotate}deg)` : undefined,
    backgroundColor: element.fill || 'transparent',
    border: element.outline ? `${element.outline.width}px ${element.outline.style} ${element.outline.color}` : undefined,
    borderRadius: '4px',
    boxShadow: element.shadow ? `${element.shadow.h}px ${element.shadow.v}px ${element.shadow.blur}px ${element.shadow.color}` : undefined,
    filter: isSpotlighted ? 'brightness(1.2)' : undefined,
    transition: 'filter 0.3s ease',
  };

  return (
    <div
      style={style}
      className={isSpotlighted ? 'ring-4 ring-yellow-400' : ''}
    />
  );
}

// ==================== Image Element ====================

interface ImageElementProps {
  element: PPTImageElement;
  isSpotlighted: boolean;
}

function ImageElement({ element, isSpotlighted }: ImageElementProps) {
  const style: React.CSSProperties = {
    position: 'absolute',
    top: `${element.top}px`,
    left: `${element.left}px`,
    width: `${element.width}px`,
    height: `${element.height}px`,
    transform: element.rotate ? `rotate(${element.rotate}deg)` : undefined,
    filter: isSpotlighted ? 'brightness(1.2)' : undefined,
    transition: 'filter 0.3s ease',
  };

  const safeSrc = sanitizeImageUrl(element.src);

  return (
    <div
      style={style}
      className={isSpotlighted ? 'ring-4 ring-yellow-400' : ''}
    >
      <img
        src={safeSrc}
        alt={element.name || 'image'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
        crossOrigin="anonymous"
      />
    </div>
  );
}

// ==================== Latex Element ====================

interface LatexElementProps {
  element: PPTLatexElement;
  isSpotlighted: boolean;
}

function LatexElement({ element, isSpotlighted }: LatexElementProps) {
  const style: React.CSSProperties = {
    position: 'absolute',
    top: `${element.top}px`,
    left: `${element.left}px`,
    width: `${element.width}px`,
    height: `${element.height}px`,
    transform: element.rotate ? `rotate(${element.rotate}deg)` : undefined,
    filter: isSpotlighted ? 'brightness(1.2)' : undefined,
    transition: 'filter 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  return (
    <div
      style={style}
      className={isSpotlighted ? 'ring-4 ring-yellow-400' : ''}
    >
      {element.html ? (
        <div
          className="max-w-full max-h-full"
          dangerouslySetInnerHTML={{ __html: element.html }}
          style={{
            transform: `scale(${Math.min(element.width / 200, element.height / 100, 1)})`,
            transformOrigin: 'center center',
          }}
        />
      ) : element.path && element.viewBox ? (
        <svg
          overflow="visible"
          width={element.width}
          height={element.height}
          stroke={element.color}
          strokeWidth={element.strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g
            transform={`scale(${element.width / element.viewBox[0]}, ${
              element.height / element.viewBox[1]
            }) translate(0,0) matrix(1,0,0,1,0,0)`}
          >
            <path d={element.path} />
          </g>
        </svg>
      ) : (
        <span className="text-gray-500 text-sm">LaTeX</span>
      )}
    </div>
  );
}

// ==================== Line Element ====================

interface LineElementProps {
  element: PPTLineElement;
  isSpotlighted: boolean;
}

function LineElement({ element, isSpotlighted }: LineElementProps) {
  const [x1, y1] = element.start;
  const [x2, y2] = element.end;

  const style: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'visible',
    filter: isSpotlighted ? 'drop-shadow-[0_0_8px_rgba(255,255,0,0.8)]' : undefined,
  };

  return (
    <svg style={style}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={element.color || '#333333'}
        strokeWidth={element.width || 2}
        strokeDasharray={element.style === 'dashed' ? '5,5' : undefined}
        markerEnd={element.points?.[1] === 'arrow' ? 'url(#arrowhead)' : undefined}
      />
    </svg>
  );
}

// ==================== Whiteboard Element Renderer ====================

interface WhiteboardElementRendererProps {
  element: {
    id: string;
    type: 'text' | 'shape' | 'line';
    content?: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    color?: string;
    shape?: 'rectangle' | 'circle' | 'triangle';
    points?: { startX: number; startY: number; endX: number; endY: number };
  };
}

function WhiteboardElementRenderer({ element }: WhiteboardElementRendererProps) {
  switch (element.type) {
    case 'text':
      return (
        <div
          className="absolute text-sm animate-fadeIn"
          style={{
            left: element.x,
            top: element.y,
            color: element.color || '#333333',
          }}
          dangerouslySetInnerHTML={{ __html: element.content || '' }}
        />
      );
    case 'shape':
      const shapeStyle: React.CSSProperties = {
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width || 100,
        height: element.height || 100,
        backgroundColor: element.color || '#5b9bd5',
        borderRadius: element.shape === 'circle' ? '50%' : '4px',
      };
      return <div style={shapeStyle} className="animate-fadeIn" />;
    case 'line':
      return (
        <svg
          className="absolute overflow-visible"
          style={{ left: 0, top: 0, width: '100%', height: '100%' }}
        >
          <line
            x1={element.points?.startX || 0}
            y1={element.points?.startY || 0}
            x2={element.points?.endX || 0}
            y2={element.points?.endY || 0}
            stroke={element.color || '#333333'}
            strokeWidth={2}
          />
        </svg>
      );
    default:
      return null;
  }
}
