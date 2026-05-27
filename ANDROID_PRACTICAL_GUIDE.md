# OpenMAIC Android 应用 - 实用开发方案

## 🎯 推荐方案

由于 Next.js 静态导出会移除 API 路由，我们采用以下**两种开发模式**：

---

## 📱 方案 A：开发模式（推荐用于开发阶段）

### 工作原理

```
Android App (WebView) → 加载远程 URL → Next.js 开发服务器
```

### 优势

- ✅ 实时热重载
- ✅ API 路由正常工作
- ✅ 调试方便
- ✅ 无需重新构建

### 配置步骤

#### 1. 启动 Next.js 开发服务器

```bash
cd /home/ubuntu/learning-by-doing/OpenMAIC
pnpm dev
```

服务器将在 `http://localhost:3000` 运行。

#### 2. 获取本地 IP 地址

```bash
hostname -I | awk '{print $1}'
# 例如：192.168.1.4
```

#### 3. 修改 Capacitor 配置

编辑 `capacitor.config.ts`：

```typescript
const config: CapacitorConfig = {
  appId: 'com.openmaic.player',
  appName: 'OpenMAIC Player',
  webDir: 'out',
  server: {
    // 使用本地开发服务器
    url: 'http://YOUR_IP_ADDRESS:3000/mobile',
    cleartext: true,
  },
  // ... 其他配置
};
```

将 `YOUR_IP_ADDRESS` 替换为你的实际 IP 地址。

#### 4. 同步并运行

```bash
npx cap sync
npx cap open android
```

在 Android Studio 中运行应用。

### 注意事项

⚠️ **确保手机和电脑在同一 WiFi 网络**  
⚠️ **防火墙需要允许 3000 端口访问**  
⚠️ **每次修改代码后，WebView 会自动刷新**

---

## 📦 方案 B：生产模式（用于发布）

### 工作原理

```
Android App (WebView) → 加载打包的静态文件 → 远程 API 服务器
```

### 优势

- ✅ 离线可用（部分功能）
- ✅ 性能更好
- ✅ 无需网络连接（查看已缓存内容）

### 限制

- ❌ API 路由不可用（需要独立部署后端）
- ❌ 需要重新构建才能更新内容

### 实施步骤

#### 1. 部署后端 API

将 OpenMAIC 的后端 API 部署到服务器，例如：
- `https://api.openmaic.com`

#### 2. 修改前端 API 调用

在所有移动端页面中，将 API 调用改为指向远程服务器：

```typescript
// 原来
const response = await fetch('/api/classrooms');

// 改为
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.openmaic.com';
const response = await fetch(`${API_BASE}/api/classrooms`);
```

#### 3. 创建环境变量文件

创建 `.env.production.mobile`：

```env
NEXT_PUBLIC_API_URL=https://api.openmaic.com
```

#### 4. 构建静态版本

```bash
export MOBILE_BUILD=true
pnpm build
```

#### 5. 同步到 Android

```bash
npx cap sync
npx cap open android
```

---

## 🔄 混合方案（最佳实践）

结合两种方案的优点：

### 开发阶段

使用**方案 A**（远程 URL + 开发服务器）
- 快速迭代
- 实时调试

### 测试阶段

使用**方案 B**（静态文件 + 远程 API）
- 接近生产环境
- 测试离线功能

### 发布阶段

使用**方案 B**并优化
- 启用 Service Worker
- 实现离线缓存策略
- 压缩资源

---

## 🛠️ 当前实施状态

### 已完成

✅ Capacitor 配置  
✅ 移动端专用页面（`/mobile`）  
✅ 课堂播放器（`/mobile/classroom/[id]`）  
✅ TTS 适配器（支持降级）  
✅ 响应式布局  
✅ PWA manifest  

### 待完成

🔄 API 路由适配（远程化）  
🔄 Service Worker 离线缓存  
🔄 用户认证集成  
🔄 付费课程解锁逻辑  

---

## 📝 立即可用的开发流程

### 方法 1：使用现有服务（最简单）

既然你的 OpenMAIC 已经在 `http://localhost:3000` 运行，可以：

1. **修改 Capacitor 配置使用远程 URL**：

```typescript
// capacitor.config.ts
server: {
  url: 'http://192.168.1.4:3000/mobile',  // 替换为你的 IP
  cleartext: true,
}
```

2. **同步并打开**：

```bash
npx cap sync
npx cap open android
```

3. **在 Android Studio 中运行**

这样 WebView 会加载你正在运行的开发服务器，所有功能都正常工作！

### 方法 2：快速测试（无需配置）

如果只是想看看效果：

```bash
# 1. 确保服务在运行
curl http://localhost:3000/api/health

# 2. 添加 Android 平台
npx cap add android

# 3. 使用默认配置（静态文件）同步
npx cap sync

# 4. 打开 Android Studio
npx cap open android
```

应用会显示模拟数据（已在代码中实现 fallback）。

---

## 💡 建议

对于**当前阶段**，我强烈推荐使用**方法 1**：

1. ✅ 无需修改大量代码
2. ✅ API 路由正常工作
3. ✅ 可以完整测试所有功能
4. ✅ 开发效率高

等核心功能稳定后，再考虑迁移到生产模式（方案 B）。

---

## 🚀 下一步行动

立即执行：

```bash
# 1. 获取你的 IP
hostname -I | awk '{print $1}'

# 2. 编辑 capacitor.config.ts，设置正确的 URL
nano capacitor.config.ts

# 3. 同步
npx cap sync

# 4. 打开 Android Studio
npx cap open android
```

开始测试吧！🎉
