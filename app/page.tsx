'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  ChevronRight,
  ChevronDown,
  Sparkles,
  Brain,
  Hash,
  Plus,
  Shapes,
  Ruler,
  Percent,
  BarChart3,
  Compass,
  Lightbulb,
  Languages,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Lang = 'zh' | 'en';

const i18n = {
  zh: {
    brand: '韦达学习',
    brandSub: '智能互动学习平台',
    heroBadge: 'AI驱动的个性化学习体验',
    heroTitle1: '让数学学习变得',
    heroTitle2: '有趣又高效',
    heroDesc: '通过互动式课程、AI讲解和趣味挑战，激发孩子对数学的兴趣，系统掌握小学阶段的数学知识。',
    treeTitle: '数学知识树',
    root: '小学数学',
    levels: [
      { label: '基础', sublabel: '1-2年级' },
      { label: '进阶', sublabel: '3-4年级' },
      { label: '提高', sublabel: '5-6年级' },
    ],
    modules: [
      { title: '数的认识', desc: '认识数字、数位、数的组成与分解', grades: ['1年级', '2年级', '3年级', '4年级'] },
      { title: '四则运算', desc: '加法、减法、乘法、除法及混合运算', grades: ['1年级', '2年级', '3年级', '4年级', '5年级'] },
      { title: '图形与几何', desc: '平面图形、立体图形、角、对称与变换', grades: ['1年级', '2年级', '3年级', '4年级', '5年级', '6年级'] },
      { title: '测量与单位', desc: '长度、面积、体积、时间、质量、货币', grades: ['1年级', '2年级', '3年级', '4年级', '5年级'] },
      { title: '分数与小数', desc: '分数的意义与运算、小数的认识与计算', grades: ['3年级', '4年级', '5年级', '6年级'] },
      { title: '统计与概率', desc: '数据收集、统计图表、可能性', grades: ['1年级', '2年级', '3年级', '5年级'] },
      { title: '方程与代数', desc: '简易方程、因数与倍数、比与比例', grades: ['5年级', '6年级'] },
      { title: '圆与比例', desc: '圆的认识与计算、正比例与反比例', grades: ['6年级'] },
    ],
    free: '免费',
    feature1Title: 'AI智能讲解',
    feature1Desc: '每道题都有AI老师详细讲解，理解难点，掌握解题思路。',
    feature2Title: '个性化学习',
    feature2Desc: '根据学习进度智能推荐课程，针对性提升薄弱环节。',
    feature3Title: '趣味挑战',
    feature3Desc: '游戏化学习体验，奖励机制激发学习动力，在快乐中成长进步。',
    ctaBtn: '开始学习',
    aboutTitle: '关于韦达学习',
    aboutDesc: '韦达学习是一个基于AI探索的各国数学教育课堂平台，由来自中国、美国、法国等国家的教育和技术团队成员共同开发。我们致力于将全球优秀的数学教育理念与AI技术相结合，为每个孩子提供个性化、互动式的学习体验。',
    aboutGlobal: '全球团队',
    aboutGlobalDesc: '来自不同国家的教育专家和工程师，融合多元文化视角',
    aboutAI: 'AI驱动',
    aboutAIDesc: '利用先进的人工智能技术，打造智能化的学习路径和互动课堂',
    aboutExplore: '探索式学习',
    aboutExploreDesc: '鼓励学生主动探索和发现，培养数学思维和问题解决能力',
    footer: '韦达学习 - 让学习更有趣',
  },
  en: {
    brand: 'Viete Learning',
    brandSub: 'Interactive Learning Platform',
    heroBadge: 'AI-Powered Personalized Learning',
    heroTitle1: 'Make Math Learning',
    heroTitle2: 'Fun & Effective',
    heroDesc: 'Through interactive lessons, AI explanations, and fun challenges, inspire your child\'s interest in math and systematically master elementary math.',
    treeTitle: 'Math Knowledge Tree',
    root: 'Elementary Math',
    levels: [
      { label: 'Basic', sublabel: 'Gr.1-2' },
      { label: 'Intermediate', sublabel: 'Gr.3-4' },
      { label: 'Advanced', sublabel: 'Gr.5-6' },
    ],
    modules: [
      { title: 'Numbers', desc: 'Recognize numbers, place values, composition & decomposition', grades: ['Gr.1', 'Gr.2', 'Gr.3', 'Gr.4'] },
      { title: 'Arithmetic', desc: 'Addition, subtraction, multiplication, division & mixed operations', grades: ['Gr.1', 'Gr.2', 'Gr.3', 'Gr.4', 'Gr.5'] },
      { title: 'Geometry', desc: 'Plane figures, solid figures, angles, symmetry & transformations', grades: ['Gr.1', 'Gr.2', 'Gr.3', 'Gr.4', 'Gr.5', 'Gr.6'] },
      { title: 'Measurement', desc: 'Length, area, volume, time, mass, currency', grades: ['Gr.1', 'Gr.2', 'Gr.3', 'Gr.4', 'Gr.5'] },
      { title: 'Fractions & Decimals', desc: 'Meaning & operations of fractions, understanding & calculation of decimals', grades: ['Gr.3', 'Gr.4', 'Gr.5', 'Gr.6'] },
      { title: 'Statistics & Probability', desc: 'Data collection, statistical charts, probability', grades: ['Gr.1', 'Gr.2', 'Gr.3', 'Gr.5'] },
      { title: 'Equations & Algebra', desc: 'Simple equations, factors & multiples, ratios & proportions', grades: ['Gr.5', 'Gr.6'] },
      { title: 'Circles & Proportions', desc: 'Understanding & calculation of circles, direct & inverse proportions', grades: ['Gr.6'] },
    ],
    free: 'Free',
    feature1Title: 'AI Tutoring',
    feature1Desc: 'Every problem has detailed AI explanations. Understand difficulties and master problem-solving strategies.',
    feature2Title: 'Personalized Learning',
    feature2Desc: 'Smart course recommendations based on progress. Targeted improvement for weak areas.',
    feature3Title: 'Fun Challenges',
    feature3Desc: 'Gamified learning experience with reward mechanisms. Grow and improve with joy.',
    ctaBtn: 'Start Learning',
    aboutTitle: 'About Viete Learning',
    aboutDesc: 'Viete Learning is an AI-powered platform for exploring math education classrooms across countries, developed by a team of educators and engineers from China, the United States, France, and beyond. We are dedicated to combining the world\'s finest math education philosophies with AI technology to provide every child with a personalized, interactive learning experience.',
    aboutGlobal: 'Global Team',
    aboutGlobalDesc: 'Education experts and engineers from different countries, blending diverse cultural perspectives',
    aboutAI: 'AI-Powered',
    aboutAIDesc: 'Leveraging advanced AI technology to create intelligent learning paths and interactive classrooms',
    aboutExplore: 'Exploratory Learning',
    aboutExploreDesc: 'Encouraging students to actively explore and discover, cultivating mathematical thinking and problem-solving skills',
    footer: 'Viete Learning - Making Learning Fun',
  },
};

