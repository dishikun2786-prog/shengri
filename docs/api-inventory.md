# HTTP / WebSocket API 清单与鉴权

**基址**：所有 HTTP 控制器在全局前缀 `api/v1` 之下（见 `apps/api/src/main.ts`）。  
**完整 URL 示例**：`http://<host>:3000/api/v1/<Controller 路径>/<方法路径>`。

**OpenAPI**：服务启动后访问 `http://<host>:3000/api/docs`（Swagger UI），以运行态文档为准；本文档用于二开快速索引。

---

## 鉴权模型

| 方式 | 场景 | 说明 |
|------|------|------|
| **无** | 公开接口 | 如登录、注册、验证码、部分排盘与产品列表 |
| **Bearer JWT** | 用户端与管理端 | `Authorization: Bearer <token>`，登录接口返回的 `access_token` |
| **角色 `admin`** | 管理类接口 | `JwtAuthGuard` + `RolesGuard`，`User.role` 需为 `admin` |
| **X-API-Key** | 开放 API | 请求头 `X-API-Key`，见 `open-api` 模块 |

JWT 秘钥由环境变量 `JWT_SECRET` 配置（与 `apps/api/src/modules/auth/jwt.strategy.ts` 一致）。

---

## 按模块路由表

下列路径均省略前缀 `api/v1`。

### auth（`AuthController`，`auth`）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/auth/captcha` | 无 | 图形验证码 |
| POST | `/auth/register` | 无 | 注册 |
| POST | `/auth/login` | 无 | 登录 |

### user（`UserController`，`user`）

| 方法 | 路径 | 鉴权 |
|------|------|------|
| GET | `/user/profile` | JWT |
| PATCH | `/user/profile` | JWT |
| GET | `/user/charts` | JWT |
| GET | `/user/orders` | JWT |
| GET | `/user/reports` | JWT |

### bazi（`BaziController`，`bazi`）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/bazi/chart` | 无 | 排盘（不保存） |
| POST | `/bazi/chart/save` | JWT | 排盘并归属当前用户 |
| GET | `/bazi/chart/:id` | 无 | 命盘详情 |
| GET | `/bazi/cities` | 无 | 城市列表（代理历法引擎） |

### order（`OrderController`，`order`）

| 方法 | 路径 | 鉴权 |
|------|------|------|
| POST | `/order` | JWT | 创建订单 |
| POST | `/order/pay-balance/:orderNo` | JWT | 余额支付订单 |
| GET | `/order/products` | 无 | 产品列表 |
| GET | `/order/:orderNo` | JWT | 订单详情 |

### payment（`PaymentController`，`payment`）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/payment/wechat/:orderNo` | JWT | 发起微信支付（query `type`: `native`/`h5`，默认 native） |
| POST | `/payment/wechat/notify` | 无 | 微信 V3 异步通知（平台回调，需 rawBody 验签 + AES-GCM 解密） |
| POST | `/payment/alipay/:orderNo` | JWT | 发起支付宝支付（query `type`: `page`/`wap`，默认 page） |
| POST | `/payment/alipay/notify` | 无 | 支付宝异步通知（form-urlencoded，SDK `checkNotifySign` 验签） |
| GET | `/payment/alipay/return` | 无 | 支付宝同步跳转（重定向到前端结果页 `?orderNo=xxx`） |
| GET | `/payment/status/:orderNo` | JWT | 查询支付状态（轮询用，返回 `isPaid` 布尔值） |

### report（`ReportController`，`report`）

| 方法 | 路径 | 鉴权 |
|------|------|------|
| POST | `/report/generate` | JWT |
| GET | `/report/:uuid` | 无 | 通过 UUID 读报告（分享场景需注意业务风控） |

### ai（`AiController`，`ai`）

| 方法 | 路径 | 鉴权 |
|------|------|------|
| POST | `/ai/generate` | JWT |

### rules（`RuleEngineController`，`rules`）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/rules/analyze` | JWT | 对命盘数据跑规则分析 |
| GET | `/rules/:module` | 无 | 按模块拉取已启用规则列表 |
| POST | `/rules` | JWT + **admin** | 创建规则 |

