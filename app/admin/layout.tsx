'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { label: '仪表盘', href: '/admin', icon: '📊' },
  { label: '课堂管理', href: '/admin/classrooms', icon: '🎓' },
  { label: '用户管理', href: '/admin/users', icon: '👥' },
  { label: '课程管理', href: '/admin/courses', icon: '📚' },
];

interface AdminUser {
  username: string;
  role: string;
  permissions: string[];
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = () => {
    const token = localStorage.getItem('admin_token');
    const userData = localStorage.getItem('admin_user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setAdminUser(parsedUser);
        setIsLoggedIn(true);
      } catch (e) {
        console.error('Failed to parse admin user data:', e);
        logout();
      }
    }
    
    if (!isLoggedIn && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
    
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdminUser(null);
    setIsLoggedIn(false);
    router.push('/admin/login');
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-indigo-600">加载中...</div>
      </div>
    );
  }

  // Show login page if not logged in
  if (!isLoggedIn && pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-indigo-700 text-white flex flex-col transition-all duration-300`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-indigo-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-2xl">
              🎓
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-lg">三叶草管理</h1>
                <p className="text-xs text-indigo-300">Admin Panel</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <button
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    pathname === item.href
                      ? 'bg-white/20 text-white'
                      : 'text-indigo-200 hover:bg-white/10'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {sidebarOpen && <span className="font-medium">{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Toggle button */}
        <div className="p-4 border-t border-indigo-600">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            <span className="text-xl">
              {sidebarOpen ? '◀' : '▶'}
            </span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {navItems.find((item) => pathname.startsWith(item.href))?.label || '管理面板'}
              </h2>
              <p className="text-sm text-gray-500">欢迎来到三叶草管理后台</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">{adminUser?.username || '管理员'}</div>
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                {adminUser?.username?.[0] || 'A'}
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition text-sm font-medium"
              >
                退出登录
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}