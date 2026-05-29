'use client';

import { useEffect, useState } from 'react';

interface Course {
  id: string;
  gradeId: string;
  title: string;
  description?: string;
  coverUrl?: string;
  videoUrl?: string;
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

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSemester, setFilterSemester] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [grades, setGrades] = useState<Grade[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [addForm, setAddForm] = useState({
    gradeId: '',
    title: '',
    description: '',
    coverUrl: '',
    videoUrl: '',
    duration: '',
    sortOrder: '0',
    semester: 'full',
    isFree: false,
  });

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    coverUrl: '',
    videoUrl: '',
    duration: '',
    sortOrder: '0',
    semester: 'full',
    isFree: false,
  });

  useEffect(() => {
    fetchGrades();
    fetchCourses();
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
      filtered = filtered.filter(course => course.gradeId === selectedGrade);
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
      filtered = filtered.filter(course => course.semester === filterSemester);
    }

    setFilteredCourses(filtered);
  };

  const handleAddClick = () => {
    setAddForm({
      gradeId: grades[0]?.id || '',
      title: '',
      description: '',
      coverUrl: '',
      videoUrl: '',
      duration: '',
      sortOrder: '0',
      semester: 'full',
      isFree: false,
    });
    setShowAddModal(true);
  };

  const handleAddCourse = async () => {
    if (!addForm.gradeId || !addForm.title) {
      alert('请填写完整信息');
      return;
    }

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          duration: addForm.duration ? parseInt(addForm.duration) : 0,
          sortOrder: addForm.sortOrder ? parseInt(addForm.sortOrder) : 0,
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
      title: course.title || '',
      description: course.description || '',
      coverUrl: course.coverUrl || '',
      videoUrl: course.videoUrl || '',
      duration: course.duration?.toString() || '',
      sortOrder: course.sortOrder?.toString() || '0',
      semester: course.semester || 'full',
      isFree: course.isFree || false,
    });
    setShowEditModal(true);
  };

  const handleUpdateCourse = async () => {
    if (!selectedCourse) return;

    try {
      const res = await fetch(`/api/admin/courses/${selectedCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          duration: editForm.duration ? parseInt(editForm.duration) : 0,
          sortOrder: editForm.sortOrder ? parseInt(editForm.sortOrder) : 0,
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
      case 'full': return '全册';
      default: return semester || '-';
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
            onClick={handleAddClick}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            添加课程
          </button>
          <button
            onClick={fetchCourses}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            刷新
          </button>
        </div>
      </div>

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
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name} ({grade.subjectName})
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
              <option value="full">全册</option>
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
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">课程信息</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">年级/科目</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">上下册</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">状态</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                  加载中...
                </td>
              </tr>
            ) : filteredCourses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  暂无课程
                </td>
              </tr>
            ) : (
              filteredCourses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50 transition">
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
                  value={addForm.gradeId}
                  onChange={(e) => setAddForm({ ...addForm, gradeId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {grades.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.name} ({grade.subjectName})
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
              <p className="text-sm text-gray-500 mt-1">年级: {selectedCourse.gradeName}</p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
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
    </div>
  );
}
