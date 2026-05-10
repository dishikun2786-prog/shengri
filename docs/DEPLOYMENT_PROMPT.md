# ShengRi (生辰) 一键部署指令

将此提示词发送给 AI 助手，在当前服务器上完成 ShengRi 八字命理 SaaS 平台的完整部署。

---

## 部署任务

你需要在当前服务器上部署 ShengRi (生辰) 平台，这是一个专业级八字命理 SaaS 系统。

### 项目信息
- 仓库地址: https://github.com/dishikun2786-prog/shengri.git
- 技术栈: NestJS 10 (API) + Next.js 14 (Web) + FastAPI (Python 历法引擎) + React-Admin 5 (管理后台)
- 数据库: PostgreSQL 16 + Redis 7 + Qdrant (向量数据库)
- 包管理器: pnpm 8+
- 运行要求: Node.js >= 18, Python 3.11+

### 架构概览
```
Nginx (:80/443) → NestJS API (:3000) ← Python Calendar Engine (:8100)
                 → Next.js Web (:3001)
                 → Vite Admin (:3002)
PostgreSQL (:5432) | Redis (:6379) | Qdrant (:6333) | Ollama (:11434)
```

---

## 第一步：环境准备，检查当前环境是否存在已经安装，如果安装请跳过；

### 1.1 安装系统依赖
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y curl git gnupg ca-certificates

# CentOS/Rocky
sudo dnf install -y curl git
```

### 1.2 安装 Node.js 20 + pnpm
```bash
# 使用 nvm 安装 Node.js 20
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 安装 pnpm
npm install -g pnpm@latest
```

### 1.3 安装 PostgreSQL 16
```bash
# Ubuntu/Debian
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
sudo apt update && sudo apt install -y postgresql-16

# 启动并设置密码
sudo systemctl enable postgresql && sudo systemctl start postgresql
sudo -u postgres psql -c "ALTER USER postgres PASSWORD '你的数据库密码';"
sudo -u postgres psql -c "CREATE DATABASE shengri;"
```

### 1.4 安装 Redis 7
```bash
# Ubuntu/Debian
sudo apt install -y redis-server
sudo systemctl enable redis-server && sudo systemctl start redis-server

# 或用 Docker
# docker run -d --name redis -p 6379:6379 --restart always redis:7-alpine redis-server --appendonly yes
```

### 1.5 安装 Python 3.11+ 及依赖
```bash
# Ubuntu/Debian
sudo apt install -y python3 python3-pip python3-venv

# 验证版本 >= 3.11
python3 --version
```

### 1.6 安装 Qdrant (向量数据库)
```bash
# Docker 方式 (推荐)
docker run -d --name qdrant -p 6333:6333 -p 6334:6334 \
  -v qdrant_data:/qdrant/storage \
  --restart always qdrant/qdrant:latest

# 验证
curl http://localhost:6333/healthz
```

### 1.7 安装 Ollama (嵌入模型，可选)
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull nomic-embed-text  # 768维嵌入模型
```

---

## 第二步：克隆项目并安装依赖

```bash
# 克隆仓库
git clone https://github.com/dishikun2786-prog/shengri.git /opt/shengri
cd /opt/shengri

# 安装 Node.js 依赖
pnpm install

# 安装 Python 历法引擎依赖
pip3 install -r apps/calendar-engine/requirements.txt
```

---

## 第三步：配置环境变量

### 3.1 创建 API 环境变量
```bash
cp apps/api/.env.example apps/api/.env
```

编辑 `apps/api/.env`，填入以下配置：

