'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  openid: string;
  nickname: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

interface Grade {
  id: string;
  name: string;
  code?: string;
  subjectName?: string;
}

interface Subscription {
  id: string;
  userId: string;
  gradeId: string;
  status: string;
  expiresAt: number;
  paidAt?: number;
  amount?: number;
  gradeName?: string;
  subjectName?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [allGrades, setAllGrades] = useState<Grade[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [addForm, setAddForm] = useState({ openid: '', nickname: '', phone: '', password: '' });
  const [editForm, setEditForm] = useState({ nickname: '', phone: '', password: '' });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingExpiresAt, setEditingExpiresAt] = useState<string>('');

  useEffect(() => {
    fetchUsers();
    fetchGrades();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user => {
      const query = searchQuery.toLowerCase();
      return (
        user.nickname?.toLowerCase().includes(query) ||
        user.phone?.includes(query) ||
        user.openid.toLowerCase().includes(query)
      );
    });
    setFilteredUsers(filtered);
  }, [users, searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
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
      setAllGrades(uniqueGrades);
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const fetchSubscriptions = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/subscriptions?userId=${userId}`);
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setSubscriptions([]);
    }
  };

  const handleAddClick = () => {
    setAddForm({ openid: '', nickname: '', phone: '', password: '' });
    setShowAddModal(true);
  };

  const handleAddUser = async () => {
    try {
      // Don't send openid, let server auto-generate
      const { openid, ...formData } = addForm;
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('用户创建成功');
        setShowAddModal(false);
        setAddForm({ openid: '', nickname: '', phone: '', password: '' });
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || '创建失败');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('创建失败');
    }
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      nickname: user.nickname !== null && user.nickname !== undefined ? user.nickname : '',
      phone: user.phone !== null && user.phone !== undefined ? user.phone : '',
      password: '',
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      // Only send password if it's not empty
      const { password, ...otherData } = editForm;
      const dataToSend = password ? editForm : otherData;
      
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (res.ok) {
        alert('用户信息更新成功');
        setShowEditModal(false);
        fetchUsers();
      } else {
        alert('更新失败');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('更新失败');
    }
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('用户删除成功');
        setShowDeleteConfirm(false);
        fetchUsers();
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('删除失败');
    }
  };

  const handleSubscriptionClick = async (user: User) => {
    setSelectedUser(user);
    await fetchSubscriptions(user.id);
    setShowSubscriptionModal(true);
  };

  const handleAddSubscription = async (gradeId: string) => {
    if (!selectedUser) return;

    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          gradeId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`订阅成功！有效期至 ${new Date(data.expiresAt * 1000).toLocaleDateString('zh-CN')}`);
        fetchSubscriptions(selectedUser.id);
      } else {
        alert('添加失败');
      }
    } catch (error) {
      console.error('Error adding subscription:', error);
      alert('添加失败');
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (!confirm('确定要删除此订阅吗？')) return;
    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
      });

      if (res.ok && selectedUser) {
        fetchSubscriptions(selectedUser.id);
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
      alert('删除失败');
    }
  };

  const handleUpdateExpiry = async (subscriptionId: string, expiresAt: number) => {
    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresAt }),
      });

      if (res.ok && selectedUser) {
        fetchSubscriptions(selectedUser.id);
        setEditingSubId(null);
      } else {
        alert('更新失败');
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('更新失败');
    }
  };

  const startEditingExpiry = (sub: Subscription) => {
    setEditingSubId(sub.id);
    // Convert unix timestamp to date string for the date input
    const d = new Date(typeof sub.expiresAt === 'number' ? sub.expiresAt * 1000 : sub.expiresAt);
    setEditingExpiresAt(d.toISOString().split('T')[0]);
  };

  const quickSetExpiry = (months: number) => {
    const now = new Date();
    now.setMonth(now.getMonth() + months);
    setEditingExpiresAt(now.toISOString().split('T')[0]);
  };

  const saveExpiry = () => {
    if (!editingSubId || !editingExpiresAt) return;
    const ts = Math.floor(new Date(editingExpiresAt + 'T23:59:59').getTime() / 1000);
    handleUpdateExpiry(editingSubId, ts);
  };

  const formatDate = (date: Date | number) => {
    const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (date: Date | number) => {
    const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
    return d < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">用户列表</h2>
          <p className="text-sm text-gray-500 mt-1">管理用户信息和权限配置</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAddClick}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            添加用户
          </button>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            刷新
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索用户昵称、手机号或OpenID..."
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          共 {filteredUsers.length} 个用户
        </p>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">用户信息</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">注册时间</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                  加载中...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                  {searchQuery ? '未找到匹配的用户' : '暂无用户'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.nickname} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                          {user.nickname?.[0] || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-800">{user.nickname || '未设置昵称'}</p>
                        <p className="text-sm text-gray-500">{user.phone || '未绑定手机'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleSubscriptionClick(user)}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition text-sm"
                      >
                        订阅
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user)}
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

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">添加用户</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">OpenID（自动生成）</label>
                <p className="text-sm text-gray-500">系统将自动生成唯一的OpenID</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
                <input
                  type="text"
                  value={addForm.nickname}
                  onChange={(e) => setAddForm({ ...addForm, nickname: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号 *</label>
                <input
                  type="text"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="用于密码登录"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <div className="relative">
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="留空则不设置密码"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showAddPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                取消
              </button>
              <button onClick={handleAddUser} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">编辑用户信息</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
                <input
                  type="text"
                  value={editForm.nickname}
                  onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">重置密码（留空则不修改）</label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="输入新密码"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showEditPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                取消
              </button>
              <button onClick={handleUpdateUser} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">确认删除</h3>
              <p className="text-gray-600 mb-6">
                确定要删除用户 "{selectedUser.nickname || '未设置昵称'}" 吗？此操作无法撤销。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {showSubscriptionModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">用户订阅管理</h3>
              <p className="text-sm text-gray-500 mt-1">用户: {selectedUser.nickname || '未设置昵称'}</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Grade Subscription Config */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-1">年级权限配置</h4>
                <p className="text-sm text-gray-500 mb-3">勾选年级自动创建订阅（默认6个月），取消勾选删除订阅</p>
                <div className="space-y-2">
                  {allGrades.map((grade) => {
                    const sub = subscriptions.find((s) => s.gradeId === grade.id);
                    const isChecked = !!sub;
                    const isEditing = editingSubId === sub?.id;
                    return (
                      <div
                        key={grade.id}
                        className={`rounded-lg border transition-colors ${
                          isChecked
                            ? isExpired(sub!.expiresAt) ? 'border-red-200 bg-red-50' : 'border-indigo-200 bg-indigo-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 p-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked && sub) {
                                handleDeleteSubscription(sub.id);
                              } else {
                                handleAddSubscription(grade.id);
                              }
                            }}
                            className="rounded text-indigo-600"
                          />
                          <span className="text-sm font-medium">{grade.name}</span>
                          {grade.subjectName && (
                            <span className="text-xs text-gray-500">({grade.subjectName})</span>
                          )}
                          {isChecked && sub && (
                            <span className={`ml-auto text-xs ${isExpired(sub.expiresAt) ? 'text-red-500' : 'text-green-600'}`}>
                              {isExpired(sub.expiresAt) ? '已过期' : `到期: ${formatDate(sub.expiresAt)}`}
                            </span>
                          )}
                          {isChecked && sub && !isEditing && (
                            <button
                              onClick={() => startEditingExpiry(sub)}
                              className="ml-1 text-xs px-2 py-0.5 rounded bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"
                            >
                              调整时间
                            </button>
                          )}
                          {isChecked && sub && (
                            <button
                              onClick={() => handleDeleteSubscription(sub.id)}
                              className="ml-1 text-xs px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                            >
                              删除
                            </button>
                          )}
                        </div>
                        {isEditing && sub && (
                          <div className="px-3 pb-3 border-t border-indigo-100 pt-3">
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="date"
                                value={editingExpiresAt}
                                onChange={(e) => setEditingExpiresAt(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                              />
                              <button
                                onClick={saveExpiry}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingSubId(null)}
                                className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                              >
                                取消
                              </button>
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                              <span className="text-xs text-gray-500 leading-7">快捷设置:</span>
                              {[
                                { label: '+3个月', months: 3 },
                                { label: '+6个月', months: 6 },
                                { label: '+1年', months: 12 },
                                { label: '+2年', months: 24 },
                              ].map((opt) => (
                                <button
                                  key={opt.months}
                                  onClick={() => quickSetExpiry(opt.months)}
                                  className="text-xs px-2.5 py-1 rounded-full border border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                >
                                  {opt.label}
                                </button>
                              ))}
                              <button
                                onClick={() => {
                                  // Set to end of current year
                                  const d = new Date();
                                  d.setMonth(11, 31);
                                  setEditingExpiresAt(d.toISOString().split('T')[0]);
                                }}
                                className="text-xs px-2.5 py-1 rounded-full border border-green-200 text-green-700 hover:bg-green-100"
                              >
                                今年底
                              </button>
                              <button
                                onClick={() => {
                                  const d = new Date();
                                  d.setFullYear(d.getFullYear() + 1, 11, 31);
                                  setEditingExpiresAt(d.toISOString().split('T')[0]);
                                }}
                                className="text-xs px-2.5 py-1 rounded-full border border-green-200 text-green-700 hover:bg-green-100"
                              >
                                明年底
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => { setShowSubscriptionModal(false); setEditingSubId(null); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
