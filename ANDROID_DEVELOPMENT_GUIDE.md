# OpenMAIC Android 应用开发指南

## 📱 项目概述

OpenMAIC Player 是 OpenMAIC 的移动端 Android 应用，专注于**课堂选择**和**播放功能**。

### 核心功能

✅ **课程浏览** - 查看所有可用课程列表  
✅ **课程详情** - 查看课程信息和元数据  
✅ **课堂播放** - 播放幻灯片、测验、交互内容  
✅ **AI 对话** - 与多智能体教师实时互动  
✅ **白板查看** - 只读模式查看白板内容  
✅ **TTS 语音** - 文本转语音朗读功能  

### 排除功能

❌ 课程生成（在 Web 端完成）  
❌ 幻灯片编辑  
❌ PBL 项目管理  
❌ 文件导出  
❌ 复杂设置  

---

## 🏗️ 技术架构

### 混合架构设计

```
Android App (Capacitor Shell)
├── 原生层（Native Layer）
│   ├── 启动页（Splash Screen）
│   ├── 状态栏管理（Status Bar）
│   └── WebView 容器
│
└── WebView 层（Web Content）
    ├── /mobile - 课程列表页
    ├── /mobile/classroom/[id] - 课堂播放器
    ├── 多智能体聊天组件
    ├── 幻灯片渲染器
    ├── 测验引擎
    └── TTS 适配器
```

### 技术栈

- **前端框架**: Next.js 16 + React 19
- **移动封装**: Capacitor 6
- **UI 样式**: Tailwind CSS 4
- **状态管理**: Zustand
- **原生插件**:
  - `@capacitor-community/text-to-speech` - TTS 语音
  - `@capacitor/filesystem` - 文件系统访问
  - `@capacitor/status-bar` - 状态栏控制
  - `@capacitor/splash-screen` - 启动屏

---

## 🚀 快速开始

### 前置要求

1. **Node.js >= 20**
2. **pnpm** 包管理器
3. **Android Studio**（最新稳定版）
4. **Android SDK**（API 21+）
5. **JDK 11+**

### 一键构建

```bash
cd /home/ubuntu/learning-by-doing/OpenMAIC
bash build-android.sh
```

脚本会自动完成：
- ✅ 环境检查
- ✅ 依赖安装
- ✅ Next.js 静态构建
- ✅ Capacitor 配置
- ✅ Android 平台添加
- ✅ 内容同步

### 手动步骤

如果不想使用脚本，可以手动执行：

```bash
# 1. 安装依赖
pnpm add @capacitor/core @capacitor/cli @capacitor/android \
    @capacitor-community/text-to-speech \
    @capacitor/filesystem \
    @capacitor/status-bar \
    @capacitor/splash-screen

# 2. 初始化 Capacitor
npx cap init OpenMAICPlayer com.openmaic.player --web-dir=out

# 3. 构建 Next.js（移动端模式）
export MOBILE_BUILD=true
pnpm build

# 4. 添加 Android 平台
npx cap add android

# 5. 同步到 Android
npx cap sync

# 6. 打开 Android Studio
npx cap open android
```

---

## 📂 项目结构

```
OpenMAIC/
├── app/
│   ├── mobile/                    # 移动端专用路由
│   │   ├── page.tsx              # 课程列表页
│   │   ├── layout.tsx            # 移动端布局
│   │   └── classroom/
│   │       └── [id]/
│   │           └── page.tsx      # 课堂播放器
│   └── ...                        # 原有 Web 路由
│
├── styles/
│   └── mobile.css                # 移动端专用样式
│
├── public/
│   ├── manifest.json             # PWA 配置
│   └── icons/                    # 应用图标
│       ├── icon-192.png
│       └── icon-512.png
│
├── capacitor.config.ts           # Capacitor 配置
├── next.config.ts                # Next.js 配置（支持静态导出）
├── build-android.sh              # 自动化构建脚本
└── ANDROID_DEVELOPMENT_GUIDE.md  # 本文档
```

---

## 🔧 关键配置说明

### Next.js 静态导出

在 `next.config.ts` 中：

```typescript
const nextConfig: NextConfig = {
  // 当 MOBILE_BUILD=true 时启用静态导出
  output: process.env.MOBILE_BUILD ? 'export' : 'standalone',
  images: process.env.MOBILE_BUILD ? {
    unoptimized: true,
  } : undefined,
  // ... 其他配置
};
```

### Capacitor 配置

在 `capacitor.config.ts` 中：

```typescript
const config: CapacitorConfig = {
  appId: 'com.openmaic.player',
  appName: 'OpenMAIC Player',
  webDir: 'out',  // Next.js 静态输出目录
  server: {
    cleartext: true,  // 允许 HTTP（开发环境）
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: { /* ... */ },
    StatusBar: { /* ... */ }
  }
};
```

---

## 🎨 UI/UX 设计规范

### 移动端优化要点

1. **触摸目标尺寸**
   - 最小点击区域：44x44px
   - 按钮内边距充足

2. **手势支持**
   - 滑动切换场景（待实现）
   - 下拉刷新课程列表（待实现）

3. **响应式布局**
   - 适配各种屏幕尺寸
   - 横屏/竖屏自动调整

