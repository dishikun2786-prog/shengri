# 管理后台功能对账矩阵

与代码同步维护，用于验证 React Admin 资源、`/api/v1/admin/:resource` 白名单与 C 端业务能力是否对齐。

## 表 A：Admin 资源 × 前端 UI × 通用 CRUD

| resource | List | Create | Edit | Show | Delete（UI） | 备注 |
|----------|------|--------|------|------|--------------|------|
| users | ✓ | ✓ | ✓ | — | 视 List 配置 | |
| orders | ✓ | — | — | ✓ | — | |
| products | ✓ | ✓ | ✓ | — | 视 List 配置 | |
| rules | ✓ | ✓ | ✓ | — | 视 List 配置 | |
| prompts | ✓ | ✓ | ✓ | — | 视 List 配置 | |
| reports | ✓ | — | — | ✓ | — | |
| charts | ✓ | — | — | — | — | 仅列表/导出 |
| consultations | ✓ | — | — | ✓ | — | |
| distributors | ✓ | ✓ | ✓ | — | 视 List 配置 | |
| commission_records | ✓ | — | — | — | — | 只读列表 |
| crm_customers | ✓ | ✓ | ✓ | — | 视 List 配置 | |
| masters | ✓ | — | ✓ | — | 视 List 配置 | 无 Create（业务从 C 端申请） |
| chat_sessions | ✓ | — | — | ✓ | ✓（详情顶栏） | 对话管理；消息经 `chat_messages` + `sessionId` |
| chat_messages | — | — | — | — | — | 不单独进菜单；仅供 `ReferenceManyField` / 带 `sessionId` 的列表 API |
| card_keys | ✓ | —（批量生成） | — | ✓ | —（作废按钮） | 卡密管理；创建走 `admin/actions/card-key/generate`；作废走 `admin/actions/card-key/void/:id` |
| balance_transactions | ✓ | — | — | — | — | 余额流水只读列表；禁止 POST/PUT/DELETE |

## 表 B：自定义能力（非 `dataProvider` 默认资源）

| 能力 | 前端入口 | API |
|------|----------|-----|
| 数据大屏 | `/` Dashboard | `GET /admin/dashboard/*` |
| AI 模型配置 | `/ai-config` | `GET/POST/PUT/DELETE /admin/ai/*` |
| 佣金手动核算 | （当前无专用按钮） | `POST /admin/actions/commission/process/:orderId` |
| 咨询完结 | （当前无专用按钮） | `POST /admin/actions/consultation/complete/:consultationNo` |
| 批量生成卡密 | `/card_keys` 列表 TopToolbar 内弹窗 | `POST /admin/actions/card-key/generate` |
| 作废卡密 | `/card_keys/:id` Show 详情顶栏按钮 | `POST /admin/actions/card-key/void/:id` |
| 站点配置 | `/site-config` 自定义页 | `GET/PUT /admin/config/site` |
| 支付管理 | `/payment-config` 自定义页 | `GET/PUT /admin/config/payment` |

## 表 C：鉴权

| 场景 | 预期 |
|------|------|
| `Authorization: Bearer <admin JWT>` 访问 `GET /admin/:resource` | 200 + `Content-Range` |
| 普通用户 JWT 或缺 token | 401 / 403（`RolesGuard`） |

## C 端 vs 后台数据视图（业务对账）

| C 端能力（`apps/web`） | 后台 |
|------------------------|------|
| 排盘 / 命盘 | `charts` |
| 报告 | `reports` |
| 订单 / 产品 | `orders` / `products` |
| 用户资料 / 我的报告 | `users` 等 |
| 报告关联 AI 对话 | `chat_sessions` + `chat_messages`（会话详情内） |
| 余额 / 卡密充值 | `card_keys`（管理端） + 用户端 profile 卡密兑换 |
| 余额流水 | `balance_transactions`（管理端只读列表） |
| 余额支付 | `POST /order/pay-balance/:orderNo`（用户端） |
| 分销 / 佣金 / CRM / 命理师 / 咨询 | 对应 Resource |

未要求与后台菜单一一对应的模块示例：`conversion`（自动成交）、`hehun`、开放 API、支付回调等；若需运营可视可单列需求。
