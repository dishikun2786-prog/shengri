# 运行拓扑、端口与环境变量

## 本地开发推荐启动顺序

1. **基础设施**（任选 Docker 或本机安装）：PostgreSQL、Redis；若使用聊天记忆与 Mem0，再启 **Qdrant**。
2. **历法引擎**：`pnpm dev:calendar` 或 `cd apps/calendar-engine && python -m uvicorn app.main:app --reload --port 8100`
3. **API**：`pnpm dev:api`（需 `DATABASE_URL` 与 `CALENDAR_ENGINE_URL` 指向可达）
4. **Prisma**：首次 `pnpm db:migrate`，可选 `pnpm db:seed`
5. **前端**：`pnpm dev:web`（3001）、`pnpm dev:admin`（3002，Vite 代理 `/api` → 3000）

根目录脚本见 [package.json](../package.json)。

**Next.js 与 API 代理（本地）**：

- 浏览器请求相对路径 `/api/v1/*` 时，由 [apps/web/next.config.js](../apps/web/next.config.js) 的 **beforeFiles** 转发到 `http://127.0.0.1:3000/api/...`（可设置 **`API_PROXY_TARGET`** 改后端地址/端口）。
- 若设置 **`NEXT_PUBLIC_API_URL`**（如 `http://localhost:3000/api/v1`），axios 会直连该基址，不再走上述 rewrite；需自行处理 CORS 及与 Nest 端口一致。
- 流月/流日依赖 **calendar-engine:8100** 与 `CALENDAR_ENGINE_URL`；仅起 Web + Nest 时，流月/流日可能为空。

---

## 进程与端口（默认）

| 服务 | 端口 | 说明 |
|------|------|------|
| Nest API | 3000 | `PORT`，HTTP + Socket.IO |
| Next.js Web（dev） | 3001 | `package.json` 中 `next dev --port 3001` |
| Admin（Vite） | 3002 | [apps/admin/vite.config.ts](../apps/admin/vite.config.ts) |
| PostgreSQL | 5432 | |
| Redis | 6379 | |
| Python calendar-engine | 8100 | `/health`、`/api/v1/bazi/*` |
| Qdrant | 6333（HTTP API）、6334 | Mem0 向量库 |

---

## Docker Compose 服务（`docker-compose.yml`）

| 服务 | 说明 |
|------|------|
| `postgres` | 数据库，默认库名 `shengri` |
| `redis` | 持久化 AOF |
| `calendar-engine` | 与本地脚本等价，8100 |
| `api` | 注入 `DATABASE_URL`、`REDIS_*`、`JWT_SECRET`、`CALENDAR_ENGINE_URL`、多 AI/微信等变量（见下表节录） |
| `web` | `NEXT_PUBLIC_API_URL=http://api:3000/api/v1`（**容器内**调用 API 主机名 `api`） |
| `nginx` | 80/443 反向代理 |
| `qdrant` | 6333/6334，供 Mem0 使用 |

> **注意**：Compose 中 `api` 的 `depends_on` **未声明** `qdrant`；若生产必须 Mem0，应保证 Qdrant 已启动且 `QDRANT_URL` 对 API 容器可达，并在 compose 中增加依赖或健康检查。

---

## 环境变量表（`apps/api`）

来源：[apps/api/.env.example](../apps/api/.env.example) 与代码中的 `ConfigService` / `process.env`。**勿将生产秘钥提交到 Git**。

### 基础与网络

| 变量 | 用途 | 默认/备注 |
|------|------|------------|
| `DATABASE_URL` | Prisma 连接串 | 必填 |
| `PORT` | HTTP 端口 | 3000 |
| `NODE_ENV` | 运行环境 | |
| `CORS_ORIGIN` | CORS 白名单 | `main.ts` 中默认 `*` |
| `JWT_SECRET` | JWT 签名与 WS 验签 | 与 `shengri-secret` 等占位勿用于生产 |
| `JWT_EXPIRES_IN` | Token 时长 | 见 `auth` 模块 |
| `CALENDAR_ENGINE_URL` | Python 排盘基址 | 本地 `http://localhost:8100`，compose 内 `http://calendar-engine:8100` |

### Redis

| 变量 | 说明 |
|------|------|
| `REDIS_HOST` | 默认 `localhost` |
| `REDIS_PORT` | 默认 6379 |
| `REDIS_PASSWORD` | 可选 |

### AI 呼叫（`AiService` 等）

| 变量 | 说明 |
|------|------|
| `DEFAULT_AI_PROVIDER` | `minimax` / `openai` / `deepseek` |
| `MINIMAX_*` | `API_KEY`, `BASE_URL`, `MODEL` |
| `OPENAI_*` | 同上 |
| `DEEPSEEK_*` | 同上，含 `DEEPSEEK_MODEL`（代码与 seed 使用） |
| `ENCRYPTION_KEY` | 密文 API Key 存储；缺省回退到 `JWT_SECRET`（见 `CryptoService`） |

### 微信与支付

| 变量 | 说明 |
|------|------|
| `WECHAT_APP_ID` | 公众号/开放平台应用 id |
| `WECHAT_MCH_ID` | 商户号 |
| `WECHAT_API_KEY` | 商户 API 密钥（签名） |
| `WECHAT_NOTIFY_URL` | 支付结果异步通知公网 URL（`PaymentService`） |

### Mem0 / 向量

| 变量 | 说明 |
|------|------|
| `QDRANT_URL` | 默认 `http://localhost:6333`（`mem0.service`） |
| `MEM0_LLM_*` / `MEM0_EMBEDDING_*` | 记忆抽取与向量化所用模型与 Key |
| `WS_CORS_ORIGIN` | 独立 WS CORS 若与全局 CORS 分离时使用（以实际代码引用为准） |

### 开放 API 与杂项

| 变量 | 说明 |
|------|------|
| `OPEN_API_TEST_KEY` | 开发/测试用 API Key，见 `open-api.service` |

---

## 前端环境（`apps/web`）

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_API_URL` | 浏览器访问的 API 基址，须含 `api/v1` 或代码中如何拼接以项目为准，Compose 为 `http://api:3000/api/v1` |

开发时一般设为 `http://localhost:3000/api/v1`（或经网关统一前缀）。

---

## 排障速查

| 现象 | 可能原因 |
|------|----------|
| 排盘 5xx/超时 | `CALENDAR_ENGINE_URL` 不可达、Python 未装 `sxtwl`（`/health` 会显示 engine） |
| 登录后 WS 断连 | JWT 与 HTTP 秘钥不一致、未传 token、CORS/代理未转发 WebSocket |
| Prisma BigInt 序列化 | 全局已在 `main.ts` 为 `BigInt` 打补丁；若新入口绕过请统一序列化 |
| 支付回调失败 | 公网 `WECHAT_NOTIFY_URL`、签名校验、Body 被中间件篡改 |

## 健康检查

- 历法引擎：`GET http://localhost:8100/health`
- Qdrant：`GET http://localhost:6333/healthz`
- API：无内建 `/health` 时可用任意轻量已公开路由或按需在 `main.ts` 增加