interface Course {
  id: string;
  title: string;
  description?: string;
  classroomId?: string;
  isFree?: boolean;
  sortOrder: number;
}

interface ModuleNode {
  id: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  courseIds: string[];
  level: 'basic' | 'intermediate' | 'advanced';
}

// Floating math symbols that react to mouse
const MATH_SYMBOLS = ['π', '∑', '∫', '√', '∞', 'Δ', '±', '÷', '×', '≠', '≈', '∠', '⊥', '∥', '∝', '∇'];

interface FloatingSymbol {
  id: number;
  symbol: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  angle: number;
}

function FloatingMathSymbols({ mousePos }: { mousePos: { x: number; y: number } }) {
  const [symbols, setSymbols] = useState<FloatingSymbol[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSymbols(MATH_SYMBOLS.map((symbol, i) => ({
      id: i,
      symbol,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 14 + Math.random() * 24,
      opacity: 0.06 + Math.random() * 0.1,
      speed: 0.3 + Math.random() * 0.7,
      angle: Math.random() * 360,
    })));
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {symbols.map((s) => {
        const dx = (mousePos.x - 0.5) * s.speed * 30;
        const dy = (mousePos.y - 0.5) * s.speed * 30;
        return (
          <div
            key={s.id}
            className="absolute text-gray-400 font-mono transition-transform duration-[2000ms] ease-out"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              fontSize: `${s.size}px`,
              opacity: s.opacity,
              transform: `translate(${dx}px, ${dy}px) rotate(${s.angle + mousePos.x * 20}deg)`,
            }}
          >
            {s.symbol}
          </div>
        );
      })}
    </div>
  );
}

