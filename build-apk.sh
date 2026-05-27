#!/bin/bash
# 一键打包 OpenMAIC Android APK
# 用法: ./build-apk.sh

set -e

PROJECT_ROOT="/Users/jia/workspace/OpenMAIC"
ANDROID_DIR="$PROJECT_ROOT/android"
SDK_DIR="$HOME/Library/Android/sdk"
GRADLE_DIR="/tmp/gradle-home/gradle-8.14.3"

echo "======================================"
echo "  OpenMAIC Android APK 打包脚本"
echo "======================================"

# 1. 检测 JDK 21
echo "[1/5] 检测 JDK 21..."
JAVA_21_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null || true)
if [ -z "$JAVA_21_HOME" ]; then
    echo "  ❌ 未找到 JDK 21，请先运行: brew install openjdk@21"
    exit 1
fi
echo "  ✅ JDK 21: $JAVA_21_HOME"

# 2. 检测 Android SDK
echo "[2/5] 检测 Android SDK..."
if [ ! -d "$SDK_DIR" ]; then
    echo "  ❌ 未找到 Android SDK: $SDK_DIR"
    echo "  请先通过 Android Studio 安装 SDK"
    exit 1
fi
echo "  ✅ Android SDK: $SDK_DIR"

# 3. 检测 Gradle
echo "[3/5] 检测 Gradle..."
if [ ! -f "$GRADLE_DIR/bin/gradle" ]; then
    echo "  ⚠️  未找到 Gradle，正在下载..."
    mkdir -p /tmp/gradle-home
    cd /tmp/gradle-home
    curl -L -o gradle.zip "https://services.gradle.org/distributions/gradle-8.14.3-bin.zip"
    unzip -o gradle.zip
    rm gradle.zip
fi
echo "  ✅ Gradle: $GRADLE_DIR"

# 4. 确保 Capacitor 同步
echo "[4/5] Capacitor 同步..."
cd "$PROJECT_ROOT"
npx cap sync android 2>&1 | tail -5

# 5. 打包 APK
echo "[5/5] 开始打包 APK..."
cd "$ANDROID_DIR"
export JAVA_HOME="$JAVA_21_HOME"
export ANDROID_HOME="$SDK_DIR"
export PATH="$GRADLE_DIR/bin:$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

gradle assembleDebug --no-daemon 2>&1

# 结果
APK_PATH="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    echo ""
    echo "======================================"
    echo "  ✅ 打包成功！"
    echo "  APK: $APK_PATH"
    echo "  大小: $(du -h "$APK_PATH" | cut -f1)"
    echo "======================================"
else
    echo "  ❌ 打包失败，未找到 APK 文件"
    exit 1
fi
