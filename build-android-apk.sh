#!/bin/bash

# OpenMAIC Android APK 构建脚本
set -e

echo "=========================================="
echo "  OpenMAIC Android APK 构建工具"
echo "=========================================="
echo ""

PROJECT_DIR="/home/ubuntu/learning-by-doing/OpenMAIC"
ANDROID_DIR="$PROJECT_DIR/android"
APK_OUTPUT_DIR="$PROJECT_DIR/android-apk"

cd "$PROJECT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 步骤 1: 检查环境
echo -e "${BLUE}步骤 1: 检查开发环境${NC}"
echo "----------------------------------------"

if ! command -v java &> /dev/null; then
    echo -e "${RED}❌ 未找到 Java，请先安装 JDK 17+${NC}"
    echo "   安装命令: sudo apt install openjdk-17-jdk"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 17 ]; then
    echo -e "${RED}❌ Java 版本过低 (需要 17+)，当前版本: $JAVA_VERSION${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Java: $(java -version 2>&1 | head -1)${NC}"

if [ ! -d "$ANDROID_DIR" ]; then
    echo -e "${RED}❌ Android 目录不存在，请先运行: npx cap add android${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Android 项目已存在${NC}"
echo ""

# 步骤 2: 同步最新代码
echo -e "${BLUE}步骤 2: 同步 Web 内容到 Android${NC}"
echo "----------------------------------------"

npx cap sync
echo -e "${GREEN}✅ 同步完成${NC}"
echo ""

# 步骤 3: 配置 Gradle
echo -e "${BLUE}步骤 3: 准备 Gradle 构建${NC}"
echo "----------------------------------------"

cd "$ANDROID_DIR"

# 确保 gradlew 有执行权限
chmod +x gradlew

echo -e "${GREEN}✅ Gradle 准备就绪${NC}"
echo ""

# 步骤 4: 构建 Debug APK
echo -e "${BLUE}步骤 4: 构建 Debug APK（用于测试）${NC}"
echo "----------------------------------------"

./gradlew assembleDebug

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Debug APK 构建成功${NC}"
else
    echo -e "${RED}❌ Debug APK 构建失败${NC}"
    exit 1
fi
echo ""

# 步骤 5: 复制 APK 到输出目录
echo -e "${BLUE}步骤 5: 整理输出文件${NC}"
echo "----------------------------------------"

mkdir -p "$APK_OUTPUT_DIR"

DEBUG_APK="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$DEBUG_APK" ]; then
    cp "$DEBUG_APK" "$APK_OUTPUT_DIR/OpenMAIC-Player-debug.apk"
    echo -e "${GREEN}✅ Debug APK 已复制到: $APK_OUTPUT_DIR/OpenMAIC-Player-debug.apk${NC}"
else
    echo -e "${RED}❌ 找不到生成的 APK 文件${NC}"
    exit 1
fi

# 获取 APK 大小
APK_SIZE=$(du -h "$APK_OUTPUT_DIR/OpenMAIC-Player-debug.apk" | cut -f1)
echo -e "${GREEN}📦 APK 大小: $APK_SIZE${NC}"
echo ""

# 步骤 6: 生成安装说明
echo -e "${BLUE}步骤 6: 生成安装说明${NC}"
echo "----------------------------------------"

cat > "$APK_OUTPUT_DIR/INSTALL.md" << 'EOF'
# OpenMAIC Player Android 应用安装指南

## 📱 应用信息

- **应用名称**: OpenMAIC Player
- **版本**: Debug v0.1.0
- **包名**: com.openmaic.player
- **类型**: Debug 版本（用于测试）

## ⚙️ 前置要求

### 1. 启用未知来源安装

在平板上：
1. 打开 **设置** → **安全** 或 **应用**
2. 找到 **未知来源** 或 **安装未知应用**
3. 允许从 **文件管理器** 或 **浏览器** 安装应用

### 2. 网络连接

确保平板和电脑在同一 WiFi 网络（192.168.1.x）

