# ShengRi (生辰) - 八字命理 SaaS 平台

## 项目路径
E:\Program Files\www\shengri

## 域名映射
- `localhost:3000` → `https://api.openedskill.com` (NestJS API, Swagger: `/api/docs`)
- `localhost:3001` → `https://sr.openedskill.com` (Next.js Web 用户站)
- `localhost:3002` → `https://ht.openedskill.com` (Vite Admin 管理后台)

## 技术栈
- Monorepo: pnpm workspace (`apps/*` + `packages/*`)
- API: NestJS 10 + TypeScript + Prisma + PostgreSQL + Redis
- Web: Next.js 14 (App Router) + Tailwind CSS 3 + Zustand + Socket.IO Client
- Admin: Vite + React-Admin 5 + MUI 5
- Calendar: Python FastAPI + lunisolar + sxtwl (port 8100)
- Vector DB: Qdrant (Mem0 memory system)
- AI: MiniMax / OpenAI / DeepSeek (multi-provider)
- Infrastructure: Docker Compose (7 services), K8s yamls available

## 项目结构
```
apps/
├── api/          # NestJS 后端 (3000)
│   ├── prisma/schema.prisma  # 22 tables
│   └── src/modules/          # 22 modules
├── web/          # Next.js 用户站 (3001)
├── admin/        # React-Admin 后台 (3002)
├── calendar-engine/  # Python 排盘引擎 (8100)
packages/
└── shared/       # 共享 TS 类型
docs/             # 技术文档
rules/            # 产品规则 JSON（八字/合婚/神煞等）
```

## 启动顺序
1. PostgreSQL + Redis (docker-compose up -d postgres redis)
2. Python calendar-engine: `pnpm dev:calendar`
3. NestJS API: `pnpm dev:api`
4. Web: `pnpm dev:web` / Admin: `pnpm dev:admin`

## 核心业务链路
- 排盘: Web → API(BaziService) → Python FastAPI(:8100) → BaziChart
- 报告: 命盘 → RuleEngine → AI Service → AnalysisReport
- 支付: 订单 → 微信V3/支付宝 → 回调验签 → 佣金结算
- 聊天: HTTP会话 + Socket.IO WebSocket + Mem0/Qdrant 记忆

## 关键文件
- API 入口: apps/api/src/main.ts
- Prisma Schema: apps/api/prisma/schema.prisma
- Web 路由: apps/web/src/app/
- Admin 资源: apps/admin/src/App.tsx
- 共享类型: packages/shared/src/index.ts
- API 文档: http://localhost:3000/api/docs (Swagger)

## 五行颜色系统
- Tailwind 自定义颜色定义在 `apps/web/tailwind.config.ts` → `theme.extend.colors.wx`
  - wood: '#22c55e', fire: '#ef4444', earth: '#f59e0b', metal: '#eab308', water: '#3b82f6'
  - 生成 `text-wx-*` 和 `bg-wx-*` CSS 类
- 图表四柱颜色核心文件:
  - `apps/web/src/components/chart/PillarGrid.tsx` — 四柱天干地支颜色渲染（日柱不再覆盖为金色）
  - `apps/web/src/components/chart/wuxing-utils.ts` — 共享的天干地支五行查找
  - `apps/web/src/components/chart/WuxingChart.tsx` — 五行力量图
- `ChartDisplay.tsx` 使用标准 Tailwind 颜色 (text-red-600 等)，不走 wx 自定义色
- `HealthPanel.tsx` 使用内联 style 颜色，不走 Tailwind 类

## 报告类型标签
- 共享常量: `apps/web/src/lib/constants.ts` → `REPORT_TYPE_LABELS`
- 所有页面（产品/个人中心/对话列表/命盘详情/报告页）统一使用此常量
- API `getUserReports` 已过滤 `status: 1` 排除已删除报告

## MCP 记忆系统
- 跨项目语义记忆服务器: `tools/mcp-memory/` (独立 Node.js 包)
- 存储: Qdrant `claude_memories` 集合 (localhost:6333, 768-dim Cosine)
- 嵌入: Ollama `nomic-embed-text` (localhost:11434, 768维, 备选关键词兜底)
- MCP 工具: `remember`, `recall`, `forget`, `status`, `list_projects`, `migrate`
- 记忆类型: user_profile/feedback (全局), project_context/decision/reference (按项目)
- 启动: Claude Code 设置 `C:\Users\dishi\.claude\settings.json` → `mcpServers.memory`
- 手动启动: 运行 `tools/mcp-memory/scripts/start.bat` (自动启动 Ollama)
- 迁移: `migrate` 工具可将 `.md` 文件记忆导入 Qdrant

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **shengri** (7765 symbols, 15461 relationships, 230 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/shengri/context` | Codebase overview, check index freshness |
| `gitnexus://repo/shengri/clusters` | All functional areas |
| `gitnexus://repo/shengri/processes` | All execution flows |
| `gitnexus://repo/shengri/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
