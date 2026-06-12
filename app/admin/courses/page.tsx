'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/utils/database';

interface Course {
  id: string;
  gradeId: string;
  title: string;
  description?: string;
  coverUrl?: string;
  videoUrl?: string;
  classroomId?: string;
  duration?: number;
  sortOrder: number;
  semester?: string;
  isActive: boolean;
  isFree: boolean;
  gradeName: string;
  gradeCode?: string;
  textbookName?: string;
  subjectName?: string;
}

interface Grade {
  id: string;
  name: string;
  subjectName?: string;
  textbookId?: string;
}

interface Classroom {
  id: string;
  name: string;
  description: string;
  sceneCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSemester, setFilterSemester] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [grades, setGrades] = useState<Grade[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [activeTab, setActiveTab] = useState<'courses' | 'classrooms'>('courses');
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());

  // 从年级中提取唯一的年级名称（去掉上下册）
  const getGradeDisplayName = (name: string) => {
    return name.replace('上册', '').replace('下册', '').replace('全册', '');
  };

  const uniqueGrades = [...new Map(
    grades.map(g => [getGradeDisplayName(g.name), g.name])
  ).entries()].map(([displayName, originalName]) => ({
    displayName,
    grades: grades.filter(g => getGradeDisplayName(g.name) === displayName)
  }));

  const [addForm, setAddForm] = useState({
    selectedGradeDisplay: '',
    title: '',
    description: '',
    coverUrl: '',
    videoUrl: '',
    classroomId: '',
    duration: '',
    sortOrder: '0',
    semester: 'full',
    isFree: false,
  });

  const [editForm, setEditForm] = useState({
    selectedGradeDisplay: '',
    title: '',
    description: '',
    coverUrl: '',
    videoUrl: '',
    classroomId: '',
    duration: '',
    sortOrder: '0',
    semester: 'full',
    isFree: false,
  });

  useEffect(() => {
    fetchGrades();
    fetchCourses();
    fetchClassrooms();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [courses, selectedGrade, filterSubject, filterStatus, filterSemester, searchQuery]);

  const fetchGrades = async () => {
    try {
      const res = await fetch('/api/admin/grades');
      const data = await res.json();
      const uniqueGrades: Grade[] = [];
      const seenIds = new Set();
      data.grades?.forEach((g: Grade) => {
        if (!seenIds.has(g.id)) {
          seenIds.add(g.id);
          uniqueGrades.push(g);
        }
      });
      setGrades(uniqueGrades);
      if (uniqueGrades.length > 0) {
        setAddForm(prev => ({ ...prev, gradeId: uniqueGrades[0].id }));
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/courses');
      const data = await res.json();
      setCourses(data.courses || []);
      setFilteredCourses(data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const res = await fetch('/api/admin/classrooms');
      const data = await res.json();
      setClassrooms(data.classrooms || []);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    }
  };

  const filterCourses = () => {
    let filtered = [...courses];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(query) ||
        course.description?.toLowerCase().includes(query)
      );
    }

    if (selectedGrade) {
      // 根据年级名称筛选（匹配所有上册和下册）
      filtered = filtered.filter(course => {
        const courseGradeDisplay = getGradeDisplayName(course.gradeName || '');
        return courseGradeDisplay === selectedGrade;
      });
    }

    if (filterSubject) {
      filtered = filtered.filter(course => course.subjectName === filterSubject);
    }

    if (filterStatus) {
      if (filterStatus === 'free') {
        filtered = filtered.filter(course => course.isFree);
      } else if (filterStatus === 'paid') {
        filtered = filtered.filter(course => !course.isFree);
      }
    }

    if (filterSemester) {
      filtered = filtered.filter(course => {
        const gradeName = course.gradeName || '';
        const semester = course.semester || '';
        if (filterSemester === 'first') {
          return semester === 'first' || gradeName.includes('上册');
        } else if (filterSemester === 'second') {
          return semester === 'second' || gradeName.includes('下册');
        }
        return true;
      });
    }

    setFilteredCourses(filtered);
  };

  const handleSyncAllClassrooms = async () => {
    try {
      setSyncing(true);
      const stages = await db.stages.orderBy('updatedAt').reverse().toArray();
      let syncedCount = 0;
      let failedCount = 0;

      for (const stage of stages) {
        try {
          const sceneRecords = await db.scenes.where('stageId').equals(stage.id).toArray();
          
          const res = await fetch(`/api/admin/classrooms/${stage.id}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: stage.id,
              name: stage.name,
              description: stage.description,
              sceneCount: sceneRecords.length,
              data: {
                stage: stage,
                scenes: sceneRecords,
              },
            }),
          });

          const result = await res.json();
          if (result.success) {
            syncedCount++;
          } else {
            failedCount++;
            console.error(`Failed to sync classroom ${stage.id}:`, result.error);
          }
        } catch (error) {
          failedCount++;
          console.error(`Failed to sync classroom ${stage.id}:`, error);
        }
      }

      if (failedCount === 0) {
        alert(`已成功同步 ${syncedCount} 个课堂到服务器！`);
      } else {
        alert(`同步完成：成功 ${syncedCount} 个，失败 ${failedCount} 个`);
      }
      fetchClassrooms();
    } catch (error) {
      console.error('Error syncing classrooms:', error);
      alert('同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleAddClick = () => {
    const firstGradeDisplay = uniqueGrades[0]?.displayName || '';
    setAddForm({
      selectedGradeDisplay: firstGradeDisplay,
      title: '',
      description: '',
      coverUrl: '',
      videoUrl: '',
      classroomId: '',
      duration: '',
      sortOrder: '0',
      semester: 'full',
      isFree: false,
    });
    setShowAddModal(true);
  };

  const handleCreateCourseFromClassroom = (classroom: Classroom) => {
    const firstGradeDisplay = uniqueGrades[0]?.displayName || '';
    setSelectedClassroom(classroom);
    setAddForm({
      selectedGradeDisplay: firstGradeDisplay,
      title: classroom.name,
      description: classroom.description || '',
      coverUrl: '',
      videoUrl: '',
      classroomId: classroom.id,
      duration: '',
      sortOrder: '0',
      semester: 'full',
      isFree: false,
    });
    setShowAddModal(true);
  };

  // 根据年级显示名称和上下册获取真实的 gradeId
  const getGradeIdFromDisplay = (gradeDisplay: string, semester: string): string => {
    const matchingGrade = uniqueGrades.find(g => g.displayName === gradeDisplay);
    if (!matchingGrade) return '';
    
    if (semester === 'first') {
      return matchingGrade.grades.find(g => g.name.includes('上册'))?.id || '';
    } else if (semester === 'second') {
      return matchingGrade.grades.find(g => g.name.includes('下册'))?.id || '';
    }
    return matchingGrade.grades[0]?.id || '';
  };

  const handleAddCourse = async () => {
    if (!addForm.selectedGradeDisplay || !addForm.title) {
      alert('请填写完整信息');
      return;
    }

    const gradeId = getGradeIdFromDisplay(addForm.selectedGradeDisplay, addForm.semester);
    if (!gradeId) {
      alert('请选择年级');
      return;
    }

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeId,
          title: addForm.title,
          description: addForm.description,
          semester: addForm.semester,
          isFree: addForm.isFree,
          duration: addForm.duration ? parseInt(addForm.duration) : 0,
          sortOrder: addForm.sortOrder ? parseInt(addForm.sortOrder) : 0,
          classroomId: addForm.classroomId,
        }),
      });

      if (res.ok) {
        alert('课程创建成功');
        setShowAddModal(false);
        fetchCourses();
      } else {
        const data = await res.json();
        alert(data.error || '创建失败');
      }
    } catch (error) {
      console.error('Error creating course:', error);
      alert('创建失败');
    }
  };

  const handleEditClick = (course: Course) => {
    setSelectedCourse(course);
    setEditForm({
      selectedGradeDisplay: getGradeDisplayName(course.gradeName || ''),
      title: course.title || '',
      description: course.description || '',
      coverUrl: course.coverUrl || '',
      videoUrl: course.videoUrl || '',
      classroomId: course.classroomId || '',
      duration: course.duration?.toString() || '',
      sortOrder: course.sortOrder?.toString() || '0',
      semester: course.semester || 'full',
      isFree: course.isFree || false,
    });
    setShowEditModal(true);
  };

  const handleUpdateCourse = async () => {
    if (!selectedCourse) return;

    const gradeId = getGradeIdFromDisplay(editForm.selectedGradeDisplay, editForm.semester);
    if (!gradeId) {
      alert('请选择年级');
      return;
    }

    try {
      const res = await fetch(`/api/admin/courses/${selectedCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeId,
          title: editForm.title,
          description: editForm.description,
          semester: editForm.semester,
          isFree: editForm.isFree,
          duration: editForm.duration ? parseInt(editForm.duration) : 0,
          sortOrder: editForm.sortOrder ? parseInt(editForm.sortOrder) : 0,
          classroomId: editForm.classroomId,
        }),
      });

      if (res.ok) {
        alert('课程更新成功');
        setShowEditModal(false);
        fetchCourses();
      } else {
        alert('更新失败');
      }
    } catch (error) {
      console.error('Error updating course:', error);
      alert('更新失败');
    }
  };

  const handleDeleteClick = (course: Course) => {
    setSelectedCourse(course);
    setShowDeleteConfirm(true);
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourse) return;

    try {
      const res = await fetch(`/api/admin/courses/${selectedCourse.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('课程删除成功');
        setShowDeleteConfirm(false);
        fetchCourses();
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('删除失败');
    }
  };

  const handleSelectAll = () => {
    if (selectedCourseIds.size === filteredCourses.length) {
      setSelectedCourseIds(new Set());
    } else {
      setSelectedCourseIds(new Set(filteredCourses.map(c => c.id)));
    }
  };

  const handleSelectCourse = (courseId: string) => {
    const newSelected = new Set(selectedCourseIds);
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId);
    } else {
      newSelected.add(courseId);
    }
    setSelectedCourseIds(newSelected);
  };

  const handleBatchDeleteClick = () => {
    setShowBatchDeleteConfirm(true);
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedCourseIds);
    
    try {
      const res = await fetch(`/api/admin/courses?ids=${ids.join(',')}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        alert(`成功删除 ${data.deletedCount} 个课程`);
        setShowBatchDeleteConfirm(false);
        setSelectedCourseIds(new Set());
        fetchCourses();
      } else {
        const data = await res.json();
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('Error deleting courses:', error);
      alert('删除失败');
    }
  };

  const handleToggleFree = async (course: Course) => {
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFree: !course.isFree }),
      });

      if (res.ok) {
        setCourses((prev) =>
          prev.map((c) => (c.id === course.id ? { ...c, isFree: !c.isFree } : c))
        );
      } else {
        alert('更新失败');
      }
    } catch (error) {
      console.error('Error updating course:', error);
      alert('更新失败');
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSemesterName = (semester?: string) => {
    switch (semester) {
      case 'first': return '上册';
      case 'second': return '下册';
      default: return '';
    }
  };

  const subjects = [...new Set(courses.map((c) => c.subjectName).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">课程管理</h2>
          <p className="text-sm text-gray-500 mt-1">管理课程信息，设置免费/付费</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSyncAllClassrooms}
            disabled={syncing}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? '同步中...' : '同步课堂'}
          </button>
          {activeTab === 'courses' && (
            <button
              onClick={handleAddClick}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              添加课程
            </button>
          )}
          <button
            onClick={() => {
              fetchCourses();
              fetchClassrooms();
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            刷新
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'courses'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          课程列表
        </button>
        <button
          onClick={() => setActiveTab('classrooms')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'classrooms'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          课堂管理
        </button>
      </div>

      {activeTab === 'courses' ? (
        <>
          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索课程名称..."
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">年级:</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                <label className="text-sm font-medium text-gray-600">科目:</label>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                <label className="text-sm font-medium text-gray-600">上下册:</label>
                <select
                  value={filterSemester}
                  onChange={(e) => setFilterSemester(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">全部</option>
                  <option value="first">上册</option>
                  <option value="second">下册</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">状态:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">全部状态</option>
                  <option value="free">免费</option>
                  <option value="paid">付费</option>
                </select>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              共 {filteredCourses.length} 个课程
            </p>
          </div>

          {/* Course Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Batch Actions Bar */}
            {selectedCourseIds.size > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  已选择 <strong>{selectedCourseIds.size}</strong> 个课程
                </span>
                <button
                  onClick={handleBatchDeleteClick}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                >
                  批量删除
                </button>
              </div>
            )}
            
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 w-12">
                    <input
                      type="checkbox"
                      checked={filteredCourses.length > 0 && selectedCourseIds.size === filteredCourses.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">课程信息</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">年级/科目</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">上下册</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">关联课堂</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">状态</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                      加载中...
                    </td>
                  </tr>
                ) : filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      暂无课程
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((course) => (
                    <tr key={course.id} className={`hover:bg-gray-50 transition ${selectedCourseIds.has(course.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedCourseIds.has(course.id)}
                          onChange={() => handleSelectCourse(course.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {course.coverUrl ? (
                            <img src={course.coverUrl} alt={course.title} className="w-12 h-12 rounded-lg object-cover" />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                              📄
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-800">{course.title}</p>
                            <p className="text-sm text-gray-500 max-w-xs truncate">{course.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-800">{course.gradeName}</p>
                        <p className="text-sm text-gray-500">{course.subjectName}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {getSemesterName(course.semester)}
                      </td>
                      <td className="px-6 py-4">
                        {course.classroomId ? (
                          (() => {
                            const classroom = classrooms.find((c) => c.id === course.classroomId);
                            return classroom ? (
                              <a
                                href={`/mobile/classroom/${classroom.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline truncate max-w-xs"
                              >
                                {classroom.name}
                              </a>
                            ) : (
                              <span className="text-sm text-gray-400">课堂不存在</span>
                            );
                          })()
                        ) : (
                          <span className="text-sm text-gray-400">未关联</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            course.isFree
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {course.isFree ? '免费' : '付费'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleFree(course)}
                            className={`px-3 py-1 rounded-lg transition text-sm ${
                              course.isFree
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {course.isFree ? '付费' : '免费'}
                          </button>
                          <button
                            onClick={() => handleEditClick(course)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteClick(course)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500">课程总数</p>
              <p className="text-2xl font-bold text-gray-800">{courses.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500">免费课程</p>
              <p className="text-2xl font-bold text-green-600">
                {courses.filter((c) => c.isFree).length}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500">付费课程</p>
              <p className="text-2xl font-bold text-orange-600">
                {courses.filter((c) => !c.isFree).length}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500">筛选结果</p>
              <p className="text-2xl font-bold text-indigo-600">
                {filteredCourses.length}
              </p>
            </div>
          </div>
        </>
      ) : (
        /* Classroom Management */
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">课堂列表</h3>
            <p className="text-sm text-gray-500 mt-1">从这里可以直接创建课程</p>
          </div>
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
              加载中...
            </div>
          ) : classrooms.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              暂无课堂，请先在首页创建课堂
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">课堂信息</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">场景数</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">更新时间</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">已关联</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {classrooms.map((classroom) => {
                  const isLinked = courses.some((c) => c.classroomId === classroom.id);
                  return (
                    <tr key={classroom.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-800">{classroom.name}</p>
                          <p className="text-sm text-gray-500 max-w-xs truncate">{classroom.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {classroom.sceneCount}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(classroom.updatedAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isLinked
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {isLinked ? '已关联' : '未关联'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <a
                            href={`/mobile/classroom/${classroom.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
                          >
                            查看
                          </a>
                          <button
                            onClick={() => handleCreateCourseFromClassroom(classroom)}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition text-sm"
                          >
                            创建课程
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">添加课程</h3>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属年级 *</label>
                <select
                  value={addForm.selectedGradeDisplay}
                  onChange={(e) => setAddForm({ ...addForm, selectedGradeDisplay: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {uniqueGrades.map((item) => (
                    <option key={item.displayName} value={item.displayName}>
                      {item.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">课程名称 *</label>
                <input
                  type="text"
                  value={addForm.title}
                  onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="例如：分数乘法"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">课程描述</label>
                <textarea
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">上下册</label>
                  <select
                    value={addForm.semester}
                    onChange={(e) => setAddForm({ ...addForm, semester: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="full">全册</option>
                    <option value="first">上册</option>
                    <option value="second">下册</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                  <input
                    type="number"
                    value={addForm.sortOrder}
                    onChange={(e) => setAddForm({ ...addForm, sortOrder: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">关联课堂</label>
                <select
                  value={addForm.classroomId}
                  onChange={(e) => setAddForm({ ...addForm, classroomId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">请选择要关联的课堂</option>
                  {classrooms
                    .filter(c => !c.id.startsWith('course-') && !courses.some(course => course.classroomId === c.id))
                    .map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name} ({classroom.sceneCount}个场景)
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={addForm.isFree}
                    onChange={(e) => setAddForm({ ...addForm, isFree: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700">设为免费课程</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                取消
              </button>
              <button
                onClick={handleAddCourse}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">编辑课程</h3>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属年级 *</label>
                <select
                  value={editForm.selectedGradeDisplay}
                  onChange={(e) => setEditForm({ ...editForm, selectedGradeDisplay: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {uniqueGrades.map((item) => (
                    <option key={item.displayName} value={item.displayName}>
                      {item.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">课程名称 *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">课程描述</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">上下册</label>
                  <select
                    value={editForm.semester}
                    onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="full">全册</option>
                    <option value="first">上册</option>
                    <option value="second">下册</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                  <input
                    type="number"
                    value={editForm.sortOrder}
                    onChange={(e) => setEditForm({ ...editForm, sortOrder: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">关联课堂</label>
                <select
                  value={editForm.classroomId}
                  onChange={(e) => setEditForm({ ...editForm, classroomId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">请选择要关联的课堂</option>
                  {classrooms
                    .filter(c => !c.id.startsWith('course-') && (!courses.some(course => course.classroomId === c.id && course.id !== selectedCourse?.id) || c.id === editForm.classroomId))
                    .map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name} ({classroom.sceneCount}个场景)
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.isFree}
                    onChange={(e) => setEditForm({ ...editForm, isFree: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700">设为免费课程</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                取消
              </button>
              <button
                onClick={handleUpdateCourse}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">确认删除</h3>
              <p className="text-gray-600 mb-6">
                确定要删除课程 "{selectedCourse.title}" 吗？此操作无法撤销。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteCourse}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirm Modal */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">批量删除确认</h3>
              <p className="text-gray-600 mb-6">
                确定要删除选中的 <strong>{selectedCourseIds.size}</strong> 个课程吗？此操作无法撤销。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBatchDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  取消
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
