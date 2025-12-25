***REMOVED***!/bin/sh

***REMOVED*** ============================================================
***REMOVED*** Kerkerker 一键部署脚本
***REMOVED*** ============================================================
***REMOVED*** 支持系统: Ubuntu, Debian, CentOS, RHEL, Alpine, macOS, Arch Linux
***REMOVED*** 使用方法:
***REMOVED***   curl -fsSL https://raw.githubusercontent.com/unilei/kerkerker/master/scripts/install.sh | sh
***REMOVED***   或
***REMOVED***   wget -qO- https://raw.githubusercontent.com/unilei/kerkerker/master/scripts/install.sh | sh
***REMOVED*** ============================================================

set -e

***REMOVED*** ==================== 系统检测 ====================
detect_os() {
    OS=""
    ARCH=""
    PKG_MANAGER=""
    
    ***REMOVED*** 检测架构
    case "$(uname -m)" in
        x86_64|amd64) ARCH="amd64" ;;
        aarch64|arm64) ARCH="arm64" ;;
        armv7l) ARCH="armv7" ;;
        *) ARCH="unknown" ;;
    esac
    
    ***REMOVED*** 检测操作系统
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS="$ID"
        OS_VERSION="$VERSION_ID"
    elif [ -f /etc/redhat-release ]; then
        OS="rhel"
    elif [ "$(uname)" = "Darwin" ]; then
        OS="macos"
    else
        OS="unknown"
    fi
    
    ***REMOVED*** 检测包管理器
    case "$OS" in
        ubuntu|debian|linuxmint|pop) PKG_MANAGER="apt" ;;
        centos|rhel|fedora|rocky|almalinux) PKG_MANAGER="yum" ;;
        alpine) PKG_MANAGER="apk" ;;
        arch|manjaro) PKG_MANAGER="pacman" ;;
        macos) PKG_MANAGER="brew" ;;
        *) PKG_MANAGER="unknown" ;;
    esac
}

***REMOVED*** 初始化系统检测
detect_os

***REMOVED*** ==================== 颜色定义 ====================
***REMOVED*** 检测终端是否支持颜色
if [ -t 1 ] && command -v tput >/dev/null 2>&1 && [ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    BOLD='\033[1m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    CYAN=''
    BOLD=''
    NC=''
fi

***REMOVED*** ==================== 配置 ====================
DOCKER_IMAGE="unilei/kerkerker"
DEFAULT_VERSION="latest"
DEFAULT_PORT="3000"
INSTALL_DIR="${KERKERKER_INSTALL_DIR:-$HOME/kerkerker}"

***REMOVED*** ==================== 工具函数 ====================
***REMOVED*** POSIX 兼容的 printf 输出
print_color() {
    printf '%b' "$1"
}

print_banner() {
    print_color "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    print_color "║   ${BOLD}🎬 Kerkerker 一键部署脚本${NC}${CYAN}                              ║\n"
    echo "║                                                           ║"
    echo "║   短剧/影视管理平台                                       ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    print_color "${NC}\n"
    ***REMOVED*** 显示系统信息
    print_color "${CYAN}   系统: ${OS} (${ARCH})${NC}\n"
    echo ""
}

print_step() {
    printf '\n%b==>%b %b%s%b\n' "${BLUE}" "${NC}" "${BOLD}" "$1" "${NC}"
}

print_info() {
    printf '%bℹ%b  %s\n' "${BLUE}" "${NC}" "$1"
}

print_success() {
    printf '%b✔%b  %s\n' "${GREEN}" "${NC}" "$1"
}

print_warning() {
    printf '%b⚠%b  %s\n' "${YELLOW}" "${NC}" "$1"
}

print_error() {
    printf '%b✖%b  %s\n' "${RED}" "${NC}" "$1"
}

***REMOVED*** 读取用户输入（支持默认值和密码模式）
***REMOVED*** 注意：从 /dev/tty 读取，以支持 curl | sh 方式运行
read_input() {
    _prompt="$1"
    _default="$2"
    _is_password="$3"
    _value=""
    
    if [ -n "$_default" ]; then
        _prompt="${_prompt} [${_default}]"
    fi
    
    ***REMOVED*** 输出提示到 /dev/tty（确保在终端显示，即使通过管道运行）
    if [ -e /dev/tty ]; then
        if [ "$_is_password" = "true" ]; then
            printf '%b?%b %s: ' "${CYAN}" "${NC}" "$_prompt" > /dev/tty
            stty -echo 2>/dev/null || true
            read _value < /dev/tty
            stty echo 2>/dev/null || true
            echo "" > /dev/tty
        else
            printf '%b?%b %s: ' "${CYAN}" "${NC}" "$_prompt" > /dev/tty
            read _value < /dev/tty
        fi
    else
        ***REMOVED*** 回退：无 /dev/tty 时使用标准输入输出
        printf '%b?%b %s: ' "${CYAN}" "${NC}" "$_prompt" >&2
        if [ "$_is_password" = "true" ]; then
            stty -echo 2>/dev/null || true
            read _value
            stty echo 2>/dev/null || true
            echo "" >&2
        else
            read _value
        fi
    fi
    
    if [ -z "$_value" ] && [ -n "$_default" ]; then
        echo "$_default"
    else
        echo "$_value"
    fi
}

***REMOVED*** 验证端口号 (POSIX 兼容)
validate_port() {
    _port="$1"
    case "$_port" in
        ''|*[!0-9]*) return 1 ;;
    esac
    [ "$_port" -ge 1 ] && [ "$_port" -le 65535 ]
}

