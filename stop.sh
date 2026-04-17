#!/bin/bash
# ===========================================
# SoloForce 停止脚本
# ===========================================

cd "$(dirname "$0")"

echo "🛑 停止 SoloForce 服务..."

# 查找并关闭占用 5300 和 5301 端口的进程
for PORT in 5300 5301; do
    PID=$(lsof -ti:$PORT 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "   关闭端口 $PORT (PID: $PID)..."
        kill -TERM $PID 2>/dev/null
        sleep 1
        # 如果还没关闭，强制终止
        if kill -0 $PID 2>/dev/null; then
            kill -9 $PID 2>/dev/null
        fi
    else
        echo "   端口 $PORT 未被占用"
    fi
done

# 也关闭 npm 进程
pkill -f "vite.*5300" 2>/dev/null
pkill -f "tsx.*server.ts" 2>/dev/null

echo ""
echo "✅ SoloForce 已停止"
