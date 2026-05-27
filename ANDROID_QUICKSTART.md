# OpenMAIC Android 应用 - 5分钟快速开始

## 🎯 目标

在 5 分钟内完成环境准备，并开始在 Android Studio 中运行应用。

---

## ⚡ 快速步骤

### 第 1 步：检查环境（1 分钟）

```bash
# 检查 Node.js
node --version  # 应 >= 20

# 检查 pnpm
pnpm --version

# 如果没有 pnpm，安装它
npm install -g pnpm
```

### 第 2 步：运行构建脚本（3 分钟）

```bash
cd /home/ubuntu/learning-by-doing/OpenMAIC
bash build-android.sh
```

脚本会自动：
- ✅ 安装所有依赖
- ✅ 构建 Next.js 应用
- ✅ 配置 Capacitor
- ✅ 添加 Android 平台
- ✅ 同步内容

### 第 3 步：打开 Android Studio（1 分钟）

```bash
npx cap open android
```

这会在 Android Studio 中打开项目。

---

## 📱 在模拟器中运行

### 创建虚拟设备

1. 在 Android Studio 中点击 **AVD Manager**（工具栏右侧）
2. 点击 **Create Virtual Device**
3. 选择 **Pixel 6** 或类似设备
4. 选择系统镜像（推荐 API 33+）
5. 点击 **Finish**

### 运行应用

1. 在工具栏选择刚创建的设备
2. 点击绿色的 **Run** 按钮（或按 Shift+F10）
3. 等待应用安装和启动

---

## 📲 在真机上运行

### 准备工作

1. **开启开发者选项**：
   - 设置 → 关于手机 → 连续点击"版本号"7次
   
2. **开启 USB 调试**：
   - 设置 → 开发者选项 → USB 调试

3. **连接电脑**：
   - 使用 USB 线连接手机
   - 手机上允许 USB 调试授权

### 运行应用

1. 在 Android Studio 中选择你的设备
2. 点击 **Run** 按钮
3. 应用会自动安装到手机上

---

## 🔍 验证是否成功

应用启动后应该看到：

1. ✅ 启动屏（Splash Screen）显示 2 秒
2. ✅ 课程列表页面加载
3. ✅ 可以点击课程卡片
4. ✅ 进入课堂播放器

---

## 🐛 遇到问题？

### 问题 1：构建失败

```bash
# 清理并重新构建
rm -rf node_modules .next out android
pnpm install
bash build-android.sh
```

### 问题 2：Android Studio 报错

```bash
# 重新同步
npx cap sync android

# 在 Android Studio 中：
# File → Invalidate Caches → Restart
```

### 问题 3：应用白屏

查看日志：
```bash
adb logcat | grep -i "capacitor\|openmaic"
```

常见原因：
- `out/` 目录为空 → 重新运行 `pnpm build`
- 配置错误 → 检查 `capacitor.config.ts`

---

## 📚 下一步

- 📖 阅读完整文档：`ANDROID_DEVELOPMENT_GUIDE.md`
- 🎨 自定义 UI：编辑 `app/mobile/page.tsx`
- 🔌 添加功能：参考 Capacitor 插件文档
- 📦 打包发布：参考文档中的"打包与发布"章节

---

## 💡 提示

- **开发时**：修改代码后需要重新运行 `pnpm build && npx cap sync`
- **调试时**：使用 Chrome DevTools（chrome://inspect）
- **性能优化**：启用 React DevTools Profiler

---

**开始开发吧！🚀**
