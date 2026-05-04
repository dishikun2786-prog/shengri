# ShengRi 二次开发技术文档索引

本目录为 **ShengRi（生辰）** 专业级八字命理 SaaS 平台的二次开发说明，与仓库代码同源维护。详细表结构以 Prisma 为准，HTTP 接口以运行中的 Swagger 为准。

## 文档结构

| 文档 | 说明 |
|------|------|
| [架构与 API 清单](api-inventory.md) | 全局前缀、鉴权模型、按模块的 REST 路由与 WebSocket 约定 |
| [领域数据字典](data-dictionary.md) | 核心实体关系、表用途、枚举与 JSON 扩展字段说明 |
| [运行与环境变量](ops-environment.md) | 端口、Docker Compose、本地启动顺序、环境变量表 |
| [子系统扩展指南](subsystems.md) | 历法引擎、规则引擎、AI/报告、支付订单、Mem0/聊天 |
| [前端与后台映射](frontend.md) | Next.js 路由、管理端与 `/api/v1/admin` 的对应关系 |
| [管理后台对账矩阵](admin-audit-matrix.md) | Admin 资源 UI、自定义接口与 C 端能力对照 |

## 产品能力概览（业务域）

- **用户与鉴权**：注册/登录、JWT、图形验证码；用户档案含出生地与 VIP 等。
- **八字与命盘**：公开排盘与登录保存；调用独立 **Python 历法引擎**；命盘落库 `BaziChart`。
- **规则与 AI**：可配置 `Rule` / `Prompt`；报告 `AnalysisReport` 含规则结果与 AI 正文。
- **商业化**：产品、订单、微信支付回调；分销与佣金；自动成交流水。
- **扩展业务**：合婚、命理师与咨询、CRM、开放 API（API Key + 限流）、报告关联 **聊天**（HTTP + Socket.IO + Mem0/Qdrant）。

## 代码锚点（快速跳转）

| 主题 | 路径 |
|------|------|
| Nest 根模块 | `apps/api/src/app.module.ts` |
| 全局 HTTP 前缀与 Swagger | `apps/api/src/main.ts`（前缀 `api/v1`，文档 `/api/docs`） |
| Prisma 模式 | `apps/api/prisma/schema.prisma` |
| 管理端 CRUD 资源名 | `apps/api/src/modules/admin/admin.controller.ts` 内 `ResourceName` |
| 共享 TS 类型 | `packages/shared/src/index.ts` |

## 维护约定

1. **与迁移同步**：修改 `schema.prisma` 并执行迁移后，在 [data-dictionary.md](data-dictionary.md) 中更新对应模型/字段说明（至少更新「变更要点」或相关小节）。
2. **与接口同步**：新增或变更 Controller 路由时，更新 [api-inventory.md](api-inventory.md)；生产环境以 `/api/docs` 为权威 OpenAPI 展示。
3. **与环境同步**：新增 `ConfigService` / `process.env` 读取时，在 [ops-environment.md](ops-environment.md) 补充变量名、用途与默认值。
4. **不提交秘钥**：文档中仅写变量名，不写真实 API Key、数据库密码、JWT 秘钥；示例用占位符。
5. **子系统行为变更**：若排盘、规则命中、报告流水线、支付回调或 WebSocket 协议有变，必须更新 [subsystems.md](subsystems.md)。

发版时建议将文档变更纳入同版本 PR/变更说明，便于二开团队追溯 `algorithmVersion` / `engineVersion` 与线上行为。
