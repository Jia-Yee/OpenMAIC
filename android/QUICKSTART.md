# 快速开始指南

## 前置条件

1. **安装 Android Studio**
   - 下载地址：https://developer.android.com/studio
   - 推荐版本：Hedgehog (2023.1.1) 或更高

2. **安装 JDK 17**
   - Android Studio 通常自带 JDK，确保使用 JDK 17 或更高版本

3. **配置 Android SDK**
   - 启动 Android Studio，进入 Settings → Appearance & Behavior → System Settings → Android SDK
   - 安装 Android 14 (API 34) SDK Platform
   - 确保安装 Android SDK Build-Tools 34.0.0

## 项目设置

### 1. 打开项目

1. 启动 Android Studio
2. 选择 "Open an Existing Project"
3. 导航到 `android/` 目录并选择
4. 等待 Gradle 同步完成（首次可能需要几分钟）

### 2. 配置服务器地址

打开 `app/src/main/res/values/strings.xml`，修改：

```xml
<string name="base_url">http://192.168.1.4:3000</string>
```

将其改为你的实际服务器地址：
- 如果在模拟器中访问：使用 `http://10.0.2.2:3000`（Android 模拟器的主机回环地址）
- 如果在真机上访问：确保手机和电脑在同一局域网，使用电脑的局域网 IP

### 3. 启动开发服务器

确保 Web 应用正在运行：

```bash
cd /path/to/OpenMAIC
./start.sh
```

选择开发模式，确保服务器在 `0.0.0.0:3000` 上监听（已在 start.sh 中配置）。

## 运行应用

### 在模拟器上运行

1. 在 Android Studio 中，点击工具栏的 Device Manager
2. 点击 "Create Device" 创建虚拟设备（推荐 Pixel 6）
3. 选择系统镜像（推荐 Android 14）并下载安装
4. 完成设备创建后，在设备管理器中启动模拟器
5. 点击 Android Studio 工具栏的 "Run" 按钮（绿色三角形）

### 在真机上运行

1. 在手机上启用开发者选项：
   - 进入设置 → 关于手机
   - 连续点击"版本号" 7 次
2. 启用 USB 调试
3. 用 USB 数据线连接手机和电脑
4. 在手机上授权 USB 调试
5. 在 Android Studio 中点击 "Run" 按钮

## 项目结构说明

```
android/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/com/example/classroom/
│   │       │   ├── MainActivity.kt              # 主页面，嵌入 mobile 首页
│   │       │   └── AdventureActivity.kt         # 冒险模式页面
│   │       ├── res/
│   │       │   ├── layout/                      # 布局文件
│   │       │   └── values/                      # 资源文件
│   │       └── AndroidManifest.xml
│   └── build.gradle.kts
├── gradle/
└── README.md
```

## Web 和 Native 通信

### 从 JavaScript 调用 Android 方法

```javascript
// 显示 Toast
if (window.Android) {
    window.Android.showToast('欢迎使用！');
}

// 打开冒险模式
if (window.Android) {
    window.Android.openAdventure(
        'subject-math',
        '数学',
        'grade-rjb-1a'
    );
}

// 获取服务器地址
if (window.Android) {
    const baseUrl = window.Android.getBaseUrl();
}
```

### 使用自定义 URL Scheme

```javascript
// 分享课程
window.location.href = 'app://classroom?action=share&title=课程名称&content=分享内容';

// 保存进度
window.location.href = 'app://classroom?action=saveProgress&progress=50';
```

## 调试技巧

### 查看 WebView 日志

1. 在 Android Studio 中打开 Logcat
2. 过滤标签：`MainActivity` 或 `AdventureActivity`
3. WebView 的 console.log 会显示为 `WebView Console`

### Chrome DevTools 远程调试

1. 在电脑上打开 Chrome 浏览器
2. 访问 `chrome://inspect`
3. 确保手机连接或模拟器运行
4. 在设备列表中找到你的应用，点击 "inspect"
5. 即可像调试普通网页一样调试 WebView

## 常见问题

### 无法加载页面

1. 检查 `strings.xml` 中的 `base_url` 是否正确
2. 确保 Web 服务器正在运行
3. 如果使用真机：确保手机和电脑在同一网络
4. 如果使用模拟器：尝试用 `http://10.0.2.2:3000`

### 网络请求失败

1. 确认 `AndroidManifest.xml` 中已添加 `INTERNET` 权限
2. 检查 `usesCleartextTraffic="true"` 是否存在（允许 HTTP）
3. 如果使用 HTTPS，确保证书有效

### JavaScript 不工作

1. 确认 `webView.settings.javaScriptEnabled = true`
2. 检查 WebView 控制台是否有错误
3. 使用 Chrome DevTools 调试

## 下一步

1. 根据需要修改 `MainActivity.kt` 添加更多功能
2. 完善 `GradeSelectionActivity` 和 `SubjectSelectionActivity`
3. 设计应用图标和启动画面
4. 添加更多原生功能与 Web 集成
