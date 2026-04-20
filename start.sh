#!/bin/bash
# ===========================================
# SoloForce 启动脚本（稳定版）
# ===========================================

set -e  # 任何命令失败立即退出
cd "$(dirname "$0")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

LOG_FILE="/tmp/soloforce-$(date +%Y%m%d-%H%M%S).log"

log() { echo -e "$1"; }
log_ok()  { log "${GREEN}✅ $1${NC}"; }
log_warn(){ log "${YELLOW}⚠️  $1${NC}"; }
log_fail(){ log "${RED}❌ $1${NC}"; }
log_info(){ log "${CYAN}ℹ️  $1${NC}"; }

# ===========================================
# 清理函数
# ===========================================
cleanup() {
  log ""
  log_warn "收到停止信号，正在关闭服务..."
  # 杀死整个进程组（防止子进程孤儿）
  [ -n "$SERVER_PID" ] && kill -TERM -- -$(ps -o pgid= -p $SERVER_PID 2>/dev/null | grep -v PGID) 2>/dev/null || true
  [ -n "$DEV_PID" ]    && kill -TERM $DEV_PID 2>/dev/null || true
  log_ok "服务已停止"
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# ===========================================
# 检查端口是否可用
# ===========================================
check_port() {
  local port=$1
  local name=$2
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    log_fail "$name 端口 $port 已被占用！"
    log_warn "请先关闭占用该端口的进程："
    log "   lsof -ti:$port | xargs kill -9"
    lsof -Pi :$port -sTCP:LISTEN 2>/dev/null | grep -v "^COMMAND" | head -5
    exit 1
  fi
  log_ok "$name 端口 $port 可用"
}

# ===========================================
# 等待端口真正就绪
# ===========================================
wait_for_port() {
  local port=$1
  local name=$2
  local max_wait=15
  local waited=0
  while ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; do
    sleep 1
    ((waited++))
    if [ $waited -ge $max_wait ]; then
      log_fail "$name 端口 $port 启动超时（等待 ${max_wait}s）"
      log_warn "请检查后台日志：cat $LOG_FILE"
      exit 1
    fi
  done
  log_ok "$name 已就绪（耗时 ${waited}s）"
}

# ===========================================
# 启动函数
# ===========================================
start_server() {
  log ""
  log_info "🚀 启动后端服务 (端口 5301)..."

  # 检查依赖
  if [ ! -d "node_modules" ]; then
    log_info "📦 首次安装依赖..."
    npm install 2>&1 | tail -5
  fi

  # 检查 .env
  if [ ! -f ".env" ]; then
    log_warn ".env 文件不存在，复制 .env.example 为 .env"
    cp .env.example .env 2>/dev/null || true
    log_warn "请编辑 .env 文件配置 API Key"
  fi

  # 加载 .env 文件中的环境变量
  set -a
  source .env
  set +a

  # 启动后端（重定向所有输出到日志文件）
  npm run server >> "$LOG_FILE" 2>&1 &
  SERVER_PID=$!

  log_info "后端 PID: $SERVER_PID"
  log_info "日志文件: $LOG_FILE"
}

start_dev() {
  log ""
  log_info "🎨 启动前端服务 (端口 5300)..."
  npm run dev > "$LOG_FILE" 2>&1 &
  DEV_PID=$!
  log_info "前端 PID: $DEV_PID"
}

# ===========================================
# 主流程
# ===========================================
echo ""
echo "=========================================="
echo "     🏢 SoloForce 启动脚本 v2.0"
echo "=========================================="
echo ""

# 1. 检查端口
check_port 5301 "后端"
check_port 5300 "前端"

# 2. 启动后端
start_server

# 3. 等待后端就绪
wait_for_port 5301 "后端"

# 4. 启动前端
start_dev

# 5. 等待前端就绪
wait_for_port 5300 "前端"

# 6. 完成
echo ""
echo "=========================================="
log_ok "SoloForce 启动成功！"
echo "=========================================="
echo "   前端: http://localhost:5300"
echo "   后端: http://localhost:5301"
echo "   日志: $LOG_FILE"
echo ""
echo "按 Ctrl+C 停止服务"
echo "=========================================="

# 7. 监控进程状态（定期检查）
monitor_pids() {
  while true; do
    sleep 5
    # 检查后端
    if [ -n "$SERVER_PID" ] && ! kill -0 $SERVER_PID 2>/dev/null; then
      log_fail "⚠️  后端进程意外退出！"
      log_warn "最后 10 行日志："
      tail -10 "$LOG_FILE" 2>/dev/null
      break
    fi
    # 检查前端
    if [ -n "$DEV_PID" ] && ! kill -0 $DEV_PID 2>/dev/null; then
      log_fail "⚠️  前端进程意外退出！"
      break
    fi
  done
}

# 后台监控
monitor_pids &
MONITOR_PID=$!

# 8. 保持脚本运行（等待任意一个进程退出）
wait $SERVER_PID $DEV_PID 2>/dev/null
