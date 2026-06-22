'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Calculator, 
  GraduationCap, 
  Star,
  ChevronRight,
  Sparkles,
  Brain,
  Target,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface Grade {
  id: string;
  name: string;
  price: number;
  sortOrder: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  gradeId: string;
  sortOrder: number;
  isFree?: boolean;
}

function HomePage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('subject-math');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const defaultSubjects: Subject[] = [
    {
      id: 'subject-math',
      name: '数学',
      description: '小学数学同步课程，从基础到进阶',
      icon: 'Calculator',
      color: 'bg-blue-500',
    },
  ];

  useEffect(() => {
    setSubjects(defaultSubjects);
    loadGrades();
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedGrade) {
      loadCourses(selectedGrade.id);
    }
  }, [selectedGrade]);

  const loadGrades = async () => {
    try {
      const res = await fetch('/api/grades');
      const data = await res.json();
      setGrades(data.grades || []);
      if (data.grades && data.grades.length > 0) {
        setSelectedGrade(data.grades[0]);
      }
    } catch (error) {
      console.error('Failed to load grades:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourses = async (gradeId: string) => {
    try {
      const res = await fetch(`/api/courses?gradeId=${gradeId}`);
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  };

  const handleGradeClick = (grade: Grade) => {
    setSelectedGrade(grade);
  };

  const handleCourseClick = (course: Course) => {
    router.push(`/mobile/classroom/${course.id}`);
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
                <h1 className="text-xl font-bold text-gray-900">AI数学乐园</h1>
                <p className="text-xs text-gray-500">智能互动学习平台</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push('/admin')}>
              管理入口
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
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

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-500" />
            选择年级
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {grades.map((grade) => (
              <motion.button
                key={grade.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleGradeClick(grade)}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  selectedGrade?.id === grade.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                )}
              >
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {grade.name}
                </div>
                <div className="text-xs text-gray-500">
                  ¥{grade.price}/学期
                </div>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {selectedGrade && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              {selectedGrade.name}课程
            </h3>
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">暂无课程内容</p>
                  <p className="text-sm text-gray-400">课程正在制作中，敬请期待</p>
                </div>
              ) : (
                courses.map((course, index) => (
                  <motion.button
                    key={course.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ x: 5 }}
                    onClick={() => handleCourseClick(course)}
                    className="w-full p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">{course.sortOrder + 1}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{course.title}</h4>
                          {course.isFree && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">免费</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{course.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </motion.button>
                ))
              )}
            </div>
          </motion.section>
        )}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
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

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-center text-white"
        >
          <Star className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-4">开始你的数学之旅</h3>
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            加入数万学生的学习行列，体验AI带来的全新学习方式，
            让数学不再难学！
          </p>
          <Button 
            variant="secondary" 
            size="lg"
            onClick={() => router.push('/mobile/classroom')}
            className="bg-white text-blue-600 hover:bg-blue-50"
          >
            开始学习
          </Button>
        </motion.section>
      </main>

      <footer className="bg-gray-50 border-t border-gray-100 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>AI数学乐园 - 让学习更有趣</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;