4. **性能优化**
   - 图片懒加载
   - 虚拟列表（长对话）
   - 减少重渲染

### 颜色方案

- **主色调**: Blue-600 (#2563eb)
- **成功色**: Green-500 (#22c55e)
- **警告色**: Yellow-500 (#eab308)
- **错误色**: Red-500 (#ef4444)

---

## 🔌 原生功能集成

### TTS 语音合成

```typescript
// lib/mobile/tts-adapter.ts
import { TextToSpeech } from '@capacitor-community/text-to-speech';

export class TTSAdapter {
  static async speak(text: string, lang: string = 'zh-CN') {
    try {
      // 尝试使用 Capacitor TTS
      await TextToSpeech.speak({ text, lang, rate: 1.0 });
    } catch (error) {
      // 降级到 Web Speech API
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        window.speechSynthesis.speak(utterance);
      }
    }
  }
}
```

### 文件系统（离线缓存）

```typescript
import { Filesystem, Directory } from '@capacitor/filesystem';

// 保存课堂数据到本地
await Filesystem.writeFile({
  path: `classrooms/${classroomId}.json`,
  data: JSON.stringify(classroomData),
  directory: Directory.Data,
});

// 读取离线数据
const result = await Filesystem.readFile({
  path: `classrooms/${classroomId}.json`,
  directory: Directory.Data,
});
```

---

## 🧪 测试与调试

### 在模拟器中测试

1. 打开 Android Studio
2. 点击 **AVD Manager** 创建虚拟设备
3. 选择 Pixel 系列设备
4. 点击 **Run** 按钮

### 在真机上测试

1. 开启手机的**开发者选项**和**USB 调试**
2. 通过 USB 连接电脑
3. 在 Android Studio 中选择设备
4. 点击 **Run**

### 调试技巧

```bash
# 查看 Android 日志
adb logcat | grep -i "capacitor\|openmaic"

# 查看 WebView 控制台
# Chrome -> chrome://inspect -> 选择设备 -> Inspect
```

---

## 📦 打包与发布

### 生成签名 APK

1. 在 Android Studio 中：**Build → Generate Signed Bundle / APK**
2. 选择 **APK**
3. 创建或选择密钥库（Keystore）
4. 填写密钥信息
5. 选择 **release** 构建类型
6. 等待构建完成

### 生成 AAB（推荐用于 Google Play）

1. **Build → Generate Signed Bundle / APK**
2. 选择 **Android App Bundle**
3. 后续步骤同上

### 应用商店上架准备

需要准备的材料：
- 📱 应用图标（512x512 PNG）
- 🖼️ 截图（手机和平板各至少 2 张）
- 📝 应用描述（中英文）
- 🔒 隐私政策 URL
- 📧 联系邮箱

---

## ⚠️ 注意事项

### AGPL-3.0 许可证

- ✅ 可免费使用和修改
- ⚠️ 分发应用需开源代码
- 💼 商业用途需联系作者：thu_maic@tsinghua.edu.cn

### API 端点

当前版本假设 API 可访问。如需独立部署：

1. 将后端 API 部署到服务器
2. 在移动端配置 API 基础 URL
3. 确保 CORS 配置正确

### 性能优化建议

- 启用图片压缩
- 使用 CDN 加速静态资源
- 实现 Service Worker 离线缓存
- 减少不必要的重渲染

---

## 🐛 常见问题

### Q1: 构建失败，提示找不到模块

**解决**：
```bash
rm -rf node_modules .next out
pnpm install
pnpm build
```

### Q2: Android Studio 无法识别项目

**解决**：
```bash
npx cap sync
# 然后在 Android Studio 中 File → Invalidate Caches → Restart
```

### Q3: 应用白屏或无法加载

**解决**：
1. 检查 `out/` 目录是否有内容
2. 查看 Android Studio Logcat 日志
3. 确认 `capacitor.config.ts` 中 `webDir` 配置正确

### Q4: TTS 不工作

**解决**：
1. 确认已安装 `@capacitor-community/text-to-speech`
2. 检查 Android 权限配置
3. 查看设备是否安装了 TTS 引擎

---

## 📞 获取帮助

- 📖 完整文档：`README.md`
- 💬 Discord: https://discord.gg/p8Pf2r3SaG
- 🐛 GitHub Issues: https://github.com/THU-MAIC/OpenMAIC/issues
- 📧 商业支持：thu_maic@tsinghua.edu.cn

---

## 📈 开发路线图

### Phase 1（已完成）
- ✅ 基础架构搭建
- ✅ 课程列表页面
- ✅ 课堂播放器
- ✅ TTS 集成
- ✅ Capacitor 配置

### Phase 2（进行中）
- 🔄 AI 对话功能完善
- 🔄 离线缓存实现
- 🔄 手势操作支持

### Phase 3（计划中）
- 📋 用户认证系统
- 📋 付费课程解锁
- 📋 学习进度同步
- 📋 推送通知

### Phase 4（未来）
- 🎯 iOS 版本（可选）
- 🎯 更多原生功能
- 🎯 性能深度优化

---

**祝你开发顺利！🎉**