### hehun（`HehunController`，`hehun`）

| 方法 | 路径 | 鉴权 |
|------|------|------|
| POST | `/hehun/match` | JWT |

### distribution（`DistributionController`，`distribution`）

| 方法 | 路径 | 鉴权 |
|------|------|------|
| POST | `/distribution/apply` | JWT |
| GET | `/distribution/me` | JWT |
| GET | `/distribution/leaderboard` | 无 |

### conversion（`ConversionController`，`conversion`）

| 方法 | 路径 | 鉴权 |
|------|------|------|
| POST | `/conversion/task` | JWT |
| POST | `/conversion/ai-followup` | JWT |
| GET | `/conversion/stats` | JWT |
| POST | `/conversion/process` | JWT |

### crm（`CrmController`，`crm`）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/crm/customer` | JWT |  |
| PATCH | `/crm/customer/:id` | JWT |  |
| GET | `/crm/customers` | JWT |  |
| POST | `/crm/follow-up` | JWT |  |
| GET | `/crm/customer/:id/timeline` | JWT |  |
| GET | `/crm/funnel` | JWT |  |

### master（`MasterController`，`master`）

| 方法 | 路径 | 鉴权 |
|------|------|------|
| POST | `/master/apply` | JWT |
| GET | `/master/list` | 无 |
| GET | `/master/consultations/me` | JWT |
| POST | `/master/consultation` | JWT |
| GET | `/master/:id` | 无 |

### open（`OpenApiController`，`open`）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/open/chart` | `X-API-Key` | 开放排盘 |
| POST | `/open/analyze` | `X-API-Key` | 开放分析（内部组合 Bazi/规则/AI） |

### card-key（`CardKeyController`，`card-key`）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/card-key/redeem` | JWT | 用户兑换卡密（事务：标记已用 + 加余额 + 写流水） |
| GET | `/card-key/balance` | JWT | 查询当前余额 |

### admin（`AdminController`，`admin`）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/admin/:resource` | JWT + **admin** | 列表，Query：`sort` `range` `filter`（react-admin 约定） |
| GET | `/admin/:resource/:id` | JWT + **admin** | 单条 |
| POST | `/admin/:resource` | JWT + **admin** | 创建；`chat_sessions`、`chat_messages`、`card_keys`、`balance_transactions` **禁止创建**（返回 400） |
| PUT | `/admin/:resource/:id` | JWT + **admin** | 更新；`card_keys`、`balance_transactions` **禁止编辑**（返回 400） |
| DELETE | `/admin/:resource/:id` | JWT + **admin** | 删除；`chat_sessions` 先删消息并清理 Mem0；`balance_transactions` **禁止删除**（返回 400） |

**resource** 白名单：`users`、`orders`、`products`、`rules`、`prompts`、`reports`、`distributors`、`crm_customers`、`masters`、`consultations`、`charts`、`commission_records`、`chat_sessions`、`chat_messages`、`card_keys`、`balance_transactions`。

**chat_messages 列表约束**：`GET /admin/chat_messages` 的 `filter` 中必须包含 **`sessionId`** 或 **`id`**；否则返回 **400**。

### admin/dashboard（`AdminDashboardController`）

| 方法 | 路径 | 鉴权 |
|------|------|------|
| GET | `/admin/dashboard/stats` | JWT + **admin** |
| GET | `/admin/dashboard/revenue-chart` | JWT + **admin** |
| GET | `/admin/dashboard/order-status` | JWT + **admin** |
| GET | `/admin/dashboard/recent-orders` | JWT + **admin** |
| GET | `/admin/dashboard/recent-users` | JWT + **admin** |

### admin/actions（`AdminActionsController`）

| 方法 | 路径 | 鉴权 |
|------|------|------|
| POST | `/admin/actions/commission/process/:orderId` | JWT + **admin** | 手动触发佣金计算 |
| POST | `/admin/actions/consultation/complete/:consultationNo` | JWT + **admin** | 完结咨询单 |
| POST | `/admin/actions/card-key/generate` | JWT + **admin** | 批量生成卡密（body: `{ amount, count, remark?, expireAt? }`） |
| POST | `/admin/actions/card-key/void/:id` | JWT + **admin** | 作废未使用的卡密 |

