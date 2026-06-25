'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StatCard {
  title: string;
  value: string;
  icon: string;
  color: string;
  href?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<StatCard[]>([
    { title: '用户总数', value: '加载中...', icon: '👥', color: 'bg-blue-500', href: '/admin/users' },
    { title: '课堂数量', value: '加载中...', icon: '🎓', color: 'bg-orange-500', href: '/admin/classrooms' },
    { title: '课程数量', value: '加载中...', icon: '📚', color: 'bg-green-500', href: '/admin/courses' },
    { title: '年级数量', value: '加载中...', icon: '📊', color: 'bg-purple-500' },
  ]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersRes, classroomsRes, coursesRes, gradesRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/classrooms'),
        fetch('/api/admin/courses'),
        fetch('/api/admin/grades'),
      ]);
      
      const [usersData, classroomsData, coursesData, gradesData] = await Promise.all([
        usersRes.json(),
        classroomsRes.json(),
        coursesRes.json(),
        gradesRes.json(),
      ]);

      const freeCourses = (coursesData.courses || []).filter((c: any) => c.isFree).length;

      setStats([
        { title: '用户总数', value: (usersData.users?.length || 0).toString(), icon: '👥', color: 'bg-blue-500', href: '/admin/users' },
        { title: '课堂数量', value: (classroomsData.classrooms?.length || 0).toString(), icon: '🎓', color: 'bg-orange-500', href: '/admin/classrooms' },
        { title: '课程数量', value: (coursesData.courses?.length || 0).toString(), icon: '📚', color: 'bg-green-500', href: '/admin/courses' },
        { title: '免费课程', value: freeCourses.toString(), icon: '🎁', color: 'bg-yellow-500' },
      ]);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">欢迎回来，管理员</h1>
        <p className="text-indigo-200 mt-2">今天是美好的一天，开始管理您的学习平台吧！</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <button
            key={index}
            onClick={() => stat.href && router.push(stat.href)}
            className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition text-left ${stat.href ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
              </div>
              <div className={`w-14 h-14 ${stat.color} rounded-xl flex items-center justify-center text-white text-2xl`}>
                {stat.icon}
              </div>
            </div>
            {stat.href && (
              <p className="text-xs text-indigo-600 mt-2">点击查看 →</p>
            )}
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">快速操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/admin/classrooms')}
            className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition"
          >
            <span className="text-2xl">🎓</span>
            <div className="text-left">
              <p className="font-medium text-gray-800">课堂管理</p>
              <p className="text-sm text-gray-500">创建、编辑和管理课堂</p>
            </div>
          </button>
          <button
            onClick={() => router.push('/admin/users')}
            className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
          >
            <span className="text-2xl">👥</span>
            <div className="text-left">
              <p className="font-medium text-gray-800">管理用户</p>
              <p className="text-sm text-gray-500">查看和配置用户权限</p>
            </div>
          </button>
          <button
            onClick={() => router.push('/admin/courses')}
            className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition"
          >
            <span className="text-2xl">📚</span>
            <div className="text-left">
              <p className="font-medium text-gray-800">管理课程</p>
              <p className="text-sm text-gray-500">设置免费/付费课程</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition">
            <span className="text-2xl">📊</span>
            <div className="text-left">
              <p className="font-medium text-gray-800">查看年级</p>
              <p className="text-sm text-gray-500">管理年级和价格</p>
            </div>
          </button>
        </div>
      </div>

      {/* Help Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-800 mb-3">📖 使用指南</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div className="bg-white/50 rounded-lg p-3">
            <p className="font-medium mb-1">1. 课堂管理</p>
            <p className="text-blue-600">将上传的课堂数据同步到课程系统</p>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <p className="font-medium mb-1">2. 课程管理</p>
            <p className="text-blue-600">设置课程为免费或付费状态</p>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <p className="font-medium mb-1">3. 用户管理</p>
            <p className="text-blue-600">为用户分配可访问的年级权限</p>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <p className="font-medium mb-1">4. 移动端</p>
            <p className="text-blue-600">用户登录后自动进入冒险学习页面</p>
          </div>
        </div>
      </div>
    </div>
  );
}
