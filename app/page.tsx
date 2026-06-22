'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  ChevronRight,
  ChevronDown,
  Sparkles,
  Brain,
  Target,
  Award,
  Hash,
  Plus,
  Shapes,
  Ruler,
  Percent,
  BarChart3,
  Compass,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  description: string;
  grades: string[];
  courseIds: string[];
  level: 'basic' | 'intermediate' | 'advanced';
}

function HomePage() {
  const router = useRouter();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [coursesMap, setCoursesMap] = useState<Record<string, Course[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const mathModules: ModuleNode[] = [
    {
      id: 'numbers-basics',
      title: '数的认识',
      icon: <Hash className="w-4 h-4" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      dotColor: 'bg-blue-400',
      description: '认识数字、数位、数的组成与分解',
      grades: ['1年级', '2年级', '3年级', '4年级'],
      courseIds: ['course-rjb-1a-01', 'course-rjb-1a-03', 'course-rjb-1a-05', 'course-rjb-1b-04', 'course-rjb-4a-01'],
      level: 'basic',
    },
    {
      id: 'arithmetic',
      title: '四则运算',
      icon: <Plus className="w-4 h-4" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      dotColor: 'bg-green-400',
      description: '加法、减法、乘法、除法及混合运算',
      grades: ['1年级', '2年级', '3年级', '4年级', '5年级'],
      courseIds: ['course-rjb-1a-03', 'course-rjb-1a-05', 'course-rjb-1b-02', 'course-rjb-2a-02', 'course-rjb-2a-04', 'course-rjb-2b-02', 'course-rjb-2b-04', 'course-rjb-2b-05', 'course-rjb-3a-02', 'course-rjb-3a-05', 'course-rjb-3b-02', 'course-rjb-3b-04', 'course-rjb-4b-01', 'course-rjb-4b-02'],
      level: 'basic',
    },
    {
      id: 'geometry',
      title: '图形与几何',
      icon: <Shapes className="w-4 h-4" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-300',
      dotColor: 'bg-purple-400',
      description: '平面图形、立体图形、角、对称与变换',
      grades: ['1年级', '2年级', '3年级', '4年级', '5年级', '6年级'],
      courseIds: ['course-rjb-1a-04', 'course-rjb-1b-01', 'course-rjb-2a-03', 'course-rjb-2a-05', 'course-rjb-2b-03', 'course-rjb-4a-05', 'course-rjb-4b-05', 'course-rjb-5b-03', 'course-rjb-5b-05', 'course-rjb-6b-03'],
      level: 'basic',
    },
    {
      id: 'measurement',
      title: '测量与单位',
      icon: <Ruler className="w-4 h-4" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      dotColor: 'bg-orange-400',
      description: '长度、面积、体积、时间、质量、货币',
      grades: ['1年级', '2年级', '3年级', '4年级', '5年级'],
      courseIds: ['course-rjb-1b-05', 'course-rjb-2a-01', 'course-rjb-3a-01', 'course-rjb-3a-03', 'course-rjb-4a-02', 'course-rjb-5a-02'],
      level: 'intermediate',
    },
    {
      id: 'fractions-decimals',
      title: '分数与小数',
      icon: <Percent className="w-4 h-4" />,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-300',
      dotColor: 'bg-pink-400',
      description: '分数的意义与运算、小数的认识与计算',
      grades: ['3年级', '4年级', '5年级', '6年级'],
      courseIds: ['course-rjb-4b-03', 'course-rjb-4b-04', 'course-rjb-5a-01', 'course-rjb-5a-03', 'course-rjb-5b-04', 'course-rjb-6a-01', 'course-rjb-6a-03'],
      level: 'intermediate',
    },
    {
      id: 'statistics',
      title: '统计与概率',
      icon: <BarChart3 className="w-4 h-4" />,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-300',
      dotColor: 'bg-teal-400',
      description: '数据收集、统计图表、可能性',
      grades: ['1年级', '2年级', '3年级', '5年级'],
      courseIds: ['course-rjb-1b-03', 'course-rjb-2b-01', 'course-rjb-3b-03', 'course-rjb-5a-04'],
      level: 'intermediate',
    },
    {
      id: 'equations',
      title: '方程与代数',
      icon: <Calculator className="w-4 h-4" />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-300',
      dotColor: 'bg-indigo-400',
      description: '简易方程、因数与倍数、比与比例',
      grades: ['5年级', '6年级'],
      courseIds: ['course-rjb-5a-05', 'course-rjb-5b-02', 'course-rjb-6a-04', 'course-rjb-6b-04'],
      level: 'advanced',
    },
    {
      id: 'circles-proportion',
      title: '圆与比例',
      icon: <Compass className="w-4 h-4" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-300',
      dotColor: 'bg-amber-400',
      description: '圆的认识与计算、正比例与反比例',
      grades: ['6年级'],
      courseIds: ['course-rjb-6a-05', 'course-rjb-6b-04'],
      level: 'advanced',
    },
  ];

  const levels = [
    { key: 'basic' as const, label: '基础', sublabel: '1-2年级', color: 'bg-emerald-500', lightColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
    { key: 'intermediate' as const, label: '进阶', sublabel: '3-4年级', color: 'bg-blue-500', lightColor: 'bg-blue-100', textColor: 'text-blue-700' },
    { key: 'advanced' as const, label: '提高', sublabel: '5-6年级', color: 'bg-purple-500', lightColor: 'bg-purple-100', textColor: 'text-purple-700' },
  ];

  useEffect(() => {
    loadAllCourses();
  }, []);

  const loadAllCourses = async () => {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">韦达学习</h1>
                <p className="text-xs text-gray-500">智能互动学习平台</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push('/admin')}>
              管理入口
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>AI驱动的个性化学习体验</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            让数学学习变得
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">
              有趣又高效
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            通过互动式课程、AI讲解和趣味挑战，激发孩子对数学的兴趣，
            系统掌握小学阶段的数学知识。
          </p>
        </motion.section>

        {/* Knowledge Tree */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-8 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            数学知识树
          </h3>

          <div className="relative">
            {/* Root */}
            <div className="flex justify-center mb-0">
              <div className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white font-bold text-lg shadow-lg">
                小学数学
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
                {levels.map((level) => {
                  const levelModules = mathModules.filter(m => m.level === level.key);
                  return (
                    <div key={level.key} className="relative">
                      {/* Vertical line from horizontal connector to level node */}
                      <div className="flex justify-center">
                        <div className="w-0.5 h-6 bg-gray-300" />
                      </div>

                      {/* Level node */}
                      <div className="flex justify-center mb-2">
                        <div className={`px-4 py-2 ${level.lightColor} ${level.textColor} rounded-lg font-bold text-sm flex items-center gap-2`}>
                          <div className={`w-2 h-2 ${level.color} rounded-full`} />
                          {level.label}
                          <span className="font-normal opacity-70">{level.sublabel}</span>
                        </div>
                      </div>

                      {/* Vertical trunk for this level */}
                      <div className="flex justify-center">
                        <div className="w-0.5 h-4 bg-gray-200" />
                      </div>

                      {/* Module branches */}
                      <div className="space-y-0">
                        {levelModules.map((mod, idx) => (
                          <div key={mod.id}>
                            {/* Connector from trunk to module */}
                            <div className="flex items-start">
                              {/* Vertical trunk segment */}
                              <div className="w-6 flex-shrink-0 flex flex-col items-center">
                                <div className={`w-0.5 ${idx === levelModules.length - 1 ? 'h-6' : 'h-full'} bg-gray-200`} />
                              </div>
                              {/* Horizontal branch */}
                              <div className="h-6 flex items-center">
                                <div className="w-4 h-0.5 bg-gray-200" />
                              </div>
                              {/* Module node */}
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
                                        <h4 className="font-semibold text-gray-900 text-sm">{mod.title}</h4>
                                        <span className="text-[10px] text-gray-400">{mod.grades.join(' ')}</span>
                                      </div>
                                      <p className="text-xs text-gray-500 truncate">{mod.description}</p>
                                    </div>
                                    <div className={`shrink-0 transition-transform ${expandedModule === mod.id ? 'rotate-180' : ''}`}>
                                      <ChevronDown className="w-4 h-4 text-gray-400" />
                                    </div>
                                  </div>
                                </button>

                                {/* Expanded courses */}
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
                                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full shrink-0">免费</span>
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
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Features */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
        >
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">AI智能讲解</h4>
            <p className="text-sm text-gray-500">
              每道题都有AI老师详细讲解，
              理解难点，掌握解题思路。
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-indigo-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">个性化学习</h4>
            <p className="text-sm text-gray-500">
              根据学习进度智能推荐课程，
              针对性提升薄弱环节。
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">趣味挑战</h4>
            <p className="text-sm text-gray-500">
              游戏化学习体验，奖励机制激发学习动力，
              在快乐中成长进步。
            </p>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-center text-white"
        >
          <Sparkles className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-4">开始你的数学之旅</h3>
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            加入数万学生的学习行列，体验AI带来的全新学习方式，
            让数学不再难学！
          </p>
          <Button 
            variant="secondary" 
            size="lg"
            onClick={handleStartLearning}
            className="bg-white text-blue-600 hover:bg-blue-50"
          >
            开始学习
          </Button>
        </motion.section>
      </main>

      <footer className="bg-gray-50 border-t border-gray-100 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>韦达学习 - 让学习更有趣</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
