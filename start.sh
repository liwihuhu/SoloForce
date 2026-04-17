#!/bin/bash
# ===========================================
# SoloForce 启动脚本
# ===========================================

cd "$(dirname "$0")"

echo "🏢 启动 SoloForce 服务..."
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 首次安装依赖..."
    npm install
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env 文件不存在，复制 .env.example 为 .env"
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件配置 API Key"
fi

# 启动后端服务
echo "🚀 启动后端服务 (端口 5301)..."
npm run server &
SERVER_PID=$!

# 等待后端启动
sleep 2

# 启动前端服务
echo "🎨 启动前端服务 (端口 5300)..."
npm run dev &
DEV_PID=$!

echo ""
echo "✅ SoloForce 已启动!"
echo "   前端: http://localhost:5300"
echo "   后端: http://localhost:5301"
echo ""
echo "按 Ctrl+C 停止服务，或运行 ./stop.sh"
echo ""

# 捕获退出信号
trap "kill $SERVER_PID $DEV_PID 2>/dev/null; echo '🛑 服务已停止'; exit 0" SIGINT SIGTERM

# 保持脚本运行
wait
