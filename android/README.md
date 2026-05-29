# 课程学习 Android App

使用 WebView 嵌入课程学习页面的 Android 应用。

## 功能特性

- 课程学习页面嵌入
- 年级和科目选择
- 课程进度追踪
- 本地缓存支持

## 快速开始

### 前置条件

- Android Studio Hedgehog (2023.1.1) 或更高版本
- JDK 17 或更高版本
- Android SDK API 24+ (Android 7.0)

### 安装步骤

1. 使用 Android Studio 打开项目
2. 等待 Gradle 同步完成
3. 连接 Android 设备或启动模拟器
4. 点击 Run 按钮运行应用

## 项目结构

```
android/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/com/example/classroom/
│   │       │   ├── MainActivity.kt          # 主页面
│   │       │   ├── AdventureActivity.kt     # 冒险模式页面
│   │       │   ├── GradeSelectionActivity.kt # 年级选择页面
│   │       │   └── SubjectSelectionActivity.kt # 科目选择页面
│   │       ├── res/
│   │       │   ├── layout/                   # 布局文件
│   │       │   ├── values/                   # 资源文件
│   │       │   └── mipmap-*/                 # 应用图标
│   │       └── AndroidManifest.xml
│   └── build.gradle.kts
├── gradle/
│   └── wrapper/
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties
```

## 配置说明

### 修改服务器地址

在 `app/src/main/res/values/strings.xml` 中修改：

```xml
<string name="base_url">http://192.168.1.4:3000</string>
```

### WebView 配置

在 `MainActivity.kt` 中可以配置：
- JavaScript 支持
- 缓存策略
- 权限设置
- 用户代理

## API 集成

应用与 Web 服务通信的方式：

### URL Scheme

```
app://classroom?action=xxx
```

### 支持的 Actions

- `openGradeSelection` - 打开年级选择
- `openSubjectSelection` - 打开科目选择
- `openAdventure` - 打开冒险模式
- `openClassroom` - 打开课堂
- `share` - 分享课程
- `saveProgress` - 保存进度

## 开发说明

### 添加新功能

1. 在 `app/src/main/java/com/example/classroom/` 中创建新的 Activity
2. 在 `app/src/main/res/layout/` 中创建布局文件
3. 在 `AndroidManifest.xml` 中注册 Activity
4. 实现 JavaScript 接口与 Web 页面通信

### 调试

1. 在 Android Studio 中启用 Logcat
2. 使用过滤器查看日志
3. WebView 控制台日志可通过 Chrome DevTools 查看：
   - 在 Android 设备上打开 Chrome
   - 访问 `chrome://inspect`
   - 连接设备并选择 WebView

## 构建发布

### Debug 版本

```bash
./gradlew assembleDebug
```

### Release 版本

1. 在 `app/build.gradle.kts` 中配置签名
2. 运行：

```bash
./gradlew assembleRelease
```

## 兼容性

- 最低支持 Android 7.0 (API 24)
- 目标 Android 14 (API 34)
- 支持横屏和竖屏
- 支持暗色模式

## 常见问题

### WebView 无法加载页面

检查：
1. 网络权限是否正确配置
2. 服务器地址是否可访问
3. 是否在同一网络环境
4. 防火墙设置

### JavaScript 不工作

确认：
1. `webSettings.javaScriptEnabled = true`
2. 页面没有 CSP 阻止

### 缓存问题

清除应用数据或使用：
```kotlin
webView.clearCache(true)
```

## 许可证

MIT License