## 📥 安装方法

### 方法 1: 通过 USB 传输（推荐）

1. **传输 APK 到平板**：
   ```bash
   # 在电脑上执行
   adb install OpenMAIC-Player-debug.apk
   ```

2. **或者手动传输**：
   - 使用 USB 线连接平板
   - 将 APK 文件复制到平板的 Download 目录
   - 在平板上使用文件管理器找到并点击安装

### 方法 2: 通过局域网下载

1. **在电脑上启动 HTTP 服务器**：
   ```bash
   cd /home/ubuntu/learning-by-doing/OpenMAIC/android-apk
   python3 -m http.server 8080
   ```

2. **在平板浏览器访问**：
   ```
   http://192.168.1.4:8080/OpenMAIC-Player-debug.apk
   ```

3. **下载并安装**

### 方法 3: 通过二维码

1. **生成二维码**（可选）：
   ```bash
   # 安装 qrencode
   sudo apt install qrencode
   
   # 生成二维码
   qrencode -o apk-qrcode.png "http://192.168.1.4:8080/OpenMAIC-Player-debug.apk"
   ```

2. **在平板上扫描二维码下载安装**

## 🚀 首次运行

### 重要：确保后端服务在运行

应用需要连接到 `http://192.168.1.4:3000`，请确保：

1. **在电脑上运行 OpenMAIC 服务**：
   ```bash
   cd /home/ubuntu/learning-by-doing/OpenMAIC
   pnpm dev -H 0.0.0.0 -p 3000
   ```

2. **验证服务可访问**：
   在平板浏览器访问：`http://192.168.1.4:3000/api/health`
   
   应该看到：`{"success":true,"status":"ok",...}`

3. **启动应用**：
   - 点击应用图标
   - 等待启动屏（2秒）
   - 应该看到课程列表页面

## 🐛 常见问题

### 问题 1: 应用白屏或无法加载

**原因**: 无法连接到后端服务

**解决**:
1. 确认电脑上的服务在运行
2. 确认平板和电脑在同一 WiFi
3. 在平板浏览器测试：`http://192.168.1.4:3000/mobile`

### 问题 2: 安装失败

**原因**: 未知来源未启用

**解决**:
1. 设置 → 安全 → 允许未知来源
2. 重新尝试安装

### 问题 3: 应用闪退

**查看日志**:
```bash
adb logcat | grep -i "openmaic\|capacitor"
```

## 📊 应用功能

✅ 课程浏览  
✅ 课堂播放  
✅ TTS 语音朗读  
✅ AI 对话（UI 已实现）  
✅ 场景切换  

## 🔧 开发者信息

- **构建时间**: 自动生成
- **Capacitor 版本**: 6.x
- **Android Min SDK**: 22
- **Android Target SDK**: 34

## 📞 支持

如有问题，请查看项目文档或联系开发团队。

---

**祝使用愉快！🎉**
EOF

echo -e "${GREEN}✅ 安装说明已生成: $APK_OUTPUT_DIR/INSTALL.md${NC}"
echo ""

# 完成
echo "=========================================="
echo -e "${GREEN}🎉 APK 构建完成！${NC}"
echo "=========================================="
echo ""
echo "📦 APK 位置: $APK_OUTPUT_DIR/OpenMAIC-Player-debug.apk"
echo "📖 安装说明: $APK_OUTPUT_DIR/INSTALL.md"
echo ""
echo "下一步操作："
echo "1. 确保 OpenMAIC 服务在运行: pnpm dev -H 0.0.0.0 -p 3000"
echo "2. 将 APK 传输到平板并安装"
echo "3. 在平板上打开应用测试"
echo ""
echo "快速启动 HTTP 服务器（方便平板下载）："
echo "  cd $APK_OUTPUT_DIR && python3 -m http.server 8080"
echo ""
echo "然后在平板浏览器访问："
echo "  http://192.168.1.4:8080/OpenMAIC-Player-debug.apk"
echo "=========================================="