```env
# === 数据库 ===
DATABASE_URL=postgresql://postgres:你的数据库密码@localhost:5432/shengri?schema=public

# === Redis ===
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# === JWT ===
JWT_SECRET=生成一个随机字符串至少32位
JWT_EXPIRES_IN=7d

# === Calendar Engine ===
CALENDAR_ENGINE_URL=http://localhost:8100

# === AI Provider (至少配置一个) ===
DEFAULT_AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的DeepSeek_API_Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash

# 备选 Provider
# MINIMAX_API_KEY=你的MiniMax_API_Key
# OPENAI_API_KEY=你的OpenAI_API_Key

# === Qdrant (Mem0 记忆系统) ===
QDRANT_URL=http://localhost:6333
MEM0_LLM_PROVIDER=openai
MEM0_LLM_MODEL=deepseek-v4-flash
MEM0_EMBEDDING_PROVIDER=ollama
MEM0_EMBEDDING_MODEL=nomic-embed-text
MEM0_EMBEDDING_BASE_URL=http://localhost:11434
MEM0_EMBEDDING_DIMS=768

# === CORS ===
CORS_ORIGIN=http://localhost:3001,http://localhost:3002

# === 可选: 微信支付 ===
# WECHAT_APP_ID=
# WECHAT_MCH_ID=
# WECHAT_API_KEY=

# === 可选: 阿里云短信 ===
# ALIBABA_CLOUD_ACCESS_KEY_ID=你的阿里云AccessKey_ID
# ALIBABA_CLOUD_ACCESS_KEY_SECRET=你的阿里云AccessKey_Secret
# SMS_SIGN_NAME=你的短信签名
# SMS_TEMPLATE_CODE=你的短信模板CODE

# === App ===
PORT=3000
NODE_ENV=production
```

### 3.2 创建 Web 环境变量
```bash
# 创建 apps/web/.env.local
cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
EOF
```

---

## 第四步：初始化数据库

```bash
cd /opt/shengri/apps/api

# 同步 Prisma Schema 到数据库
npx prisma db push

# 可选: 导入种子数据（产品、规则、Prompt 模板）
npx prisma db seed

cd /opt/shengri
```

### 数据库备份恢复 (如果有备份文件)
```bash
# 使用仓库中的备份文件恢复
psql -U postgres -h localhost -d shengri -f db/backups/shengri-*.sql
```

---

## 第五步：启动所有服务

### 方案A：直接启动 (开发/测试)

在 4 个终端中分别运行：

```bash
# 终端 1: Python 历法引擎 (:8100)
cd /opt/shengri/apps/calendar-engine
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8100

# 终端 2: NestJS API (:3000)
cd /opt/shengri/apps/api
npx nest start

# 终端 3: Next.js Web (:3001)
cd /opt/shengri/apps/web
npx next start -p 3001

# 终端 4: Vite Admin (:3002)
cd /opt/shengri/apps/admin
npx vite preview --port 3002 --host 0.0.0.0
```

### 方案B：PM2 进程管理 (生产推荐)

```bash
# 安装 PM2
npm install -g pm2

# 创建 ecosystem.config.js
cat > /opt/shengri/ecosystem.config.js << 'ECONFIG'
module.exports = {
  apps: [
    {
      name: 'shengri-calendar',
      cwd: '/opt/shengri/apps/calendar-engine',
      script: 'python3',
      args: '-m uvicorn app.main:app --host 0.0.0.0 --port 8100',
      env: { APP_ENV: 'production' },
    },
    {
      name: 'shengri-api',
      cwd: '/opt/shengri/apps/api',
      script: 'node',
      args: 'dist/main.js',
      env: { NODE_ENV: 'production', PORT: '3000' },
    },
    {
      name: 'shengri-web',
      cwd: '/opt/shengri/apps/web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'shengri-admin',
      cwd: '/opt/shengri/apps/admin',
      script: 'node_modules/.bin/vite',
      args: 'preview --port 3002 --host 0.0.0.0',
    },
  ],
};
ECONFIG

# 构建 API (NestJS 需要编译)
cd /opt/shengri/apps/api && npx nest build && cd /opt/shengri

# 构建 Web
cd /opt/shengri/apps/web && npx next build && cd /opt/shengri

# 构建 Admin
cd /opt/shengri/apps/admin && npx vite build && cd /opt/shengri

# 启动所有服务
pm2 start /opt/shengri/ecosystem.config.js

# 设置开机自启
pm2 save && pm2 startup
```

### 方案C：Docker Compose 部署

```bash
cd /opt/shengri

# 配置环境变量
cp apps/api/.env.example apps/api/.env
# 编辑 apps/api/.env 填入生产配置

# 构建并启动所有 7 个服务
docker-compose up -d --build

# 查看日志
docker-compose logs -f
```