// Interactive geometric shape that follows mouse
function InteractiveShape({ mousePos, shape, className }: { 
  mousePos: { x: number; y: number }; 
  shape: 'triangle' | 'circle' | 'square' | 'hexagon';
  className?: string;
}) {
  const rotate = mousePos.x * 60 - 30;
  const scale = 0.9 + mousePos.y * 0.2;
  const translateX = (mousePos.x - 0.5) * 20;
  const translateY = (mousePos.y - 0.5) * 20;

  const shapePath = {
    triangle: 'M50 10 L90 85 L10 85 Z',
    circle: undefined,
    square: 'M15 15 L85 15 L85 85 L15 85 Z',
    hexagon: 'M50 5 L93 27.5 L93 72.5 L50 95 L7 72.5 L7 27.5 Z',
  };

  return (
    <div className={`transition-transform duration-700 ease-out ${className || ''}`}
      style={{ transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scale})` }}
    >
      {shape === 'circle' ? (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="8 4" />
        </svg>
      ) : (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d={shapePath[shape]} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="8 4" />
        </svg>
      )}
    </div>
  );
}

// Animated formula that reveals on hover
function HoverFormula({ formula, className }: { formula: string; className?: string }) {
  const [revealed, setRevealed] = useState(false);
  
  return (
    <div 
      className={`font-mono text-gray-300 cursor-default transition-all duration-500 ${revealed ? 'text-blue-400 scale-110' : ''} ${className || ''}`}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
    >
      {formula}
    </div>
  );
}

function HomePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('zh');
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [coursesMap, setCoursesMap] = useState<Record<string, Course[]>>({});
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const containerRef = useRef<HTMLDivElement>(null);

  const t = i18n[lang];

  // Detect browser language on mount
  useEffect(() => {
    const browserLang = navigator.language || navigator.languages?.[0] || '';
    if (browserLang.startsWith('zh')) {
      setLang('zh');
    } else {
      setLang('en');
    }
  }, []);

  // Track mouse position
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

  const mathModules: ModuleNode[] = [
    {
      id: 'numbers-basics',
      icon: <Hash className="w-4 h-4" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      dotColor: 'bg-blue-400',
      courseIds: ['course-rjb-1a-01', 'course-rjb-1a-03', 'course-rjb-1a-05', 'course-rjb-1b-04', 'course-rjb-4a-01'],
      level: 'basic',
    },
    {
      id: 'arithmetic',
      icon: <Plus className="w-4 h-4" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      dotColor: 'bg-green-400',
      courseIds: ['course-rjb-1a-03', 'course-rjb-1a-05', 'course-rjb-1b-02', 'course-rjb-2a-02', 'course-rjb-2a-04', 'course-rjb-2b-02', 'course-rjb-2b-04', 'course-rjb-2b-05', 'course-rjb-3a-02', 'course-rjb-3a-05', 'course-rjb-3b-02', 'course-rjb-3b-04', 'course-rjb-4b-01', 'course-rjb-4b-02'],
      level: 'basic',
    },
    {
      id: 'geometry',
      icon: <Shapes className="w-4 h-4" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-300',
      dotColor: 'bg-purple-400',
      courseIds: ['course-rjb-1a-04', 'course-rjb-1b-01', 'course-rjb-2a-03', 'course-rjb-2a-05', 'course-rjb-2b-03', 'course-rjb-4a-05', 'course-rjb-4b-05', 'course-rjb-5b-03', 'course-rjb-5b-05', 'course-rjb-6b-03'],
      level: 'basic',
    },
    {
      id: 'measurement',
      icon: <Ruler className="w-4 h-4" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      dotColor: 'bg-orange-400',
      courseIds: ['course-rjb-1b-05', 'course-rjb-2a-01', 'course-rjb-3a-01', 'course-rjb-3a-03', 'course-rjb-4a-02', 'course-rjb-5a-02'],
      level: 'intermediate',
    },
    {
      id: 'fractions-decimals',
      icon: <Percent className="w-4 h-4" />,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-300',
      dotColor: 'bg-pink-400',
      courseIds: ['course-rjb-4b-03', 'course-rjb-4b-04', 'course-rjb-5a-01', 'course-rjb-5a-03', 'course-rjb-5b-04', 'course-rjb-6a-01', 'course-rjb-6a-03'],
      level: 'intermediate',
    },
    {
      id: 'statistics',
      icon: <BarChart3 className="w-4 h-4" />,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-300',
      dotColor: 'bg-teal-400',
      courseIds: ['course-rjb-1b-03', 'course-rjb-2b-01', 'course-rjb-3b-03', 'course-rjb-5a-04'],
      level: 'intermediate',
    },
    {
      id: 'equations',
      icon: <Calculator className="w-4 h-4" />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-300',
      dotColor: 'bg-indigo-400',
      courseIds: ['course-rjb-5a-05', 'course-rjb-5b-02', 'course-rjb-6a-04', 'course-rjb-6b-04'],
      level: 'advanced',
    },
    {
      id: 'circles-proportion',
      icon: <Compass className="w-4 h-4" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-300',
      dotColor: 'bg-amber-400',
      courseIds: ['course-rjb-6a-05', 'course-rjb-6b-04'],
      level: 'advanced',
    },
  ];

  const levelStyles = [
    { key: 'basic' as const, color: 'bg-emerald-500', lightColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
    { key: 'intermediate' as const, color: 'bg-blue-500', lightColor: 'bg-blue-100', textColor: 'text-blue-700' },
    { key: 'advanced' as const, color: 'bg-purple-500', lightColor: 'bg-purple-100', textColor: 'text-purple-700' },
  ];

  useEffect(() => {
    loadAllCourses();
  }, []);

  const loadAllCourses = async () => {
    try {
      const gradesRes = await fetch('/api/grades');
      const gradesData = await gradesRes.json();
      const grades = gradesData.grades || [];

      const map: Record<string, Course[]> = {};
      for (const grade of grades) {
        try {
          const coursesRes = await fetch(`/api/courses?gradeId=${grade.id}`);
          const coursesData = await coursesRes.json();
          map[grade.id] = coursesData.courses || [];
        } catch {
          map[grade.id] = [];
        }
      }
      setCoursesMap(map);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  };

  const handleModuleClick = (moduleId: string) => {
    setExpandedModule(expandedModule === moduleId ? null : moduleId);
  };

  const handleCourseClick = (course: Course) => {
    if (course.classroomId) {
      router.push(`/mobile/classroom/${course.classroomId}?mode=adventure&courseId=${course.id}`);
    } else {
      router.push(`/mobile/classroom/${course.id}?mode=adventure&courseId=${course.id}`);
    }
  };

  const handleStartLearning = () => {
    router.push('/mobile/adventure?subjectId=subject-math&subjectName=数学');
  };

  const toggleLang = () => {
    setLang(prev => prev === 'zh' ? 'en' : 'zh');
  };

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove} className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden">
      {/* Floating math symbols background */}
      <FloatingMathSymbols mousePos={mousePos} />

      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t.brand}</h1>
                <p className="text-xs text-gray-500">{t.brandSub}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLang}
                className="gap-1.5 text-gray-600 hover:text-gray-900"
              >
                <Languages className="w-4 h-4" />
                <span className="text-sm font-medium">{lang === 'zh' ? 'EN' : '中文'}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 relative z-10">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 relative"
        >
          {/* Decorative shapes around hero */}
          <div className="absolute -left-16 top-0 w-24 h-24 text-blue-200 opacity-40">
            <InteractiveShape mousePos={mousePos} shape="triangle" />
          </div>
          <div className="absolute -right-12 top-8 w-20 h-20 text-indigo-200 opacity-40">
            <InteractiveShape mousePos={mousePos} shape="circle" />
          </div>
          <div className="absolute left-8 -bottom-4 w-16 h-16 text-purple-200 opacity-30">
            <InteractiveShape mousePos={mousePos} shape="hexagon" />
          </div>
          <div className="absolute right-16 -bottom-2 w-14 h-14 text-green-200 opacity-30">
            <InteractiveShape mousePos={mousePos} shape="square" />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>{t.heroBadge}</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t.heroTitle1}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">
              {t.heroTitle2}
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            {t.heroDesc}
          </p>
          <Button 
            size="lg"
            onClick={handleStartLearning}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 px-8 py-6 text-lg"
          >
            {t.ctaBtn}
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </motion.section>

        {/* Knowledge Tree */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16 relative"
        >
          {/* Side formulas */}
          <HoverFormula formula="a² + b² = c²" className="absolute -left-20 top-20 text-lg hidden xl:block" />
          <HoverFormula formula="E = mc²" className="absolute -right-16 top-40 text-lg hidden xl:block" />
          <HoverFormula formula="∫f(x)dx" className="absolute -left-24 bottom-20 text-lg hidden xl:block" />
          <HoverFormula formula="∑(1/n²)" className="absolute -right-20 bottom-10 text-lg hidden xl:block" />

          <h3 className="text-lg font-semibold text-gray-900 mb-8 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            {t.treeTitle}
          </h3>

          <div className="relative">
            {/* Root */}
            <div className="flex justify-center mb-0">
              <div className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white font-bold text-lg shadow-lg">
                {t.root}
              </div>
            </div>

            {/* Trunk line from root */}
            <div className="flex justify-center">
              <div className="w-0.5 h-8 bg-gray-300" />
            </div>

            {/* Horizontal connector */}
            <div className="relative flex justify-center">
              <div className="w-[85%] max-w-4xl h-0.5 bg-gray-300" />
            </div>

            {/* Three branches */}
            <div className="relative max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                {levelStyles.map((style, levelIdx) => {
                  const levelModules = mathModules.filter(m => m.level === style.key);
                  const levelText = t.levels[levelIdx];
                  return (
                    <div key={style.key} className="relative">
                      {/* Vertical line from horizontal connector to level node */}
                      <div className="flex justify-center">
                        <div className="w-0.5 h-6 bg-gray-300" />
                      </div>

                      {/* Level node */}
                      <div className="flex justify-center mb-2">
                        <div className={`px-4 py-2 ${style.lightColor} ${style.textColor} rounded-lg font-bold text-sm flex items-center gap-2`}>
                          <div className={`w-2 h-2 ${style.color} rounded-full`} />
                          {levelText.label}
                          <span className="font-normal opacity-70">{levelText.sublabel}</span>
                        </div>
                      </div>

                      {/* Vertical trunk for this level */}
                      <div className="flex justify-center">
                        <div className="w-0.5 h-4 bg-gray-200" />
                      </div>

                      {/* Module branches */}
                      <div className="space-y-0">
                        {levelModules.map((mod, idx) => {
                          const moduleText = t.modules[mathModules.indexOf(mod)];
                          return (
                            <div key={mod.id}>
                              <div className="flex items-start">
                                <div className="w-6 shrink-0 flex flex-col items-center">
                                  <div className={`w-0.5 ${idx === levelModules.length - 1 ? 'h-6' : 'h-full'} bg-gray-200`} />
                                </div>
                                <div className="h-6 flex items-center">
                                  <div className="w-4 h-0.5 bg-gray-200" />
                                </div>
                                <div className="flex-1 pb-3">
                                  <button
                                    onClick={() => handleModuleClick(mod.id)}
                                    className={`w-full bg-white rounded-lg border ${mod.borderColor} hover:shadow-md transition-all text-left overflow-hidden`}
                                  >
                                    <div className="px-3 py-2.5 flex items-center gap-3">
                                      <div className={`w-8 h-8 ${mod.bgColor} rounded-lg flex items-center justify-center ${mod.color} shrink-0`}>
                                        {mod.icon}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <h4 className="font-semibold text-gray-900 text-sm">{moduleText.title}</h4>
                                          <span className="text-[10px] text-gray-400">{moduleText.grades.join(' ')}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{moduleText.desc}</p>
                                      </div>
                                      <div className={`shrink-0 transition-transform ${expandedModule === mod.id ? 'rotate-180' : ''}`}>
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                      </div>
                                    </div>
                                  </button>

                                  <AnimatePresence>
                                    {expandedModule === mod.id && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
                                          {mod.courseIds.map((courseId) => {
                                            let course: Course | null = null;
                                            for (const gradeCourses of Object.values(coursesMap)) {
                                              const found = gradeCourses.find(c => c.id === courseId);
                                              if (found) { course = found; break; }
                                            }
                                            if (!course) return null;

                                            return (
                                              <button
                                                key={courseId}
                                                onClick={(e) => { e.stopPropagation(); handleCourseClick(course!); }}
                                                className="w-full flex items-center gap-2 p-2 bg-gray-50 hover:bg-blue-50 rounded-lg transition-all text-left group"
                                              >
                                                <div className={`w-1.5 h-1.5 rounded-full ${mod.dotColor} shrink-0`} />
                                                <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700 truncate">{course.title}</span>
                                                {course.isFree && (
                                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full shrink-0">{t.free}</span>
                                                )}
                                                <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-blue-500 shrink-0 ml-auto" />
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.section>

        {/* About */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">{t.aboutTitle}</h3>
            <p className="text-gray-600 max-w-3xl mx-auto text-center mb-8 leading-relaxed">
              {t.aboutDesc}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div 
                whileHover={{ y: -4, scale: 1.02 }} 
                className="text-center p-4"
              >
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{t.aboutGlobal}</h4>
                <p className="text-sm text-gray-500">{t.aboutGlobalDesc}</p>
              </motion.div>
              <motion.div 
                whileHover={{ y: -4, scale: 1.02 }} 
                className="text-center p-4"
              >
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Brain className="w-7 h-7 text-indigo-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{t.aboutAI}</h4>
                <p className="text-sm text-gray-500">{t.aboutAIDesc}</p>
              </motion.div>
              <motion.div 
                whileHover={{ y: -4, scale: 1.02 }} 
                className="text-center p-4"
              >
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Lightbulb className="w-7 h-7 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{t.aboutExplore}</h4>
                <p className="text-sm text-gray-500">{t.aboutExploreDesc}</p>
              </motion.div>
            </div>
          </div>
        </motion.section>
      </main>

      <footer className="bg-gray-50 border-t border-gray-100 mt-16 relative z-10">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>{t.footer}</p>
            <p className="mt-2">
              <a href="mailto:aimath@viete.xyz" className="text-blue-500 hover:text-blue-600 transition-colors">aimath@viete.xyz</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
