# 前端与后台管理

## 用户站（`apps/web`）

**框架**：Next.js 14 App Router、Tailwind、Zustand、Axios（封装见 `src/lib/api.ts`）、`socket.io-client`（[useSocket.ts](../apps/web/src/hooks/useSocket.ts)）。

### 环境变量

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_API_URL` | HTTP 基址，未设置时 `axios` 使用相对路径 `'/api/v1'`（见 [`api.ts`](../apps/web/src/lib/api.ts)）。生产/ Docker 或跨域时通常设为绝对地址（如 `https://你的域名/api/v1`）。 |
| `NEXT_PUBLIC_WS_URL` | Socket.IO 的 HTTP 基址，默认 `http://localhost:3000`（与 API 同机）。 |

> 经 Next 自带 rewrite 或外层 Nginx 将 `/api` 转发到 Nest 时，使用相对 `'/api/v1'` 可省略 `NEXT_PUBLIC_API_URL`。

### 路由与页面

| 路径 | 文件 | 用户旅程 |
|------|------|----------|
| `/` | `src/app/page.tsx` | 首页 / 排盘入口 |
| `/login`、`/register` | 对应 `page.tsx` | 鉴权，token 存 `localStorage` |
| `/profile` | `profile/page.tsx` | 我的报告/命盘 + 余额显示 + 卡密兑换 |
| `/products` | `products/page.tsx` | 产品列表 |
| `/report/generating/[chartId]` | 生成中动画页 | 等报告 |
| `/report/[uuid]` | 报告详情 | 可分享（依赖后端权限与 `isPaid` 截断） |
| `/chat/[reportUuid]` | 报告关联聊天 | 使用 WebSocket 与 [chat 模块 API](../apps/api/src/modules/chat) |

### 动态站点配置

`layout.tsx` 使用 `generateMetadata()` 异步函数从 `GET /config/site` 动态读取站点标题、描述、关键词、品牌名、页脚文案、ICP 备案号等信息（60s ISR 缓存）。导航栏品牌名和页脚均来自配置，管理员在后台「基础信息」页修改后无需重新部署即可生效。

### 支付方式选择

`PaymentMethodSelector` 组件（`src/components/PaymentMethodSelector.tsx`）在用户创建订单后调用 `GET /config/payment-methods` 获取管理员启用的支付方式列表，仅展示已启用的选项。报告详情页的「解锁完整报告」按钮触发创建订单 → 弹出支付方式选择弹窗的完整支付流程。

二开时新增页面放在 `src/app/.../page.tsx`，与 [api 清单](api-inventory.md) 中的 REST/WebSocket 对齐。

---

## 管理后台（`apps/admin`）

**框架**：Vite、React-Admin 5、MUI 5。开发服务器 **3002**，并代理 `/api` → `http://localhost:3000`（[vite.config.ts](../apps/admin/vite.config.ts)）。

### DataProvider 与 API 的映射

**文件**：[dataProvider.ts](../apps/admin/src/dataProvider.ts)

- 所有资源请求基址为 **`/api/v1/admin`**（相对路径，由 Vite 代理到 Nest）。
- 使用 `localStorage` 中的 `token` 作为 `Authorization: Bearer`。
- 查询参数与 React-Admin 约定一致：`sort`、`range`（分页）、`filter`；列表响应依赖响应头 `Content-Range` 获取总数（与 `AdminController` 实现一致）。

**资源名（`name` 属性）→ 后端 `GET/POST/PUT/DELETE`**

| React-Admin `name` | 对应 `admin/:resource` |
|--------------------|-------------------------|
| `users` | `users` |
| `orders` | `orders` |
| `products` | `products` |
| `rules` | `rules` |
| `prompts` | `prompts` |
| `reports` | `reports` |
| `charts` | `charts`（Prisma 模型为 `BaziChart`） |
| `consultations` | `consultations` |
| `distributors` | `distributors` |
| `commission_records` | `commission_records` |
| `crm_customers` | `crm_customers` |
| `masters` | `masters` |
| `chat_sessions` | `chat_sessions`（对话管理：列表 + 详情内嵌消息） |
| `chat_messages` | `chat_messages`（不进侧栏菜单；详情页 `ReferenceManyField` 拉取，列表 API 须带 `sessionId` 或 `id`） |
| `card_keys` | `card_keys`（卡密管理：列表 + 详情 + 批量生成弹窗 + 作废按钮） |
| `balance_transactions` | `balance_transactions`（余额流水：只读列表，禁止增删改） |

自定义页：

- **AI 配置** 路由 `/ai-config`，请求走 `/api/v1/admin/ai/...`（见 [api-inventory.md](api-inventory.md) 的 `admin/ai` 节）。
- **基础信息** 路由 `/site-config`，请求走 `/api/v1/admin/config/site`（站点标题/品牌/SEO/联系/页脚等）。
- **支付管理** 路由 `/payment-config`，请求走 `/api/v1/admin/config/payment`（微信/支付宝/余额/卡密 4 种支付方式开关/名称/排序）。

**鉴权登录**：`authProvider` 对后台用户校验 JWT；**用户须 `role=admin`** 才能通过 `RolesGuard` 访问 admin 控制器。首次可在数据库中把测试用户 `role` 改为 `admin` 或走种子数据。

### 看板与动作

- 仪表盘数据：`/api/v1/admin/dashboard/*`（非 `dataProvider` 默认资源，由自定义 Dashboard 或后续扩展调用）。
- 业务动作：`/api/v1/admin/actions/*`（佣金处理、完成咨询、卡密批量生成/作废等）。

---

## 共享类型

业务展示可与 [packages/shared](../packages/shared/src/index.ts) 中的 `BaziChart` 等对齐；若 API 返回 camelCase 与共享包蛇形/结构不一致，以实际 JSON 响应为准并在前端 DTO 中做一次映射。
