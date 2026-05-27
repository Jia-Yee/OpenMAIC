#!/bin/bash

# OpenMAIC 启动脚本
set -e

echo "=========================================="
echo "  OpenMAIC 启动脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Node.js 版本
echo -e "${YELLOW}📦 检查 Node.js 版本...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js 版本过低，需要 >= 20${NC}"
    echo "当前版本: $(node --version)"
    exit 1
fi
echo -e "${GREEN}✅ Node.js 版本: $(node --version)${NC}"
echo ""

# 检查 pnpm
echo -e "${YELLOW}📦 检查 pnpm...${NC}"
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm 未安装${NC}"
    echo "请运行: npm install -g pnpm"
    exit 1
fi
echo -e "${GREEN}✅ pnpm 已安装: $(pnpm --version)${NC}"
echo ""

# 检查 .env.local 文件
echo -e "${YELLOW}🔧 检查配置文件...${NC}"
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local 不存在，从 .env.example 复制...${NC}"
    cp .env.example .env.local
    echo -e "${YELLOW}⚠️  请编辑 .env.local 并配置至少一个 LLM API Key${NC}"
    echo ""
    echo "支持的提供商："
    echo "  - OPENAI_API_KEY"
    echo "  - ANTHROPIC_API_KEY"
    echo "  - GOOGLE_API_KEY"
    echo "  - MINIMAX_API_KEY"
    echo "  - DEEPSEEK_API_KEY"
    echo ""
    read -p "按回车键继续，或 Ctrl+C 退出配置..." 
fi
echo -e "${GREEN}✅ 配置文件就绪${NC}"
echo ""

# 询问是否安装依赖
echo -e "${YELLOW}📦 是否需要安装/更新依赖？${NC}"
read -p "(y/n，默认 y): " install_choice
install_choice=${install_choice:-y}

if [ "$install_choice" = "y" ] || [ "$install_choice" = "Y" ]; then
    echo -e "${YELLOW}📦 安装依赖...${NC}"
    pnpm install
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
    echo ""
fi

# 选择启动模式
echo -e "${YELLOW}🚀 选择启动模式:${NC}"
echo "   1) 开发模式 (pnpm dev) - 支持热重载"
echo "   2) 生产模式 (pnpm build && pnpm start)"
echo "   3) 仅构建 (pnpm build)"
read -p "请选择 (1-3，默认 1): " mode_choice
mode_choice=${mode_choice:-1}

case $mode_choice in
    1)
        echo ""
        echo "=========================================="
        echo -e "${GREEN}🚀 启动开发服务器...${NC}"
        echo "=========================================="
        echo ""
        echo "访问地址: http://localhost:3000"
        echo ""
        echo "按 Ctrl+C 停止服务器"
        echo ""
        pnpm dev
        ;;
    2)
        echo ""
        echo "=========================================="
        echo -e "${GREEN}🔨 构建生产版本...${NC}"
        echo "=========================================="
        echo ""
        pnpm build
        echo ""
        echo "=========================================="
        echo -e "${GREEN}🚀 启动生产服务器...${NC}"
        echo "=========================================="
        echo ""
        echo "访问地址: http://localhost:3000"
        echo ""
        echo "按 Ctrl+C 停止服务器"
        echo ""
        pnpm start
        ;;
    3)
        echo ""
        echo "=========================================="
        echo -e "${GREEN}🔨 构建生产版本...${NC}"
        echo "=========================================="
        echo ""
        pnpm build
        echo ""
        echo -e "${GREEN}✅ 构建完成！${NC}"
        echo "运行 'pnpm start' 启动生产服务器"
        ;;
    *)
        echo -e "${RED}❌ 无效选择${NC}"
        exit 1
        ;;
esac
