'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sanitizeImageUrl, validateSubjectId, validateGradeId, sanitizeSubjectName } from '@/lib/utils/security';

interface Course {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  videoUrl?: string;
  duration?: number;
  sortOrder: number;
  prerequisites?: string[];
}

interface Island {
  id: string;
  title: string;
  description?: string;
  locked: boolean;
  completed: boolean;
  stars: number;
  isTrial?: boolean;
  x: number;
  y: number;
  prerequisites: string[];
  unlocked: boolean;
  classroomId?: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Grade {
  id: string;
  name: string;
  textbookId: string;
}

interface User {
  id: string;
  nickname: string;
  avatarUrl?: string;
  phone?: string;
}

export default function AdventureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = searchParams.get('subjectId');
  const gradeId = searchParams.get('gradeId');
  const subjectName = sanitizeSubjectName(searchParams.get('subjectName'));

  const [islands, setIslands] = useState<Island[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockedCount, setUnlockedCount] = useState(2);
  const [gradeInfo, setGradeInfo] = useState<{id: string; name: string} | null>(null);
  const [selectedIsland, setSelectedIsland] = useState<Island | null>(null);
  const [showExternalCourse, setShowExternalCourse] = useState(false);
  
  // User state
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ phone: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Configuration modal state
  const [showConfig, setShowConfig] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  
  // Drag state
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });
  
  // Validation state
  const [validationError, setValidationError] = useState<string | null>(null);

  const MAP_WIDTH = 1200;
  const MAP_HEIGHT = 1600;

  useEffect(() => {
    console.log('Adventure useEffect - subjectId:', subjectId, 'gradeId:', gradeId);
    
    if (!validateSubjectId(subjectId)) {
      setValidationError('无效的科目ID');
      setLoading(false);
      return;
    }
    
    if (gradeId && !validateGradeId(gradeId)) {
      setValidationError('无效的年级ID');
      setLoading(false);
      return;
    }
    
    checkAuth();
    loadGradesAndCourses();
    loadSubjects();
  }, [subjectId, gradeId, router]);

  const loadSubjects = async () => {
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      setSubjects(data.subjects || []);
    } catch (err) {
      console.error('Load subjects error:', err);
    }
  };

  const loadGradesForSubject = async (subjectId: string) => {
    try {
      const textbooksRes = await fetch(`/api/textbooks?subjectId=${subjectId}`);
      const textbooksData = await textbooksRes.json();
      const textbooks = textbooksData.textbooks || [];
      
      if (textbooks.length > 0) {
        const gradesRes = await fetch(`/api/grades?textbookId=${textbooks[0].id}`);
        const gradesData = await gradesRes.json();
        setGrades(gradesData.grades || []);
      }
    } catch (err) {
      console.error('Load grades error:', err);
    }
  };

  const handleSubjectChange = (subject: Subject) => {
    loadGradesForSubject(subject.id);
  };

  const handleGradeSelect = (subject: Subject, grade: Grade) => {
    router.push(`/mobile/adventure?subjectId=${subject.id}&subjectName=${encodeURIComponent(subject.name)}&gradeId=${grade.id}`);
    setShowConfig(false);
  };

  // User authentication functions
  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsLoggedIn(true);
      } catch (e) {
        console.error('Failed to parse user data:', e);
        logout();
      }
    }
  };

  const login = async () => {
    if (!loginForm.phone || !loginForm.password) {
      setLoginError('请输入手机号和密码');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/auth/password-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: loginForm.phone,
          password: loginForm.password,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setLoginForm({ phone: '', password: '' });
        loadGradesAndCourses(); // Refresh courses after login
      } else {
        setLoginError(data.error || '登录失败');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('登录失败，请稍后重试');
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsLoggedIn(false);
    loadGradesAndCourses(); // Refresh courses after logout
  };

  // Mouse/Touch handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({
      x: Math.min(0, Math.max(-(MAP_WIDTH - window.innerWidth), offsetStart.current.x + dx)),
      y: Math.min(0, Math.max(-(MAP_HEIGHT - window.innerHeight + 150), offsetStart.current.y + dy)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    offsetStart.current = { ...offset };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    const dy = e.touches[0].clientY - dragStart.current.y;
    setOffset({
      x: Math.min(0, Math.max(-(MAP_WIDTH - window.innerWidth), offsetStart.current.x + dx)),
      y: Math.min(0, Math.max(-(MAP_HEIGHT - window.innerHeight + 150), offsetStart.current.y + dy)),
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const loadGradesAndCourses = async () => {
    try {
      setLoading(true);
      console.log('Loading courses for subject:', subjectId);
      
      console.log('Step 1: Fetching textbooks...');
      const textbooksRes = await fetch(`/api/textbooks?subjectId=${subjectId}`);
      if (!textbooksRes.ok) {
        throw new Error(`Textbooks API failed: ${textbooksRes.status}`);
      }
      const textbooksData = await textbooksRes.json();
      const textbooks = textbooksData.textbooks || [];
      console.log('Textbooks found:', textbooks.length);
      
      if (textbooks.length === 0) {
        console.log('No textbooks found');
        setLoading(false);
        return;
      }
      
      console.log('Step 2: Fetching grades...');
      const gradesRes = await fetch(`/api/grades?textbookId=${textbooks[0].id}`);
      if (!gradesRes.ok) {
        throw new Error(`Grades API failed: ${gradesRes.status}`);
      }
      const gradesData = await gradesRes.json();
      const grades = gradesData.grades || [];
      console.log('Grades found:', grades.length);
      
      if (grades.length === 0) {
        console.log('No grades found');
        setLoading(false);
        return;
      }
      
      const targetGradeId = gradeId || grades[0].id;
      const targetGrade = grades.find((g: any) => g.id === targetGradeId) || grades[0];
      console.log('Target grade:', targetGrade.name);
      setGradeInfo({ id: targetGrade.id, name: targetGrade.name });
      
      console.log('Step 3: Fetching courses...');
      // Get token from localStorage
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const coursesRes = await fetch(`/api/user/courses?gradeId=${targetGrade.id}`, { headers });
      if (!coursesRes.ok) {
        throw new Error(`Courses API failed: ${coursesRes.status}`);
      }
      const coursesData = await coursesRes.json();
      console.log('User courses response:', coursesData);
      
      const positions = [
        { x: 150, y: 1400 },
        { x: 400, y: 1250 },
        { x: 250, y: 1050 },
        { x: 550, y: 900 },
        { x: 350, y: 700 },
        { x: 700, y: 600 },
        { x: 500, y: 400 },
        { x: 850, y: 350 },
        { x: 650, y: 200 },
        { x: 950, y: 150 },
      ];
      
      const courses = coursesData.courses || [];
      console.log('Courses found:', courses.length);
      
      if (courses.length === 0) {
        console.log('No courses found');
        setLoading(false);
        return;
      }
      
      // Fetch learning progress
      let progressMap: Record<string, { progress: number; completed: boolean; stars: number }> = {};
      if (token) {
        try {
          const progressRes = await fetch('/api/user/progress', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ gradeId: targetGrade.id }),
          });
          const progressData = await progressRes.json();
          progressMap = progressData.progress || {};
          console.log('Learning progress:', progressMap);
        } catch (err) {
          console.error('Failed to fetch progress:', err);
        }
      }
      
      const tempIslands: Island[] = [];
      
      courses.forEach((course: Course & { isFree?: boolean; unlocked?: boolean }, index: number) => {
        const isTrial = course.isFree || false;
        const prerequisites = course.prerequisites || [];
        const unlocked = course.unlocked !== undefined ? course.unlocked : (isTrial || prerequisites.length === 0);
        
        // Get progress from progressMap
        const progress = progressMap[course.id] || { progress: 0, completed: false, stars: 0 };
        
        console.log('Course:', course.title, 'prerequisites:', prerequisites, 'isFree:', isTrial, 'unlocked:', unlocked, 'completed:', progress.completed, 'stars:', progress.stars);
        
        tempIslands.push({
          id: course.id,
          title: course.title,
          description: course.description,
          locked: !unlocked,
          completed: progress.completed,
          stars: progress.stars,
          isTrial,
          x: positions[index % positions.length].x,
          y: positions[index % positions.length].y,
          prerequisites,
          unlocked,
          classroomId: (course as Course & { classroomId?: string }).classroomId,
        });
      });
      
      console.log('Islands created:', tempIslands.length);
      setIslands(tempIslands);
    } catch (err) {
      console.error('Load courses error:', err);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const handleIslandClick = (island: Island) => {
    if (isDragging) return;
    
    if (island.locked || !island.unlocked) {
      setSelectedIsland(island);
      return;
    }
    
    if (island.classroomId) {
      router.push(`/mobile/classroom/${island.classroomId}?mode=adventure&courseId=${island.id}`);
    } else {
      console.warn('No classroom associated with course:', island.title);
    }
  };

  const [stars, setStars] = useState<{ id: number; x: number; y: number; size: number; opacity: number; delay: number }[]>([]);
  const [clouds, setClouds] = useState<{ id: number; x: number; y: number; scale: number; delay: number }[]>([]);

  useEffect(() => {
    const generateStars = () => {
      return Array.from({ length: 100 }, (_, i) => ({
        id: i,
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        size: 1 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.7,
        delay: Math.random() * 3,
      }));
    };

    const generateClouds = () => {
      return Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        scale: 0.5 + Math.random() * 0.8,
        delay: Math.random() * 10,
      }));
    };

    setStars(generateStars());
    setClouds(generateClouds());
  }, []);

  const currentSubject = subjects.find(s => s.id === subjectId);

  return (
    <div className="h-screen bg-gradient-to-b from-indigo-950 via-purple-900 to-blue-900 overflow-hidden relative">
      {/* Validation Error State */}
      {validationError && !loading && (
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-purple-900 to-blue-900 flex items-center justify-center z-50">
          <div className="text-center p-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <p className="text-red-400 mb-2">{validationError}</p>
            <p className="text-white/70 text-sm mb-4">请检查链接是否正确</p>
            <button
              onClick={() => router.push('/mobile')}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              返回首页
            </button>
          </div>
        </div>
      )}
      
      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-purple-900 to-blue-900 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
            <p className="text-white/70 text-sm">加载课程数据...</p>
          </div>
        </div>
      )}
      
      {/* Fixed Header */}
      <header className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-white drop-shadow-md">{gradeInfo?.name || subjectName}</h1>
            <p className="text-xs text-white/70">星球探索 · 拖动查看更多</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Settings Button */}
            <button
              onClick={() => {
                setShowConfig(true);
                if (currentSubject) {
                  loadGradesForSubject(currentSubject.id);
                }
              }}
              className="p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            {/* User Profile / Login */}
            {isLoggedIn && user ? (
              <div className="relative">
                <button className="p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition flex items-center gap-2">
                  {user.avatarUrl ? (
                    <img 
                      src={sanitizeImageUrl(user.avatarUrl)} 
                      alt={user.nickname} 
                      className="w-8 h-8 rounded-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {user.nickname?.[0] || '?'}
                    </div>
                  )}
                  <span className="text-white text-sm font-medium">{user.nickname || '用户'}</span>
                </button>
                {/* Logout menu */}
                <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
                  <button
                    onClick={logout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    退出登录
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium text-sm hover:opacity-90 transition"
              >
                登录
              </button>
            )}
            
            <div className="flex items-center gap-1 bg-yellow-400/90 px-3 py-1.5 rounded-full shadow-lg">
              <span className="text-lg">⭐</span>
              <span className="text-white font-bold text-sm">{islands.filter(i => i.completed).length}/{islands.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Draggable Map */}
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          width: MAP_WIDTH,
          height: MAP_HEIGHT,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background stars */}
        {stars.map(star => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animationDelay: `${star.delay}s`,
              animationDuration: `${2 + star.delay}s`,
            }}
          />
        ))}

        {/* Floating clouds */}
        {clouds.map(cloud => (
          <div
            key={cloud.id}
            className="absolute pointer-events-none"
            style={{
              left: cloud.x,
              top: cloud.y,
              transform: `scale(${cloud.scale})`,
              animation: `cloudFloat ${15 + cloud.delay}s ease-in-out infinite`,
              animationDelay: `${cloud.delay}s`,
            }}
          >
            <div className="text-white/20 text-8xl">☁️</div>
          </div>
        ))}

        {/* Nebula effects */}
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" style={{ left: 200, top: 300 }} />
        <div className="absolute w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" style={{ left: 700, top: 800 }} />
        <div className="absolute w-72 h-72 bg-pink-500/20 rounded-full blur-3xl" style={{ left: 400, top: 1200 }} />

        {/* Connection paths */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {islands.map((island) => {
            if (!island.prerequisites || island.prerequisites.length === 0) return null;
            
            return island.prerequisites.map((prereqId) => {
              const prevIsland = islands.find(i => i.id === prereqId);
              if (!prevIsland) return null;
              
              const isActive = island.unlocked && !island.locked;
              
              return (
                <path
                  key={`${prevIsland.id}-${island.id}`}
                  d={`M ${prevIsland.x} ${prevIsland.y} Q ${(prevIsland.x + island.x) / 2} ${Math.min(prevIsland.y, island.y) - 50} ${island.x} ${island.y}`}
                  stroke={isActive ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)"}
                  strokeWidth="3"
                  strokeDasharray={isActive ? "0" : "10,10"}
                  fill="none"
                  className={isActive ? "drop-shadow-lg" : ""}
                />
              );
            });
          })}
        </svg>

        {/* Islands */}
        {islands.map((island, index) => (
          <button
            key={island.id}
            onClick={() => handleIslandClick(island)}
            className={`absolute transition-all duration-300 ${
              island.locked || !island.unlocked ? 'opacity-40 grayscale' : 'hover:scale-110 active:scale-95'
            }`}
            style={{
              left: island.x,
              top: island.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {!island.locked && island.unlocked && (
              <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-xl scale-150 animate-pulse" />
            )}
            
            <div className={`relative text-7xl drop-shadow-2xl ${
              island.completed ? 'animate-bounce' : ''
            }`}>
              {island.locked || !island.unlocked ? '🏝️' : island.completed ? '🎊' : '🌌'}
            </div>
            
            <div className={`absolute -top-3 -left-3 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-lg backdrop-blur-sm ${
              island.completed 
                ? 'bg-green-500 text-white' 
                : island.locked || !island.unlocked
                ? 'bg-gray-700/80 text-gray-300'
                : 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
            }`}>
              {island.completed ? '✓' : island.locked || !island.unlocked ? '🔒' : index + 1}
            </div>
            
            {island.isTrial && island.unlocked && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                免费
              </div>
            )}
            
            {!island.locked && island.unlocked && (
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                {[1, 2, 3].map(star => (
                  <span 
                    key={star} 
                    className={`text-lg ${star <= island.stars ? 'text-yellow-400' : 'text-gray-500'}`}
                  >
                    ⭐
                  </span>
                ))}
              </div>
            )}
            
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-black/70 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-lg shadow-lg">
              {island.title}
            </div>
          </button>
        ))}

        {/* Treasure */}
        {islands.length > 0 && (
          <div 
            className="absolute"
            style={{ 
              left: islands[islands.length - 1].x + 150, 
              top: islands[islands.length - 1].y - 80,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="text-6xl animate-bounce drop-shadow-2xl">
              {islands.every(i => i.completed) ? '🎁' : '📦'}
            </div>
            <div className="mt-2 text-white text-sm whitespace-nowrap bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg">
              {islands.every(i => i.completed) ? '宝藏已解锁！' : '终极宝藏'}
            </div>
          </div>
        )}
      </div>

      {/* WeChat QR Code Modal */}
      {selectedIsland && (selectedIsland.locked || !selectedIsland.unlocked) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-white/20">
            <div className="text-center">
              <div className="text-6xl mb-4">🔐</div>
              <h2 className="text-xl font-bold text-white mb-2">星球未解锁</h2>
              <p className="text-white/70 mb-4">
                「{selectedIsland.title}」需要解锁权限
              </p>
              
              {!selectedIsland.isTrial && selectedIsland.prerequisites.length > 0 && (
                <div className="bg-black/30 rounded-xl p-3 mb-4">
                  <p className="text-white/60 text-sm">
                    需要先完成：{islands.find(i => i.id === selectedIsland.prerequisites[0])?.title}
                  </p>
                </div>
              )}
              
              {/* QR Code */}
              <div className="bg-white rounded-xl p-4 mb-4">
                <img
                  src="/viete-learning.jpg"
                  alt="微信二维码"
                  className="w-full h-auto rounded-lg"
                />
              </div>
              
              <p className="text-white/80 mb-4">
                📱 添加管理员微信好友<br/>
                获取课程解锁权限
              </p>
              
              <button
                onClick={() => setSelectedIsland(null)}
                className="w-full bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition-all active:scale-95"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* External Course Modal */}
      {showExternalCourse && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-900 to-purple-900">
            <h2 className="text-lg font-bold text-white">课程学习</h2>
            <button
              onClick={() => setShowExternalCourse(false)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 w-full">
            <iframe
              src={`${typeof window !== 'undefined' ? window.location.origin : ''}/classroom/x4KkOP4v8fcoLwv2ICn09`}
              className="w-full h-full"
              title="课程学习"
              frameBorder="0"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">选择年级/科目</h2>
              <button
                onClick={() => setShowConfig(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Subjects */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-600 mb-2">科目</h3>
              <div className="grid grid-cols-3 gap-2">
                {subjects.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => handleSubjectChange(subject)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                      currentSubject?.id === subject.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {subject.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Grades */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">年级</h3>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {grades.map((grade) => (
                  <button
                    key={grade.id}
                    onClick={() => currentSubject && handleGradeSelect(currentSubject, grade)}
                    className={`py-3 px-4 rounded-lg text-sm font-medium text-left transition ${
                      gradeInfo?.id === grade.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {grade.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed bottom info */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-4 px-4">
        <div className="flex items-center justify-between text-sm text-white/80 mb-1">
          <span>探索进度</span>
          <span>{Math.round((islands.filter(i => i.completed).length / Math.max(islands.length, 1)) * 100)}%</span>
        </div>
        <div className="bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur-sm">
          <div 
            className="bg-gradient-to-r from-green-400 to-blue-500 h-full transition-all duration-500 rounded-full"
            style={{ width: `${(islands.filter(i => i.completed).length / Math.max(islands.length, 1)) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-white/60">
          <span>👆 拖动探索星球</span>
          <span>·</span>
          <span>{unlockedCount} 个免费试用</span>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl">
                  🎓
                </div>
                <h1 className="text-2xl font-bold text-gray-800">韦达学习</h1>
              </div>
              <p className="text-gray-500 text-sm">AI 交互式学习平台</p>
            </div>
            
            {loginError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {loginError}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                <input
                  type="tel"
                  value={loginForm.phone}
                  onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })}
                  placeholder="请输入手机号"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="请输入密码"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>
            
            <button
              onClick={login}
              disabled={loginLoading}
              className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginLoading ? '登录中...' : '登录'}
            </button>
            
            <button
              onClick={() => setShowLoginModal(false)}
              className="w-full mt-3 text-gray-500 text-sm hover:text-gray-700 transition"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes cloudFloat {
          0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
          33% { transform: translateY(-20px) translateX(10px) rotate(2deg); }
          66% { transform: translateY(10px) translateX(-10px) rotate(-2deg); }
        }
      `}</style>
    </div>
  );
}
