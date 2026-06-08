'use client';

import { useEffect, useState } from 'react';

interface Grade {
  id: string;
  name: string;
}

interface Course {
  id: string;
  title: string;
  gradeId: string;
  isFree: boolean;
  sortOrder: number;
  createdAt: string;
  prerequisites?: { id: string; prerequisiteId: string; prerequisiteTitle: string }[];
}

export default function ClassroomsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [filterSemester, setFilterSemester] = useState<string>('');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [availableCoursesForPrereq, setAvailableCoursesForPrereq] = useState<Course[]>([]);
  const [showPrereqModal, setShowPrereqModal] = useState(false);
  const [prereqToAdd, setPrereqToAdd] = useState<string[]>([]);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIsFree, setEditIsFree] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 从年级中提取唯一的年级名称（去掉上下册）
  const getGradeDisplayName = (name: string) => {
    return name.replace('上册', '').replace('下册', '').replace('全册', '');
  };

  const uniqueGrades = [...new Map(
    grades.map(g => [getGradeDisplayName(g.name), g])
  ).entries()].map(([displayName, originalGrade]) => ({
    displayName,
    grades: grades.filter(g => getGradeDisplayName(g.name) === displayName)
  }));

  useEffect(() => {
    fetchGrades();
  }, []);

  useEffect(() => {
    if (selectedGrade) {
      fetchCourses();
    }
  }, [selectedGrade, filterSubject, filterSemester]);

  const fetchGrades = async () => {
    try {
      const res = await fetch('/api/admin/grades');
      const data = await res.json();
      const fetchedGrades: Grade[] = [];
      const seenIds = new Set();
      data.grades?.forEach((g: Grade) => {
        if (!seenIds.has(g.id)) {
          seenIds.add(g.id);
          fetchedGrades.push(g);
        }
      });
      setGrades(fetchedGrades);
      if (fetchedGrades.length > 0) {
        setSelectedGrade(getGradeDisplayName(fetchedGrades[0].name));
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      // 获取该年级对应的所有 gradeId（上册和下册）
      const targetGrades = grades.filter(g => getGradeDisplayName(g.name) === selectedGrade);
      const targetGradeIds = targetGrades.map(g => g.id);
      
      // 获取所有课程然后筛选
      const res = await fetch('/api/admin/courses');
      const data = await res.json();
      let courseList = (data.courses || []).filter((course: Course & { subjectName?: string; semester?: string }) => {
        const matchGrade = targetGradeIds.includes(course.gradeId);
        const matchSubject = !filterSubject || course.subjectName === filterSubject;
        const matchSemester = !filterSemester || course.semester === filterSemester;
        return matchGrade && matchSubject && matchSemester;
      });
      
      // 更新科目列表
      const courseListWithSubjects = courseList as (Course & { subjectName?: string })[];
      const allSubjects = [...new Set(courseListWithSubjects.map((c) => c.subjectName).filter(Boolean))];
      setSubjects(allSubjects);
      
      const coursesWithPrereqs = await Promise.all(
        courseList.map(async (course: Course) => {
          const prereqRes = await fetch(`/api/admin/courses/${course.id}/prerequisites`);
          const prereqData = await prereqRes.json();
          return {
            ...course,
            prerequisites: prereqData.prerequisites || [],
          };
        })
      );
      
      setCourses(coursesWithPrereqs.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (newOrder: string[]) => {
    try {
      const order = newOrder.map((courseId, index) => ({
        courseId,
        sortOrder: index,
      }));
      
      await fetch('/api/admin/courses/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeId: selectedGrade,
          order,
        }),
      });
      
      fetchCourses();
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  const handleAddPrerequisite = async () => {
    try {
      if (!selectedCourse || prereqToAdd.length === 0) return;
      
      await fetch(`/api/admin/courses/${selectedCourse.id}/prerequisites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prerequisiteIds: prereqToAdd }),
      });
      
      setShowPrereqModal(false);
      setPrereqToAdd([]);
      fetchCourses();
    } catch (error) {
      console.error('Error adding prerequisite:', error);
    }
  };

  const handleRemovePrerequisite = async (courseId: string, prerequisiteId: string) => {
    try {
      await fetch(`/api/admin/courses/${courseId}/prerequisites?prerequisiteId=${prerequisiteId}`, {
        method: 'DELETE',
      });
      fetchCourses();
    } catch (error) {
      console.error('Error removing prerequisite:', error);
    }
  };

  const openPrereqModal = (course: Course) => {
    setSelectedCourse(course);
    setAvailableCoursesForPrereq(
      courses.filter(c => c.id !== course.id)
    );
    setPrereqToAdd([]);
    setShowPrereqModal(true);
  };

  const togglePrereqSelection = (courseId: string) => {
    setPrereqToAdd(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const openEditModal = (course: Course) => {
    setEditCourse(course);
    setEditTitle(course.title);
    setEditIsFree(course.isFree);
  };

  const handleEditCourse = async () => {
    try {
      if (!editCourse) return;
      
      await fetch(`/api/admin/courses/${editCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          isFree: editIsFree,
        }),
      });
      
      setEditCourse(null);
      fetchCourses();
    } catch (error) {
      console.error('Error editing course:', error);
    }
  };

  const moveCourseUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...courses];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    handleReorder(newOrder.map(c => c.id));
  };

  const moveCourseDown = (index: number) => {
    if (index >= courses.length - 1) return;
    const newOrder = [...courses];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    handleReorder(newOrder.map(c => c.id));
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">课堂管理</h2>
          <p className="text-sm text-gray-500 mt-1">管理各年级课程，设置课程顺序和前置关系</p>
        </div>
        <button
          onClick={fetchCourses}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          刷新
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">年级:</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[120px]"
            >
              <option value="">全部年级</option>
              {uniqueGrades.map((item) => (
                <option key={item.displayName} value={item.displayName}>
                  {item.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">科目:</label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[120px]"
            >
              <option value="">全部科目</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">上下册:</label>
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[120px]"
            >
              <option value="">全部</option>
              <option value="first">上册</option>
              <option value="second">下册</option>
              <option value="full">全册</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">
            课程列表 ({courses.length})
          </h3>
        </div>
        
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">
            加载中...
          </div>
        ) : courses.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            该年级暂无课程
            <p className="text-sm mt-2">请先在课程管理页面添加或导入课程</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {courses.map((course, index) => (
              <div key={course.id} className="px-6 py-4 hover:bg-gray-50 transition">
                <div className="flex items-center gap-4">
                  <div className="w-12 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full text-sm font-medium">
                      {index + 1}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800">{course.title}</p>
                      {course.isFree && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">免费</span>
                      )}
                    </div>
                    
                    {course.prerequisites && course.prerequisites.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="text-xs text-gray-500">前置课程:</span>
                        {course.prerequisites.map(prereq => (
                          <span
                            key={prereq.id}
                            className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1"
                          >
                            {prereq.prerequisiteTitle}
                            <button
                              onClick={() => handleRemovePrerequisite(course.id, prereq.prerequisiteId)}
                              className="hover:text-blue-900"
                            >×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveCourseUp(index)}
                      disabled={index === 0}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="上移"
                    >↑</button>
                    <button
                      onClick={() => moveCourseDown(index)}
                      disabled={index === courses.length - 1}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="下移"
                    >↓</button>
                    <button
                      onClick={() => openPrereqModal(course)}
                      className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition"
                    >
                      设置前置
                    </button>
                    <button
                      onClick={() => openEditModal(course)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition"
                    >
                      编辑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPrereqModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">设置前置课程 - {selectedCourse.title}</h3>
            <p className="text-sm text-gray-500 mb-4">选择需要先学习的课程：</p>
            
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {availableCoursesForPrereq.map(course => (
                <label
                  key={course.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                    prereqToAdd.includes(course.id)
                      ? 'bg-indigo-50 border border-indigo-200'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={prereqToAdd.includes(course.id)}
                    onChange={() => togglePrereqSelection(course.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">{course.title}</span>
                  {course.isFree && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">免费</span>
                  )}
                </label>
              ))}
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPrereqModal(false);
                  setPrereqToAdd([]);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                取消
              </button>
              <button
                onClick={handleAddPrerequisite}
                disabled={prereqToAdd.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {editCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">编辑课程</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">课程名称</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsFree"
                  checked={editIsFree}
                  onChange={(e) => setEditIsFree(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="editIsFree" className="text-sm text-gray-700">设为免费课程</label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditCourse(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                取消
              </button>
              <button
                onClick={handleEditCourse}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
