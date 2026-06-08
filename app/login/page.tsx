'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Eye, EyeOff, Users, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth';

interface User {
  id: string;
  nickname: string;
  phone: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({ phone: '', password: '', loginAsUserId: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);

  useEffect(() => {
    if (formData.phone === 'admin') {
      setIsAdminLogin(true);
      fetchUsers();
    } else {
      setIsAdminLogin(false);
      setShowUserSelector(false);
      setFormData(prev => ({ ...prev, loginAsUserId: '' }));
    }
  }, [formData.phone]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.phone || !formData.password) {
      setError('请输入手机号和密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/password-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        login(data.token, data.user, data.isAdmin || false);
        router.push('/');
      } else {
        setError(data.error || '登录失败');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setFormData(prev => ({ ...prev, loginAsUserId: user.id }));
    setShowUserSelector(false);
  };

  const clearUserSelect = () => {
    setFormData(prev => ({ ...prev, loginAsUserId: '' }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.img
            src="/logo-horizontal.png"
            alt="OpenMAIC"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-800">欢迎回来</h1>
          <p className="text-gray-500 mt-2">请登录您的账户</p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">手机号</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="请输入手机号或 admin"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="请输入密码"
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Admin User Selector */}
          {isAdminLogin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-2"
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                以其他用户身份登录（可选）
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserSelector(!showUserSelector)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-left flex items-center justify-between hover:bg-gray-50 transition"
                >
                  {formData.loginAsUserId ? (
                    <span className="text-gray-800">
                      {users.find(u => u.id === formData.loginAsUserId)?.nickname || '已选择用户'}
                    </span>
                  ) : (
                    <span className="text-gray-400">选择要登录的用户...</span>
                  )}
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showUserSelector ? 'rotate-180' : ''}`} />
                </button>
                
                {showUserSelector && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-64 overflow-y-auto"
                  >
                    <div className="p-2">
                      {users.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleUserSelect(user)}
                          className={`w-full px-4 py-2 rounded-lg text-left flex items-center gap-3 hover:bg-gray-50 transition ${
                            formData.loginAsUserId === user.id ? 'bg-indigo-50' : ''
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <Users className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{user.nickname}</p>
                            <p className="text-xs text-gray-500">{user.phone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {formData.loginAsUserId && (
                  <button
                    type="button"
                    onClick={clearUserSelect}
                    className="mt-2 text-xs text-red-500 hover:text-red-600 transition"
                  >
                    取消以其他用户身份登录
                  </button>
                )}
              </div>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
        </div>
      </motion.div>
    </div>
  );
}