***REMOVED*** 检查命令是否存在
command_exists() {
    command -v "$1" > /dev/null 2>&1
}

***REMOVED*** ==================== Docker 安装辅助 ====================
install_docker_hint() {
    echo ""
    print_info "根据您的系统，可以使用以下命令安装 Docker:"
    echo ""
    case "$PKG_MANAGER" in
        apt)
            echo "   ***REMOVED*** Ubuntu/Debian"
            echo "   curl -fsSL https://get.docker.com | sh"
            echo "   sudo usermod -aG docker \$USER"
            ;;
        yum)
            echo "   ***REMOVED*** CentOS/RHEL"
            echo "   curl -fsSL https://get.docker.com | sh"
            echo "   sudo systemctl enable --now docker"
            echo "   sudo usermod -aG docker \$USER"
            ;;
        apk)
            echo "   ***REMOVED*** Alpine"
            echo "   apk add docker docker-compose"
            echo "   rc-update add docker boot"
            echo "   service docker start"
            ;;
        pacman)
            echo "   ***REMOVED*** Arch Linux"
            echo "   pacman -S docker docker-compose"
            echo "   systemctl enable --now docker"
            echo "   usermod -aG docker \$USER"
            ;;
        brew)
            echo "   ***REMOVED*** macOS"
            echo "   brew install --cask docker"
            echo "   ***REMOVED*** 然后启动 Docker Desktop"
            ;;
        *)
            echo "   请访问: https://docs.docker.com/get-docker/"
            ;;
    esac
    echo ""
    print_info "安装完成后，请重新登录或执行 'newgrp docker'，然后重新运行此脚本"
}