### admin/config（`AdminConfigController`）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/admin/config/site` | JWT + **admin** | 读取站点基础信息配置 |
| PUT | `/admin/config/site` | JWT + **admin** | 更新站点基础信息配置 |
| GET | `/admin/config/payment` | JWT + **admin** | 读取支付方式配置 |
| PUT | `/admin/config/payment` | JWT + **admin** | 更新支付方式配置 |
| GET | `/admin/config/payment-credentials` | JWT + **admin** | 读取支付渠道密钥配置（敏感字段脱敏：前 8 位 + `****`） |
| PUT | `/admin/config/payment-credentials` | JWT + **admin** | 更新支付渠道密钥配置（privateKey 等敏感字段 AES 加密存储） |
| POST | `/admin/config/payment-test/:channel` | JWT + **admin** | 测试支付渠道连通性（channel: `wechat`/`alipay`） |

### admin/ai（`AdminAiController`）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/admin/ai/config` | JWT + **admin** |  |
| GET | `/admin/ai/providers` | JWT + **admin** |  |
| POST | `/admin/ai/providers` | JWT + **admin** |  |
| PUT | `/admin/ai/providers/:id` | JWT + **admin** |  |
| DELETE | `/admin/ai/providers/:id` | JWT + **admin** |  |
| POST | `/admin/ai/providers/:id/set-default` | JWT + **admin** |  |
| POST | `/admin/ai/providers/:id/test` | JWT + **admin** |  |
| POST | `/admin/ai/test` | JWT + **admin** |  |
| GET | `/admin/ai/providers/:id/models` | JWT + **admin** |  |
| POST | `/admin/ai/providers/migrate-env` | JWT + **admin** | 从环境变量迁移/同步配置（运维向） |

### config（`ConfigController`，公开）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/config/site` | 无 | 返回站点基础信息（前端 layout 动态渲染） |
| GET | `/config/payment-methods` | 无 | 返回已启用的支付方式列表（前端支付选择） |

### chat（`ChatController`，`chat`）

| 方法 | 路径 | 鉴权 |
|------|------|------|
| POST | `/chat/session` | JWT |
| GET | `/chat/sessions` | JWT |
| GET | `/chat/session/:id/messages` | JWT |
| GET | `/chat/session/:id/memories` | JWT |
| DELETE | `/chat/session/:id` | JWT |
| POST | `/chat/session/by-report/:reportUuid` | JWT |
| POST | `/chat/message/:messageUuid/feedback` | JWT |

---

## WebSocket（Socket.IO）

- **Namespace**：`/chat`（见 `apps/api/src/modules/chat/chat.gateway.ts`）。
- **连接 URL 示例**：`ws://<host>:3000/chat`（具体传输与 path 以客户端 `socket.io-client` 配置为准，需与 API 同 host/port 或经网关转发）。
- **鉴权**：连接时通过 `auth.token` 或 `Authorization: Bearer` 头传递 JWT，与 HTTP 使用同一 `JWT_SECRET` 签发 token。
- **服务端事件（订阅）**：
  - `join_session`：body `{ sessionId }`
  - `send_message`：body `{ sessionId, content }`（流式通过 `stream_chunk` / `stream_end` 等推送）
  - `feedback`：body `{ messageUuid, score, text? }`（`score` 为 1 或 -1）
  - `typing`：body `{ sessionId, isTyping }`

多实例部署时需配置 Redis IO Adapter（依赖已存在于项目中），见 [子系统扩展指南 - 聊天](subsystems.md#聊天与-websocket)。

---

## 关键 DTO 入口

- 排盘：`CreateChartDto` — `apps/api/src/modules/bazi/bazi.dto.ts`
- 其余多为内联 `body` 类型或 `any`；以 Swagger 与各 Service 入参为准。

二开时优先在 DTO 中显式定义字段并加 `class-validator`，与全局 `ValidationPipe`（`whitelist: true`）配合。
