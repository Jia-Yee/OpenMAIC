'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Upload, Trash2, Play, RefreshCw, ExternalLink, FolderOpen, FileText, Sparkles, X, Monitor } from 'lucide-react';
import { db } from '@/lib/utils/database';
import { useStageStore } from '@/lib/store/stage';
import { createLogger } from '@/lib/logger';
import { nanoid } from 'nanoid';

const log = createLogger('AdminClassrooms');

interface LocalClassroom {
  id: string;
  name: string;
  description?: string;
  sceneCount?: number;
  createdAt?: number;
  updatedAt?: number;
}

export default function AdminClassroomsPage() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<LocalClassroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [requirement, setRequirement] = useState('');
  const [userNickname, setUserNickname] = useState('');
  const [webSearch, setWebSearch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    try {
      setLoading(true);
      const stages = await db.stages.toArray();
      const scenes = await db.scenes.toArray();

      const classroomList: LocalClassroom[] = stages.map((stage: any) => ({
        id: stage.id,
        name: stage.name || '未命名课堂',
        description: stage.description,
        sceneCount: scenes.filter((s: any) => s.stageId === stage.id).length,
        createdAt: stage.createdAt,
        updatedAt: stage.updatedAt,
      }));

      classroomList.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
      setClassrooms(classroomList);
    } catch (error) {
      log.error('Failed to load classrooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (classroomId: string) => {
    if (!confirm('确定要删除这个课堂吗？所有场景和媒体数据将被删除。')) return;

    try {
      setDeleting(classroomId);

      await db.scenes.where('stageId').equals(classroomId).delete();
      await db.audioFiles.where('id').startsWith(`tts_`).delete();
      await db.mediaFiles.where('id').startsWith(`${classroomId}:`).delete();
      await db.chatSessions.where('stageId').equals(classroomId).delete();
      await db.playbackState.delete(classroomId);
      await db.stageOutlines.delete(classroomId);
      await db.generatedAgents.where('stageId').equals(classroomId).delete();
      await db.stages.delete(classroomId);

      const currentStage = useStageStore.getState().stage;
      if (currentStage?.id === classroomId) {
        useStageStore.getState().clearStore();
      }

      setClassrooms((prev) => prev.filter((c) => c.id !== classroomId));
    } catch (error) {
      log.error('Failed to delete classroom:', error);
      alert('删除失败');
    } finally {
      setDeleting(null);
    }
  };

  const handleCreateFromClassroom = () => {
    // Set up generation session in sessionStorage and navigate to generation-preview
    const session = {
      sessionId: nanoid(10),
      requirements: {
        requirement: requirement.trim(),
        userNickname: userNickname.trim() || undefined,
        webSearch,
      },
      pdfText: '',
      currentStep: 'generating' as const,
    };

    sessionStorage.setItem('generationSession', JSON.stringify(session));
    router.push('/generation-preview');
  };

  const handleCreateFromPdf = () => {
    if (!pdfFile) return;

    const storageKey = `pdf_${nanoid(8)}`;

    // Store the PDF file in IndexedDB imageFiles for generation-preview to pick up
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      db.imageFiles.put({
        id: storageKey,
        blob: new Blob([arrayBuffer], { type: pdfFile.type }),
        filename: pdfFile.name,
        mimeType: pdfFile.type,
        size: arrayBuffer.byteLength,
        createdAt: Date.now(),
      }).then(() => {
        const session = {
          sessionId: nanoid(10),
          requirements: {
            requirement: requirement.trim() || `基于PDF文件「${pdfFile.name}」生成课堂`,
            userNickname: userNickname.trim() || undefined,
            webSearch,
          },
          pdfText: '',
          pdfStorageKey: storageKey,
          pdfFileName: pdfFile.name,
          currentStep: 'generating' as const,
        };

        sessionStorage.setItem('generationSession', JSON.stringify(session));
        router.push('/generation-preview');
      });
    };
    reader.readAsArrayBuffer(pdfFile);
  };

  const handleOpenClassroom = (classroomId: string) => {
    router.push(`/classroom/${classroomId}`);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">课堂管理</h1>
          <p className="text-gray-500 mt-1">创建、编辑和管理本地课堂</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/studio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            <Monitor className="w-4 h-4" />
            Studio
          </a>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" />
            创建新课堂
          </button>
        </div>
      </div>

      {/* Create Classroom Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">创建新课堂</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Requirement Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    课程需求 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={requirement}
                    onChange={(e) => setRequirement(e.target.value)}
                    placeholder="描述你想创建的课堂内容，例如：&#10;• 一年级上册数学：1~5的认识和加减法&#10;• 小学英语：动物词汇学习&#10;• 二年级数学：乘法口诀入门"
                    className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
                  />
                </div>

                {/* PDF Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    上传 PDF（可选）
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition"
                  >
                    {pdfFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <span className="text-sm text-indigo-700 font-medium">{pdfFile.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPdfFile(null); }}
                          className="p-1 hover:bg-red-100 rounded"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">点击上传 PDF 文件</p>
                        <p className="text-xs text-gray-400 mt-1">AI 将基于 PDF 内容生成课堂</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </div>

                {/* Student Nickname */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    学生昵称（可选）
                  </label>
                  <input
                    type="text"
                    value={userNickname}
                    onChange={(e) => setUserNickname(e.target.value)}
                    placeholder="用于个性化课堂内容"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>

                {/* Web Search Toggle */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setWebSearch(!webSearch)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      webSearch ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        webSearch ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                  <div>
                    <p className="text-sm font-medium text-gray-700">联网搜索</p>
                    <p className="text-xs text-gray-400">AI 将搜索相关资料丰富课堂内容</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                  >
                    取消
                  </button>
                  <button
                    onClick={pdfFile ? handleCreateFromPdf : handleCreateFromClassroom}
                    disabled={!requirement.trim() && !pdfFile}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-4 h-4" />
                    开始生成
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-sm text-gray-500">本地课堂总数</p>
          <p className="text-2xl font-bold text-gray-800">{classrooms.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-sm text-gray-500">总场景数</p>
          <p className="text-2xl font-bold text-gray-800">
            {classrooms.reduce((sum, c) => sum + (c.sceneCount || 0), 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-sm text-gray-500">最近更新</p>
          <p className="text-lg font-bold text-gray-800">
            {classrooms.length > 0 ? formatDate(classrooms[0].updatedAt || classrooms[0].createdAt) : '-'}
          </p>
        </div>
      </div>

      {/* Classroom List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">加载中...</span>
        </div>
      ) : classrooms.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border text-center">
          <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">暂无课堂</h3>
          <p className="text-gray-400 mb-6">点击上方按钮创建你的第一个课堂</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" />
            创建新课堂
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">课堂名称</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">场景数</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">创建时间</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">更新时间</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {classrooms.map((classroom) => (
                <tr key={classroom.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-800">{classroom.name}</p>
                      {classroom.description && (
                        <p className="text-sm text-gray-400 mt-0.5 truncate max-w-xs">
                          {classroom.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-300 mt-0.5 font-mono">{classroom.id}</p>
                    </div>
                  </td>
                  <td className="text-center px-4 py-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium">
                      {classroom.sceneCount || 0}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {formatDate(classroom.createdAt)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {formatDate(classroom.updatedAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenClassroom(classroom.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition"
                        title="打开课堂"
                      >
                        <Play className="w-3.5 h-3.5" />
                        打开
                      </button>
                      <button
                        onClick={() => router.push(`/admin/courses`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition"
                        title="同步到服务器"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        同步
                      </button>
                      <button
                        onClick={() => handleDelete(classroom.id)}
                        disabled={deleting === classroom.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition disabled:opacity-50"
                        title="删除课堂"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deleting === classroom.id ? '删除中...' : '删除'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Links */}
      <div className="bg-gray-50 rounded-xl p-6 border">
        <h3 className="font-medium text-gray-700 mb-3">快速入口</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <a
            href="/admin/studio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-sm transition text-left"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Monitor className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-gray-800 text-sm">Studio</p>
              <p className="text-xs text-gray-400">创建/上传/编辑课堂</p>
            </div>
          </a>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-sm transition text-left"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-800 text-sm">AI 生成课堂</p>
              <p className="text-xs text-gray-400">从需求/PDF自动生成</p>
            </div>
          </button>
          <button
            onClick={() => router.push('/admin/courses')}
            className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-sm transition text-left"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-800 text-sm">课程管理</p>
              <p className="text-xs text-gray-400">上传同步到服务器</p>
            </div>
          </button>
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-sm transition text-left"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-800 text-sm">管理后台</p>
              <p className="text-xs text-gray-400">返回仪表盘</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