***REMOVED*** ==================== 检查依赖 ====================
check_dependencies() {
    print_step "检查系统依赖"
    
    _has_docker=0
    _has_compose=0
    
    ***REMOVED*** 检查 Docker
    if command_exists docker; then
        print_success "Docker 已安装"
        _has_docker=1
    else
        print_error "Docker 未安装"
    fi
    
    ***REMOVED*** 检查 Docker Compose
    if command_exists docker-compose; then
        print_success "Docker Compose 已安装 (standalone)"
        COMPOSE_CMD="docker-compose"
        _has_compose=1
    elif docker compose version > /dev/null 2>&1; then
        print_success "Docker Compose 已安装 (plugin)"
        COMPOSE_CMD="docker compose"
        _has_compose=1
    else
        print_error "Docker Compose 未安装"
    fi
    
    ***REMOVED*** 检查 curl
    if ! command_exists curl; then
        print_warning "curl 未安装（健康检查将跳过）"
    else
        print_success "curl 已安装"
    fi
    
    ***REMOVED*** 如果有缺失的依赖
    if [ "$_has_docker" = "0" ] || [ "$_has_compose" = "0" ]; then
        install_docker_hint
        exit 1
    fi
    
    ***REMOVED*** 检查 Docker 是否运行
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker 未运行"
        echo ""
        case "$OS" in
            macos)
                print_info "请启动 Docker Desktop 应用"
                ;;
            *)
                print_info "请执行: sudo systemctl start docker"
                ;;
        esac
        exit 1
    fi
    print_success "Docker 运行正常"
}

***REMOVED*** ==================== 交互式配置 ====================
interactive_config() {
    print_step "配置部署参数"
    echo ""
    print_info "请根据提示输入配置信息（直接回车使用默认值）"
    echo ""
    
    ***REMOVED*** 安装目录
    INSTALL_DIR=$(read_input "安装目录" "$INSTALL_DIR")
    
    ***REMOVED*** 应用端口
    while true; do
        APP_PORT=$(read_input "应用端口" "$DEFAULT_PORT")
        if validate_port "$APP_PORT"; then
            break
        fi
        print_error "无效的端口号，请输入 1-65535 之间的数字"
    done
    
    ***REMOVED*** 镜像版本
    IMAGE_VERSION=$(read_input "镜像版本" "$DEFAULT_VERSION")
    
    echo ""
    print_info "以下为可选配置（直接回车使用默认值，部署后可在 .env 中修改）"
    echo ""
    
    ***REMOVED*** 管理员密码
    ADMIN_PASSWORD=$(read_input "管理员密码" "bukan" "true")
    
    ***REMOVED*** 确认配置
    echo ""
    print_step "配置确认"
    echo ""
    printf "   %b安装目录:%b       %s\n" "${BOLD}" "${NC}" "$INSTALL_DIR"
    printf "   %b应用端口:%b       %s\n" "${BOLD}" "${NC}" "$APP_PORT"
    printf "   %b镜像版本:%b       %s:%s\n" "${BOLD}" "${NC}" "$DOCKER_IMAGE" "$IMAGE_VERSION"
    printf "   %b管理员密码:%b     已设置\n" "${BOLD}" "${NC}"
    echo ""
    
    _confirm=$(read_input "确认以上配置并开始部署? (y/n)" "y")
    case "$_confirm" in
        [Yy]|[Yy][Ee][Ss]) ;;
        *)
            print_warning "已取消部署"
            exit 0
            ;;
    esac
}

