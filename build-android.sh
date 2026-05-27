#!/bin/bash

# OpenMAIC Android 应用构建脚本
set -e

echo "=========================================="
echo "  OpenMAIC Android 应用构建工具"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="/home/ubuntu/learning-by-doing/OpenMAIC"
cd "$PROJECT_DIR"

# 步骤 1: 检查环境
echo -e "${BLUE}步骤 1: 检查开发环境${NC}"
echo "----------------------------------------"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 未找到 Node.js，请先安装 Node.js >= 20${NC}"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ 未找到 pnpm，请先安装 pnpm${NC}"
    echo "   安装命令: npm install -g pnpm"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ 未找到 npx${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
echo -e "${GREEN}✅ pnpm: $(pnpm --version)${NC}"
echo ""

# 步骤 2: 安装依赖
echo -e "${BLUE}步骤 2: 检查并安装依赖${NC}"
echo "----------------------------------------"

if [ ! -d "node_modules/@capacitor" ]; then
    echo -e "${YELLOW}⚠️  Capacitor 依赖未安装，正在安装...${NC}"
    pnpm add @capacitor/core @capacitor/cli @capacitor/android \
        @capacitor-community/text-to-speech \
        @capacitor/filesystem \
        @capacitor/status-bar \
        @capacitor/splash-screen
else
    echo -e "${GREEN}✅ Capacitor 依赖已安装${NC}"
fi
echo ""

# 步骤 3: 构建 Next.js 应用
echo -e "${BLUE}步骤 3: 构建 Next.js 应用（静态导出）${NC}"
echo "----------------------------------------"

export MOBILE_BUILD=true
echo "正在构建移动端版本..."

if pnpm build; then
    echo -e "${GREEN}✅ 构建成功${NC}"
else
    echo -e "${RED}❌ 构建失败${NC}"
    exit 1
fi
echo ""

# 步骤 4: 初始化 Capacitor（如果尚未初始化）
echo -e "${BLUE}步骤 4: 配置 Capacitor${NC}"
echo "----------------------------------------"

if [ ! -f "capacitor.config.ts" ]; then
    echo -e "${YELLOW}⚠️  初始化 Capacitor 配置...${NC}"
    npx cap init OpenMAICPlayer com.openmaic.player --web-dir=out
else
    echo -e "${GREEN}✅ Capacitor 配置已存在${NC}"
fi
echo ""

# 步骤 5: 添加 Android 平台
echo -e "${BLUE}步骤 5: 添加 Android 平台${NC}"
echo "----------------------------------------"

if [ ! -d "android" ]; then
    echo -e "${YELLOW}⚠️  添加 Android 平台...${NC}"
    npx cap add android
else
    echo -e "${GREEN}✅ Android 平台已存在${NC}"
fi
echo ""

# 步骤 6: 同步到 Android
echo -e "${BLUE}步骤 6: 同步 Web 内容到 Android 平台${NC}"
echo "----------------------------------------"

npx cap sync
echo -e "${GREEN}✅ 同步完成${NC}"
echo ""

# 步骤 7: 打开 Android Studio
echo -e "${BLUE}步骤 7: 准备在 Android Studio 中运行${NC}"
echo "----------------------------------------"

echo -e "${GREEN}✅ 所有准备工作已完成！${NC}"
echo ""
echo "接下来请执行以下步骤："
echo "1. 确保已安装 Android Studio"
echo "2. 运行以下命令打开 Android Studio："
echo ""
echo -e "${YELLOW}   npx cap open android${NC}"
echo ""
echo "3. 在 Android Studio 中："
echo "   - 连接 Android 设备或启动模拟器"
echo "   - 点击 Run 按钮运行应用"
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 构建完成！${NC}"
echo "=========================================="
