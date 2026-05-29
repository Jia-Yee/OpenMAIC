'use client';

import { useEffect, useState } from 'react';

interface Classroom {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  sceneCount?: number;
  duration?: number;
  createdAt?: string;
  updatedAt?: string;
}

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
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [isFree, setIsFree] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [showSyncedCourses, setShowSyncedCourses] = useState(false);
  const [syncedCourses, setSyncedCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [availableCoursesForPrereq, setAvailableCoursesForPrereq] = useState<Course[]>([]);
  const [showPrereqModal, setShowPrereqModal] = useState(false);
  const [prereqToAdd, setPrereqToAdd] = useState<string[]>([]);

  useEffect(() => {
    fetchClassrooms();
    fetchGrades();
  }, []);

  useEffect(() => {
    if (selectedGrade && showSyncedCourses) {
      fetchSyncedCourses();
    }
  }, [selectedGrade, showSyncedCourses]);

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/classrooms');
      const data = await res.json();
      setClassrooms(data.classrooms || []);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    } finally {
      setLoading(false);
    }
  };

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
        setSelectedGrade(uniqueGrades[0].id);
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const fetchSyncedCourses = async () => {
    try {
      const res = await fetch(`/api/courses?gradeId=${selectedGrade}`);
      const data = await res.json();
      const courses = data.courses || [];
      
      // Fetch prerequisites for each course
      const coursesWithPrereqs = await Promise.all(
        courses.map(async (course: Course) => {
          const prereqRes = await fetch(`/api/admin/courses/${course.id}/prerequisites`);
          const prereqData = await prereqRes.json();
          return {
            ...course,
            prerequisites: prereqData.prerequisites || [],
          };
        })
      );
      
      setSyncedCourses(coursesWithPrereqs);
    } catch (error) {
      console.error('Error fetching synced courses:', error);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncResult('正在同步...');
      
      const res = await fetch('/api/admin/classrooms/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeId: selectedGrade,
          isFree: isFree,
          classroomIds: selectedClassrooms.length > 0 ? selectedClassrooms : undefined,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSyncResult(`同步成功！已同步 ${data.synced} 个课堂，${data.skipped || 0} 个已存在`);
        fetchClassrooms();
        if (showSyncedCourses) {
          fetchSyncedCourses();
        }
      } else {
        setSyncResult(`同步失败: ${data.error}`);
      }
    } catch (error) {
      console.error('Error syncing:', error);
      setSyncResult('同步失败');
    } finally {
      setSyncing(false);
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
      
      fetchSyncedCourses();
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
      fetchSyncedCourses();
    } catch (error) {
      console.error('Error adding prerequisite:', error);
    }
  };

  const handleRemovePrerequisite = async (courseId: string, prerequisiteId: string) => {
    try {
      await fetch(`/api/admin/courses/${courseId}/prerequisites?prerequisiteId=${prerequisiteId}`, {
        method: 'DELETE',
      });
      fetchSyncedCourses();
    } catch (error) {
      console.error('Error removing prerequisite:', error);
    }
  };

  const toggleClassroomSelection = (id: string) => {
    setSelectedClassrooms(prev => 
      prev.includes(id) 
        ? prev.filter(cid => cid !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedClassrooms.length === classrooms.length) {
      setSelectedClassrooms([]);
    } else {
      setSelectedClassrooms(classrooms.map(c => c.id));
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const moveCourseUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...syncedCourses];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    handleReorder(newOrder.map(c => c.id));
  };

  const moveCourseDown = (index: number) => {
    if (index >= syncedCourses.length - 1) return;
    const newOrder = [...syncedCourses];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    handleReorder(newOrder.map(c => c.id));
  };

  const openPrereqModal = (course: Course) => {
    setSelectedCourse(course);
    setAvailableCoursesForPrereq(
      syncedCourses.filter(c => c.id !== course.id)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">课堂管理</h2>
          <p className="text-sm text-gray-500 mt-1">管理所有上传的课堂，将课堂同步到课程系统</p>
        </div>
        <button
          onClick={fetchClassrooms}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          刷新
        </button>
      </div>

      {/* Sync Panel */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-6 text-white">
        <h3 className="font-semibold text-lg mb-4">同步课堂到课程</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm mb-2">目标年级:</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full px-4 py-2 bg-white/20 rounded-lg border border-white/30 text-white"
            >
              <option value="" className="text-gray-800">选择年级</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id} className="text-gray-800">
                  {grade.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">设为免费:</label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="w-5 h-5"
              />
              <span>同步的课程默认免费</span>
            </label>
          </div>
          <div>
            <label className="block text-sm mb-2">选择模式:</label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={selectedClassrooms.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5"
                disabled={classrooms.length === 0}
              />
              <span>选择特定课堂</span>
            </label>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSync}
              disabled={syncing || !selectedGrade}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                syncing || !selectedGrade
                  ? 'bg-white/30 cursor-not-allowed'
                  : 'bg-white text-indigo-600 hover:bg-white/90'
              }`}
            >
              {syncing ? '同步中...' : `同步${selectedClassrooms.length > 0 ? ` (${selectedClassrooms.length})` : ''}`}
            </button>
          </div>
        </div>
        {syncResult && (
          <div className={`p-3 rounded-lg ${
            syncResult.includes('成功') ? 'bg-green-500/30' : 'bg-red-500/30'
          }`}>
            {syncResult}
          </div>
        )}
      </div>

      {/* Classroom List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            上传的课堂 ({classrooms.length})
            {selectedClassrooms.length > 0 && (
              <span className="ml-2 text-sm text-indigo-600">已选择 {selectedClassrooms.length} 个</span>
            )}
          </h3>
          <button
            onClick={() => setShowSyncedCourses(!showSyncedCourses)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              showSyncedCourses
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showSyncedCourses ? '隐藏已同步课程' : '查看已同步课程'}
          </button>
        </div>
        
        {/* Selected Classroom Badges */}
        {selectedClassrooms.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex flex-wrap gap-2">
              {selectedClassrooms.slice(0, 5).map(id => {
                const classroom = classrooms.find(c => c.id === id);
                return (
                  <span
                    key={id}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-1"
                  >
                    {classroom?.name || classroom?.title || id.slice(0, 8)}
                    <button onClick={() => toggleClassroomSelection(id)} className="hover:text-indigo-900">×</button>
                  </span>
                );
              })}
              {selectedClassrooms.length > 5 && (
                <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm">
                  +{selectedClassrooms.length - 5} 更多
                </span>
              )}
            </div>
          </div>
        )}
        
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600 w-10">
                {selectedClassrooms.length > 0 && <input
                  type="checkbox"
                  checked={selectedClassrooms.length === classrooms.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4"
                />}
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">课堂名称</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">场景数</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">时长</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">更新时间</th>
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
            ) : classrooms.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  暂无课堂数据
                </td>
              </tr>
            ) : (
              classrooms.map((classroom) => (
                <tr key={classroom.id} className={`hover:bg-gray-50 transition ${
                  selectedClassrooms.includes(classroom.id) ? 'bg-indigo-50' : ''
                }`}>
                  <td className="px-6 py-4">
                    {selectedClassrooms.length > 0 && (
                      <input
                        type="checkbox"
                        checked={selectedClassrooms.includes(classroom.id)}
                        onChange={() => toggleClassroomSelection(classroom.id)}
                        className="w-4 h-4"
                      />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-800">{classroom.name || classroom.title || '未命名'}</p>
                      <p className="text-sm text-gray-500 max-w-xs truncate">{classroom.description}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {classroom.sceneCount || '-'} 个场景
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {classroom.duration ? `${Math.floor(classroom.duration / 60)}分钟` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(classroom.updatedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Synced Courses Panel */}
      {showSyncedCourses && selectedGrade && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">
              已同步课程 ({syncedCourses.length})
            </h3>
          </div>
          
          {syncedCourses.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              该年级暂无同步的课程
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {syncedCourses.map((course, index) => (
                <div key={course.id} className="px-6 py-4 hover:bg-gray-50 transition flex items-center gap-4">
                  {/* Order */}
                  <div className="w-12 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full text-sm font-medium">
                      {index + 1}
                    </span>
                  </div>
                  
                  {/* Course Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800">{course.title}</p>
                      {course.isFree && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">免费</span>
                      )}
                    </div>
                    {/* Prerequisites */}
                    {course.prerequisites && course.prerequisites.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="text-xs text-gray-500">前置课程:</span>
                        {course.prerequisites.map(prereq => (
                          <span
                            key={prereq.id}
                            className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs flex items-center gap-1"
                          >
                            {prereq.prerequisiteTitle || prereq.prerequisiteId}
                            <button
                              onClick={() => handleRemovePrerequisite(course.id, prereq.prerequisiteId)}
                              className="hover:text-orange-900"
                            >×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveCourseUp(index)}
                      disabled={index === 0}
                      className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="上移"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveCourseDown(index)}
                      disabled={index === syncedCourses.length - 1}
                      className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="下移"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => openPrereqModal(course)}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 transition"
                    >
                      设置前置
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Prerequisite Modal */}
      {showPrereqModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">设置前置课程</h3>
              <button
                onClick={() => {
                  setShowPrereqModal(false);
                  setPrereqToAdd([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >×</button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                选择课程「{selectedCourse.title}」的前置课程（完成前置课程后才能解锁此课程）：
              </p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {availableCoursesForPrereq.map(course => (
                  <label
                    key={course.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                      prereqToAdd.includes(course.id)
                        ? 'bg-indigo-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={prereqToAdd.includes(course.id)}
                      onChange={() => togglePrereqSelection(course.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">{course.title}</span>
                    {course.isFree && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">免费</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPrereqModal(false);
                  setPrereqToAdd([]);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                取消
              </button>
              <button
                onClick={handleAddPrerequisite}
                disabled={prereqToAdd.length === 0}
                className={`px-4 py-2 rounded-lg transition ${
                  prereqToAdd.length === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h4 className="font-medium text-yellow-800 mb-2">使用说明</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>1. 课堂是用户通过AI生成的课程数据</li>
          <li>2. 勾选"选择特定课堂"后可以选择要同步的课堂</li>
          <li>3. 选择目标年级，课堂将被关联到该年级下</li>
          <li>4. 勾选"设为免费"，同步的课程将标记为免费</li>
          <li>5. 在已同步课程列表中可以设置课程排序和前置条件</li>
          <li>6. 前置课程设置后，用户必须完成前置课程才能解锁当前课程</li>
        </ul>
      </div>
    </div>
  );
}