### 方案D：Kubernetes 部署

```bash
# 创建命名空间
kubectl apply -f k8s/namespace.yaml

# 创建 Secrets
kubectl create secret generic shengri-secrets -n shengri \
  --from-literal=database-url='postgresql://postgres:密码@postgres-host:5432/shengri' \
  --from-literal=jwt-secret='你的JWT密钥' \
  --from-literal=deepseek-api-key='你的DeepSeek_API_Key' \
  --from-literal=minimax-api-key='你的MiniMax_API_Key' \
  --from-literal=openai-api-key='你的OpenAI_API_Key'

# 部署各服务
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/web-deployment.yaml
kubectl apply -f k8s/calendar-deployment.yaml
kubectl apply -f k8s/ingress.yaml

# 检查状态
kubectl get pods -n shengri
```

---

## 第六步：配置 Nginx 反向代理 (可选)

```bash
sudo apt install -y nginx

# 复制项目中的 nginx 配置
sudo cp /opt/shengri/nginx/nginx.conf /etc/nginx/sites-available/shengri

# 或创建生产级配置:
sudo cat > /etc/nginx/sites-available/shengri << 'NGINX'
server {
    listen 80;
    server_name 你的域名.com;

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 600s;  # AI 报告生成可能较长
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Calendar Engine
    location /calendar/ {
        proxy_pass http://127.0.0.1:8100/;
    }

    # Web 前端
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
    }

    # Admin 后台
    location /admin/ {
        proxy_pass http://127.0.0.1:3002/;
    }

    # 上传文件
    location /uploads/ {
        alias /opt/shengri/apps/api/public/uploads/;
    }
}
NGINX

sudo ln -s /etc/nginx/sites-available/shengri /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 第七步：验证部署

```bash
# 1. 检查各服务端口
curl http://localhost:8100/health    # Calendar Engine → {"status":"ok"}
curl http://localhost:3000/api/docs  # API Swagger 文档
curl http://localhost:3001           # Web 首页
curl http://localhost:3002           # Admin 后台

# 2. 测试排盘 API
curl -X POST http://localhost:3000/api/v1/bazi/chart \
  -H "Content-Type: application/json" \
  -d '{
    "solarDate": "1992-04-11",
    "solarTime": "07:00",
    "gender": 1,
    "birthCity": "北京"
  }'

# 3. PM2 状态检查 (如果使用 PM2)
pm2 status

# 4. Docker 状态检查 (如果使用 Docker)
docker-compose ps
```

---

## 关键注意事项

1. **AI Provider**: 至少配置一个 AI 服务商 (DeepSeek/MiniMax/OpenAI)，否则报告生成不可用
2. **服务器超时**: API 已配置 10 分钟超时 (`setTimeout(600000)`)，Nginx 也需要匹配 `proxy_read_timeout 600s`
3. **PostgreSQL**: 确保数据库字符集为 UTF-8 (`CREATE DATABASE shengri ENCODING 'UTF8'`)
4. **Python sxtwl**: 历法引擎依赖 `sxtwl` C++ 扩展，若编译失败可尝试 `apt install -y build-essential python3-dev`
5. **防火墙**: 生产环境建议仅开放 80/443 端口通过 Nginx 访问，3000-3002/8100/5432/6379/6333 仅内网访问
6. **HTTPS**: 使用 Let's Encrypt + certbot 配置 SSL 证书
7. **Qdrant**: 若不需要 Mem0 记忆功能，可跳过 Qdrant 和 Ollama 安装

---

## 服务端口总览

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5432 | 关系型数据库 |
| Redis | 6379 | 缓存/队列 |
| Qdrant | 6333 | 向量数据库 |
| Ollama | 11434 | 本地嵌入模型 |
| Calendar Engine | 8100 | Python 历法引擎 |
| NestJS API | 3000 | 后端 API (Swagger: /api/docs) |
| Next.js Web | 3001 | 用户前端 |
| Vite Admin | 3002 | 管理后台 |
| Nginx | 80/443 | 反向代理 |