***REMOVED*** ==================== 创建配置文件 ====================
create_config_files() {
    print_step "创建配置文件"
    
    ***REMOVED*** 创建安装目录
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    print_success "创建目录: $INSTALL_DIR"
    
    ***REMOVED*** 创建 .env 文件
    cat > .env << EOF
***REMOVED*** ============================================================
***REMOVED*** Kerkerker 环境配置
***REMOVED*** 生成时间: $(date '+%Y-%m-%d %H:%M:%S')
***REMOVED*** ============================================================
***REMOVED*** 修改配置后请执行: ./kerkerker.sh restart
***REMOVED*** ============================================================

***REMOVED*** ==================== Docker 镜像配置 ====================
DOCKER_USERNAME=unilei
IMAGE_VERSION=${IMAGE_VERSION}

***REMOVED*** ==================== 应用配置 ====================
APP_PORT=${APP_PORT}
NODE_ENV=production

***REMOVED*** ==================== 安全配置 ====================
***REMOVED*** 管理员密码（访问 /login 页面时使用）
ADMIN_PASSWORD=${ADMIN_PASSWORD}

***REMOVED*** ==================== 豆瓣 API 微服务配置 ====================
***REMOVED*** 独立的豆瓣 API 服务地址 (kerkerker-douban-service)
***REMOVED*** Docker 环境: http://host.docker.internal:8081
***REMOVED*** 本地开发: http://localhost:8081
***REMOVED*** 生产环境: https://your-douban-api.example.com
NEXT_PUBLIC_DOUBAN_API_URL=
EOF
    print_success "创建 .env 配置文件"
    
    ***REMOVED*** 创建 docker-compose.yml
    cat > docker-compose.yml << 'EOF'
***REMOVED*** Kerkerker Docker Compose 配置
***REMOVED*** 自动生成，请勿手动修改结构

services:
  ***REMOVED*** Next.js 应用
  app:
    image: ${DOCKER_USERNAME:-unilei}/kerkerker:${IMAGE_VERSION:-latest}
    container_name: kerkerker-app
    ports:
      - "${APP_PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - MONGODB_URI=mongodb://mongodb:27017/kerkerker
      - NEXT_PUBLIC_DOUBAN_API_URL=${NEXT_PUBLIC_DOUBAN_API_URL}
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - kerkerker-network
    restart: unless-stopped

  ***REMOVED*** MongoDB 数据库
  mongodb:
    image: mongo:7
    container_name: kerkerker-mongodb
    environment:
      - MONGO_INITDB_DATABASE=kerkerker
    volumes:
      - mongodb-data:/data/db
      - mongodb-config:/data/configdb
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - kerkerker-network
    restart: unless-stopped

networks:
  kerkerker-network:
    driver: bridge

volumes:
  mongodb-data:
  mongodb-config:
EOF
    print_success "创建 docker-compose.yml"
    
    ***REMOVED*** 创建管理脚本
    cat > kerkerker.sh << 'SCRIPT'
***REMOVED***!/bin/bash

***REMOVED*** Kerkerker 管理脚本
cd "$(dirname "$0")"

case "$1" in
    start)
        echo "🚀 启动服务..."
        docker compose up -d
        ;;
    stop)
        echo "🛑 停止服务..."
        docker compose down
        ;;
    restart)
        echo "🔄 重启服务..."
        docker compose restart app
        echo "✅ 重启完成"
        ;;
    logs)
        docker compose logs -f ${2:-app}
        ;;
    status)
        docker compose ps
        ;;
    update)
        echo "📥 更新镜像..."
        docker compose pull app
        echo "🔄 重启服务..."
        docker compose up -d
        echo "🧹 清理旧镜像..."
        docker image prune -f
        echo "✅ 更新完成"
        ;;
    backup)
        echo "📦 备份数据..."
        BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        docker compose exec -T mongodb mongodump --archive > "$BACKUP_DIR/mongodb.archive"
        cp .env "$BACKUP_DIR/.env"
        echo "✅ 备份完成: $BACKUP_DIR"
        ;;
    *)
        echo "Kerkerker 管理脚本"
        echo ""
        echo "用法: ./kerkerker.sh <命令>"
        echo ""
        echo "命令:"
        echo "  start    启动服务"
        echo "  stop     停止服务"
        echo "  restart  重启服务"
        echo "  logs     查看日志 (可选参数: app/mongodb)"
        echo "  status   查看状态"
        echo "  update   更新到最新版本"
        echo "  backup   备份数据"
        ;;
esac
SCRIPT
    chmod +x kerkerker.sh
    print_success "创建管理脚本 kerkerker.sh"
}

