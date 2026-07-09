'use client';

import { useState, useEffect, useCallback } from 'react';

// Types
interface Subject {
  id: string;
  name: string;
  code: string;
  description: string | null;
  sortOrder: number;
  isActive: number;
  textbookCount?: number;
}

interface Textbook {
  id: string;
  subjectId: string;
  name: string;
  publisher: string | null;
  gradeRange: string | null;
  description: string | null;
  sortOrder: number;
  isActive: number;
  subjectName?: string;
  gradeCount?: number;
}

interface Grade {
  id: string;
  textbookId: string;
  name: string;
  code: string | null;
  description: string | null;
  price: string | null;
  sortOrder: number;
  isActive: number;
  textbookName?: string;
  subjectId?: string;
  subjectName?: string;
}

type ModalType = 'subject' | 'textbook' | 'grade' | null;

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded state
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedTextbook, setExpandedTextbook] = useState<string | null>(null);

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, tbRes, gradeRes] = await Promise.all([
        fetch('/api/admin/subjects'),
        fetch('/api/admin/textbooks'),
        fetch('/api/admin/grades'),
      ]);
      const subData = await subRes.json();
      const tbData = await tbRes.json();
      const gradeData = await gradeRes.json();
      setSubjects(subData.subjects || []);
      setTextbooks(tbData.textbooks || []);
      setGrades(gradeData.grades || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Helpers
  const getTextbooksForSubject = (subjectId: string) =>
    textbooks.filter(t => t.subjectId === subjectId);

  const getGradesForTextbook = (textbookId: string) =>
    grades.filter(g => g.textbookId === textbookId);

  // CRUD
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      let url = '', method = 'POST', body: any = { ...formData };

      if (modalType === 'subject') {
        url = '/api/admin/subjects';
        if (editingItem) { method = 'PUT'; body.id = editingItem.id; }
      } else if (modalType === 'textbook') {
        url = '/api/admin/textbooks';
        if (editingItem) { method = 'PUT'; body.id = editingItem.id; }
      } else if (modalType === 'grade') {
        url = '/api/admin/grades';
        if (editingItem) { method = 'PUT'; body.gradeId = editingItem.id; }
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '操作失败');
        return;
      }

      closeModal();
      fetchData();
    } catch (err) {
      setError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: string, id: string) => {
    if (!confirm('确定删除？')) return;
    try {
      let url = '';
      if (type === 'subject') url = `/api/admin/subjects?id=${id}`;
      else if (type === 'textbook') url = `/api/admin/textbooks?id=${id}`;
      else if (type === 'grade') url = `/api/admin/grades?id=${id}`;

      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '删除失败');
        return;
      }
      fetchData();
    } catch (err) {
      alert('网络错误');
    }
  };

  const openCreateModal = (type: ModalType, parentId?: string, parentName?: string) => {
    setModalType(type);
    setEditingItem(null);
    setError('');
    if (type === 'textbook' && parentId) {
      setFormData({ subjectId: parentId });
    } else if (type === 'grade' && parentId) {
      setFormData({ textbookId: parentId });
    } else {
      setFormData({});
    }
  };

  const openEditModal = (type: ModalType, item: any) => {
    setModalType(type);
    setEditingItem(item);
    setError('');
    if (type === 'subject') {
      setFormData({ name: item.name, code: item.code, description: item.description, sortOrder: item.sortOrder, isActive: item.isActive });
    } else if (type === 'textbook') {
      setFormData({ subjectId: item.subjectId, name: item.name, publisher: item.publisher, gradeRange: item.gradeRange, description: item.description, sortOrder: item.sortOrder, isActive: item.isActive });
    } else if (type === 'grade') {
      setFormData({ textbookId: item.textbookId, name: item.name, code: item.code, description: item.description, price: item.price, sortOrder: item.sortOrder, isActive: item.isActive });
    }
  };

  const closeModal = () => {
    setModalType(null);
    setEditingItem(null);
    setFormData({});
    setError('');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">加载中...</div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">科目与年级管理</h2>
        <button
          onClick={() => openCreateModal('subject')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          + 新增科目
        </button>
      </div>

      {/* Subjects tree */}
      <div className="space-y-2">
        {subjects.map(subject => {
          const subjectTextbooks = getTextbooksForSubject(subject.id);
          const isExpanded = expandedSubject === subject.id;

          return (
            <div key={subject.id} className="border rounded-lg bg-white shadow-sm">
              {/* Subject row */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">{isExpanded ? '▼' : '▶'}</span>
                  <div>
                    <div className="font-semibold text-gray-800">
                      {subject.name}
                      <span className="ml-2 text-xs text-gray-400">({subject.code})</span>
                      {subject.isActive === 0 && <span className="ml-2 text-xs text-red-500">已停用</span>}
                    </div>
                    {subject.description && <div className="text-xs text-gray-500">{subject.description}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{subjectTextbooks.length} 个教材</span>
                  <button
                    onClick={e => { e.stopPropagation(); openCreateModal('textbook', subject.id); }}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    + 教材
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); openEditModal('subject', subject); }}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    编辑
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete('subject', subject.id); }}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    删除
                  </button>
                </div>
              </div>

              {/* Textbooks */}
              {isExpanded && subjectTextbooks.length > 0 && (
                <div className="border-t bg-gray-50">
                  {subjectTextbooks.map(textbook => {
                    const textbookGrades = getGradesForTextbook(textbook.id);
                    const isTbExpanded = expandedTextbook === textbook.id;

                    return (
                      <div key={textbook.id} className="border-b last:border-b-0">
                        <div
                          className="flex items-center justify-between px-8 py-3 cursor-pointer hover:bg-gray-100"
                          onClick={() => setExpandedTextbook(isTbExpanded ? null : textbook.id)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400 text-xs">{isTbExpanded ? '▼' : '▶'}</span>
                            <div>
                              <div className="font-medium text-gray-700 text-sm">
                                {textbook.name}
                                {textbook.publisher && <span className="ml-2 text-xs text-gray-400">({textbook.publisher})</span>}
                              </div>
                              {textbook.gradeRange && <div className="text-xs text-gray-400">适用: {textbook.gradeRange}</div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{textbookGrades.length} 个年级</span>
                            <button
                              onClick={e => { e.stopPropagation(); openCreateModal('grade', textbook.id); }}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              + 年级
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); openEditModal('textbook', textbook); }}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              编辑
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete('textbook', textbook.id); }}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              删除
                            </button>
                          </div>
                        </div>

                        {/* Grades */}
                        {isTbExpanded && textbookGrades.length > 0 && (
                          <div className="px-12 pb-3">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-xs text-gray-500 border-b">
                                  <th className="py-1 pr-2">排序</th>
                                  <th className="py-1 pr-2">名称</th>
                                  <th className="py-1 pr-2">代码</th>
                                  <th className="py-1 pr-2">价格</th>
                                  <th className="py-1 pr-2">状态</th>
                                  <th className="py-1">操作</th>
                                </tr>
                              </thead>
                              <tbody>
                                {textbookGrades.map(grade => (
                                  <tr key={grade.id} className="border-b last:border-b-0">
                                    <td className="py-2 pr-2 text-gray-400">{grade.sortOrder}</td>
                                    <td className="py-2 pr-2 font-medium">{grade.name}</td>
                                    <td className="py-2 pr-2 text-gray-400">{grade.code || '-'}</td>
                                    <td className="py-2 pr-2 text-gray-500">¥{grade.price || '0'}</td>
                                    <td className="py-2 pr-2">
                                      {grade.isActive === 1
                                        ? <span className="text-xs text-green-600">启用</span>
                                        : <span className="text-xs text-red-500">停用</span>
                                      }
                                    </td>
                                    <td className="py-2">
                                      <button
                                        onClick={() => openEditModal('grade', grade)}
                                        className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 mr-1"
                                      >
                                        编辑
                                      </button>
                                      <button
                                        onClick={() => handleDelete('grade', grade.id)}
                                        className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                      >
                                        删除
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {isTbExpanded && textbookGrades.length === 0 && (
                          <div className="px-12 pb-3 text-sm text-gray-400">暂无年级，点击"+ 年级"添加</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {isExpanded && subjectTextbooks.length === 0 && (
                <div className="border-t px-8 py-3 text-sm text-gray-400">暂无教材，点击"+ 教材"添加</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">
              {editingItem ? '编辑' : '新增'}
              {modalType === 'subject' ? '科目' : modalType === 'textbook' ? '教材' : '年级'}
            </h3>

            {error && <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}

            <div className="space-y-3">
              {/* Subject fields */}
              {modalType === 'subject' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">代码 *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} disabled={!!editingItem} placeholder="如 math, chinese" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                      <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.sortOrder ?? 0} onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                      <select className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.isActive ?? 1} onChange={e => setFormData({ ...formData, isActive: parseInt(e.target.value) })}>
                        <option value={1}>启用</option>
                        <option value={0}>停用</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Textbook fields */}
              {modalType === 'textbook' && (
                <>
                  <input type="hidden" value={formData.subjectId || ''} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="如 人教版语文" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">出版社</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.publisher || ''} onChange={e => setFormData({ ...formData, publisher: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">适用年级范围</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.gradeRange || ''} onChange={e => setFormData({ ...formData, gradeRange: e.target.value })} placeholder="如 1-6年级" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                      <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.sortOrder ?? 0} onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                      <select className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.isActive ?? 1} onChange={e => setFormData({ ...formData, isActive: parseInt(e.target.value) })}>
                        <option value={1}>启用</option>
                        <option value={0}>停用</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Grade fields */}
              {modalType === 'grade' && (
                <>
                  <input type="hidden" value={formData.textbookId || ''} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="如 一年级上册 / C++基础语法" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">代码</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="如 grade-1a" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">价格 (元)</label>
                      <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.price || '0'} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                      <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.sortOrder ?? 0} onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.isActive ?? 1} onChange={e => setFormData({ ...formData, isActive: parseInt(e.target.value) })}>
                      <option value={1}>启用</option>
                      <option value={0}>停用</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
