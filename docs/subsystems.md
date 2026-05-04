# 子系统扩展指南

以下说明各子系统在代码中的位置、扩展方式与当前约束。实现细节以对应 `*.service.ts` 为准。

---

## 历法引擎（Python / FastAPI）

**路径**：[../apps/calendar-engine](../apps/calendar-engine)。

- **应用入口**：`app.main:app`，挂载路由前缀 `/api/v1`（见 `main.py`）。
- **排盘 HTTP**：`POST /api/v1/bazi/chart`；`GET /api/v1/bazi/cities`（见 [app/api/bazi.py](../apps/calendar-engine/app/api/bazi.py)）。
- **健康检查**：`GET /health`，返回 `engine` 字段（若安装 `sxtwl` 则为 `sxtwl`）。

**与 Nest 的契约**：`BaziService` 将排盘请求转发到 `CALENDAR_ENGINE_URL`（如 `http://localhost:8100`），并组合业务后写入 Prisma。升级历法库或真太阳时算法时：

1. 保持请求/响应与现有 `BaziService` 解析逻辑兼容，或同步修改 Nest 与 DTO。  
2. 更新 `BaziChart.algorithmVersion` / `engineVersion` 的写入逻辑，便于线上对比。  
3. 在 Docker 中保证 `api` 能解析 `calendar-engine` 主机名（见 `docker-compose.yml`）。

**约束**：`midnight_rule`、性别、经纬与时区会参与 `calculate_bazi`；新参数需在 Python 与 `CreateChartDto` 中同时体现。

---

## 规则引擎（`RuleEngineService`）

**路径**：[rule-engine.service.ts](../apps/api/src/modules/rule-engine/rule-engine.service.ts)

- 规则从表 `Rule` 加载，按 `module` 与 `isActive` 等筛选；`conditions` 为 JSON（支持 `AND`/`OR` 与比较运算）；`actions` 产出标签、分数字段与文案模板。
- `analyze(chartData, modules)` 返回 `AnalysisResult`（`modules` / `tags` / `scores` 等），供报告与开放 API 复用。
- 规则命中会更新 `Rule.hitCount` 等（见 `executeRule` 后逻辑）。

**扩展新 `module` 时**：

1. 在 `ReportService` 的 `moduleMap` 中把新报告类型映射到需执行的模块列表（[report.service.ts](../apps/api/src/modules/report/report.service.ts)）。  
2. 在 Prisma/后台录入对应 `module` 的规则行，或通过 `POST /api/v1/rules`（管理员）创建。  
3. 保持 `chartData` 中字段名与条件里的 `field` 一致，否则条件永不命中。

**缓存**：与 `RedisService` 联动，修改规则后需有失效或 TTL 策略（以当前实现为准）。

---

## AI 与报告

### AI 多 Provider

**路径**：[ai.service.ts](../apps/api/src/modules/ai/ai.service.ts)

- 通过环境变量与/或表 `AiModelConfig` 选择 `minimax` / `openai` / `deepseek` 等。  
- `DEFAULT_AI_PROVIDER` 为默认；数据库配置可覆盖（见 `AdminAiController` 与 seed）。

**扩展新 Provider**：在 `AiService` 中增加 client 工厂分支，并补全 `AiModelConfig` 种子或后台录入流程。

### 报告流水线

**路径**：[report.service.ts](../apps/api/src/modules/report/report.service.ts)

1. 根据 `chartId` 取命盘并转为 `chartData`。  
2. 按 `reportType` 选择 `moduleMap` 中的规则模块。  
3. 调用 `ruleEngine.analyze`。  
4. 调用 `aiService.generateReport`，传入 `ruleResults`。  
5. 持久化 `AnalysisReport`（含 `aiProvider`, `promptVersion` 等）。

**新增 `reportType`**：必须补充 `moduleMap` 与 Prompt 模板（`Prompt` 表及 `aiService` 内按 module 选模板逻辑），并考虑免费版截断策略 `truncateForFree`。

---

## 支付与订单

**路径**：

- 订单：[order.service.ts](../apps/api/src/modules/order/order.service.ts)  
- 支付：[payment.service.ts](../apps/api/src/modules/payment/payment.service.ts)

**当前状态（二开注意）**：

- `createWechatPay` 已组装微信参数，但**签名与调起 V3 API 为 TODO**（注释明确）。生产需接官方 SDK/签名并安全存储商户密钥。  
- `handleWechatNotify` 中验签/解密为 **TODO**；未验签前存在伪造回调风险。上线前必须实现微信平台证书验签。  
- 成功回调中调用 `orderService.markPaid` 更新状态；需保证**幂等**（微信可能重复通知）。

**环境变量**：`WECHAT_APP_ID`、`WECHAT_MCH_ID`、`WECHAT_API_KEY`、`WECHAT_NOTIFY_URL`（[ops-environment.md](ops-environment.md)）。

---

## 聊天与 WebSocket、Mem0

**HTTP**：[chat.controller.ts](../apps/api/src/modules/chat/chat.controller.ts) — 会话 CRUD、按报告建会话、消息反馈。

**WebSocket**：[chat.gateway.ts](../apps/api/src/modules/chat/chat.gateway.ts)

- **Namespace** `/chat`；连接时校验 JWT。  
- 消息：`join_session`、`send_message`（流式 `stream_chunk` / `stream_end`）、`feedback`、`typing`。

**Mem0 与 Qdrant**：[mem0.service.ts](../apps/api/src/common/mem0/mem0.service.ts)

- `QDRANT_URL` 默认 `http://localhost:6333`；Compose 中需与 `qdrant` 服务网络互通。  
- LLM/Embedding 相关变量见 [ops-environment.md](ops-environment.md)。  
- 会话/消息表上 `mem0UserId` 等用于与记忆层对齐。

**水平扩展**：多 API 实例时 Socket.IO 需使用 Redis Adapter（项目已依赖 `@socket.io/redis-adapter`），请在 `app` 或 `Chat` 模块完成初始化，避免房间消息仅单机可见。

---

## 开放 API

**路径**：[open-api 模块目录](../apps/api/src/modules/open-api)

- Header：`X-API-Key`；内部 `validateApiKey` + 限流（`Redis`）。  
- 测试用 Key 可来自 `OPEN_API_TEST_KEY`（仅开发/配置用途）。

**扩展**：新增开放能力时保持 Key 与 IP 白名单/限流策略一致，并更新 [api-inventory.md](api-inventory.md)。

---

## 排障与版本追溯

- 命盘与报告行上的 `algorithmVersion` / `engineVersion` / `promptVersion` 应随算法与模板变更而更新。  
- 若规则结果与预期不符，先打印 `chartData` 在规则条件中的路径与类型，再查 `Rule.conditions` JSON。