***REMOVED*** ==================== 部署服务 ====================
deploy_services() {
    print_step "部署服务"

    ***REMOVED*** 确保在安装目录中
    if [ -d "$INSTALL_DIR" ]; then
        cd "$INSTALL_DIR" || { print_error "无法进入安装目录"; exit 1; }
    fi

    ***REMOVED*** 拉取镜像
    print_info "拉取 Docker 镜像..."
    if $COMPOSE_CMD pull; then
        print_success "镜像拉取完成"
    else
        print_error "镜像拉取失败"
        exit 1
    fi

    ***REMOVED*** 启动服务
    print_info "启动服务..."
    if $COMPOSE_CMD up -d; then
        print_success "服务启动成功"
    else
        print_error "服务启动失败"
        exit 1
    fi

    ***REMOVED*** 等待服务就绪
    print_info "等待服务就绪..."
    sleep 15

    ***REMOVED*** 健康检查
    if command_exists curl; then
        print_info "执行健康检查..."
        _retries=10
        _success=0
        _i=1

        while [ "$_i" -le "$_retries" ]; do
            if curl -sf "http://localhost:${APP_PORT}/api/health" > /dev/null 2>&1; then
                _success=1
                break
            fi
            printf "."
            sleep 3
            _i=$((_i + 1))
        done
        echo ""

        if [ "$_success" = "1" ]; then
            print_success "健康检查通过"
        else
            print_warning "健康检查超时，服务可能仍在启动中"
        fi
    fi
}

***REMOVED*** ==================== 显示完成信息 ====================
show_completion() {
    echo ""
    print_color "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}\n"
    print_color "${GREEN}║                                                           ║${NC}\n"
    print_color "${GREEN}║   ${BOLD}✅ 部署完成!${NC}${GREEN}                                          ║${NC}\n"
    print_color "${GREEN}║                                                           ║${NC}\n"
    print_color "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}\n"
    echo ""
    printf "%b📍 安装目录:%b %s\n" "${BOLD}" "${NC}" "$INSTALL_DIR"
    echo ""
    printf "%b🌐 访问地址:%b\n" "${BOLD}" "${NC}"
    echo "   应用首页:   http://localhost:${APP_PORT}"
    echo "   后台管理:   http://localhost:${APP_PORT}/login"
    echo ""
    printf "%b📝 常用命令:%b\n" "${BOLD}" "${NC}"
    echo "   cd $INSTALL_DIR"
    echo "   ./kerkerker.sh start    ***REMOVED*** 启动服务"
    echo "   ./kerkerker.sh stop     ***REMOVED*** 停止服务"
    echo "   ./kerkerker.sh logs     ***REMOVED*** 查看日志"
    echo "   ./kerkerker.sh update   ***REMOVED*** 更新版本"
    echo "   ./kerkerker.sh status   ***REMOVED*** 查看状态"
    echo "   ./kerkerker.sh backup   ***REMOVED*** 备份数据"
    echo ""
    printf "%b⚙️  修改配置:%b\n" "${BOLD}" "${NC}"
    printf "   配置文件位置: %b%s/.env%b\n" "${CYAN}" "$INSTALL_DIR" "${NC}"
    echo ""
    echo "   可修改的配置项:"
    echo "   - ADMIN_PASSWORD              管理员密码"
    echo "   - NEXT_PUBLIC_DOUBAN_API_URL  豆瓣 API 微服务地址"
    echo "   - APP_PORT                    应用端口"
    echo ""
    printf "   修改后执行: %b./kerkerker.sh restart%b\n" "${CYAN}" "${NC}"
    echo ""
    
    ***REMOVED*** 显示服务状态
    printf "%b📊 当前状态:%b\n" "${BOLD}" "${NC}"
    cd "$INSTALL_DIR"
    $COMPOSE_CMD ps
    echo ""
    
    ***REMOVED*** 显示教程链接
    printf "%b📖 更多教程:%b\n" "${BOLD}" "${NC}"
    echo "   项目文档: https://github.com/unilei/kerkerker"
    echo ""
}

***REMOVED*** ==================== 主程序 ====================
main() {
    print_banner
    check_dependencies
    interactive_config
    create_config_files
    deploy_services
    show_completion
}

***REMOVED*** 运行主程序
main
