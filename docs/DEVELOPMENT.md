# ShengRi (生辰) — 八字命理 SaaS 平台 开发手册

## 项目概述

ShengRi 是一个专业级八字命理 SaaS 平台，提供八字排盘、五行分析、AI 报告生成、在线咨询、数字能量、八宅风水、健康养生等多维度国学服务。采用 monorepo 架构，支持 Web 用户端、管理后台、Python 历法引擎三层结构。

- **仓库地址**: https://github.com/dishikun2786-prog/shengri.git
- **技术栈版本**: Node.js >= 18, pnpm >= 8

---

## 一、技术架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                       Nginx (80/443)                        │
│                   反向代理 + HTTPS                            │
└─────────────────────────────────────────────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│ Next.js   │  │ NestJS    │  │ FastAPI   │  │ Vite      │
│ Web 用户端│  │ API 服务  │  │ 历法引擎  │  │ Admin 管理│
│ :3001     │  │ :3000     │  │ :8100     │  │ :3002     │
└───────────┘  └───────────┘  └───────────┘  └───────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼              ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│ PostgreSQL │  │  Redis     │  │  Qdrant    │
│ :5432      │  │  :6379     │  │  :6333     │
└───────────┘  └───────────┘  └───────────┘
```

### 1.1 基础设施

| 服务 | 端口 | 技术 | 用途 |
|------|------|------|------|
| PostgreSQL 16 | 5432 | 关系型数据库 | 主数据存储（27 张表） |
| Redis 7 | 6379 | 内存缓存 | 会话缓存、状态缓存、Socket.IO 适配器 |
| Qdrant | 6333/6334 | 向量数据库 | Mem0 记忆系统语义存储 |
| Ollama | 11434 | 本地嵌入 | nomic-embed-text 768维嵌入 |

### 1.2 应用服务

| 应用 | 端口 | 框架 | 语言 |
|------|------|------|------|
| NestJS API | 3000 | NestJS 10 | TypeScript |
| Next.js Web | 3001 | Next.js 14 (App Router) | TypeScript |
| Vite Admin | 3002 | React-Admin 5 + MUI 5 | TypeScript |
| Calendar Engine | 8100 | FastAPI | Python 3.11+ |

---

## 二、项目结构

```
shengri/
├── apps/
│   ├── api/                    # NestJS 后端 (:3000)
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # 数据模型（27 表）
│   │   │   ├── migrations/     # 数据库迁移
│   │   │   └── seed.ts         # 种子数据
│   │   └── src/
│   │       ├── main.ts         # 入口
│   │       ├── app.module.ts   # 根模块
│   │       ├── common/         # 公共组件（Redis、Mangpai、加解密等）
│   │       └── modules/        # 30 个业务模块
│   │
│   ├── web/                    # Next.js 用户端 (:3001)
│   │   ├── src/app/            # App Router 页面（18 个路由）
│   │   ├── src/components/     # 共享组件
│   │   ├── src/lib/            # 工具函数、常量、Store
│   │   ├── src/hooks/          # 自定义 Hooks
│   │   └── tailwind.config.ts  # Tailwind 国学风颜色系统
│   │
│   ├── admin/                  # React-Admin 后台 (:3002)
│   │   └── src/
│   │       ├── App.tsx         # Admin 入口
│   │       ├── resources/      # 29 个资源管理页
│   │       ├── layout/         # 布局组件
│   │       └── constants.ts    # 常量配置
│   │
│   └── calendar-engine/        # Python 历法引擎 (:8100)
│       ├── app/
│       │   ├── main.py         # FastAPI 入口
│       │   ├── api/            # API 路由 (bazi, health)
│       │   ├── core/           # 核心算法
│       │   │   ├── pillar_calculator.py  # 四柱计算
│       │   │   ├── wuyunliuqi.py         # 五运六气
│       │   │   ├── solar_time.py         # 真太阳时
│       │   │   ├── lunar_table.py        # 农历转换
│       │   │   ├── organ_wuxing.py       # 脏腑五行
│       │   │   ├── geocoder.py           # 地理编码
│       │   │   └── constants.py          # 常量表
│       │   └── models/         # 数据模型
│       ├── tests/              # 测试
│       └── requirements.txt
│
├── packages/
│   └── shared/                 # 共享 TypeScript 类型
│       └── src/index.ts
│
├── rules/                      # 产品规则 JSON
│   ├── bazi-rules.json         # 八字分析规则
│   ├── hehun-rules.json        # 合婚规则
│   ├── shensha-rules.json      # 神煞规则
│   └── ...
│
├── docs/                       # 技术文档
├── docker-compose.yml          # Docker 编排（7 服务）
├── pnpm-workspace.yaml         # pnpm workspace 配置
└── package.json                # 根配置（Monorepo 脚本）
```

---

## 三、完整技术栈

### 3.1 根 Monorepo

| 包管理器 | pnpm 8+ (workspace) |
|----------|---------------------|
| 共享包 | `packages/shared` |

### 3.2 NestJS API — `@shengri/api`

**核心框架**

| 依赖 | 版本 | 用途 |
|------|------|------|
| @nestjs/common | ^10.3.0 | NestJS 核心 |
| @nestjs/core | ^10.3.0 | 依赖注入容器 |
| @nestjs/platform-express | ^10.3.0 | HTTP 服务器 |
| @nestjs/config | ^3.2.0 | 环境配置管理 |
| @nestjs/swagger | ^7.3.0 | Swagger API 文档 |

**认证鉴权**

| 依赖 | 用途 |
|------|------|
| @nestjs/jwt + @nestjs/passport | JWT 认证 |
| passport + passport-jwt | Passport JWT 策略 |
| passport-local | 本地登录策略 |
| bcryptjs | 密码哈希 |
| svg-captcha | 图形验证码 |

**数据库与缓存**

| 依赖 | 用途 |
|------|------|
| @prisma/client ^5.10.0 | PostgreSQL ORM |
| ioredis ^5.3.2 | Redis 客户端 |
| @socket.io/redis-adapter ^8.3.0 | Socket.IO Redis 适配器 |

**WebSocket**

| 依赖 | 用途 |
|------|------|
| @nestjs/websockets + @nestjs/platform-socket.io | WebSocket 网关 |
| socket.io ^4.8.3 | 实时通信 |

**定时任务**

| 依赖 | 用途 |
|------|------|
| @nestjs/schedule ^6.1.3 | Cron 定时任务 |

**AI 集成**

| 依赖 | 用途 |
|------|------|
| openai ^4.28.0 | OpenAI SDK |
| mem0ai ^3.0.1 | Mem0 记忆系统 |
| tiktoken ^1.0.22 | Token 计数 |

**支付集成**

| 依赖 | 用途 |
|------|------|
| wechatpay-node-v3 ^2.2.1 | 微信支付 V3 |
| alipay-sdk ^4.14.0 | 支付宝 |

**短信**

| 依赖 | 用途 |
|------|------|
| @alicloud/dysmsapi20170525 | 阿里云短信 |

**农历/历法**

| 依赖 | 用途 |
|------|------|
| lunisolar ^2.6.0 | JavaScript 农历库 |
| @lunisolar/plugin-char8ex | 八字天干地支插件 |
| @lunisolar/plugin-takesound | 纳音插件 |

**其他工具**

| 依赖 | 用途 |
|------|------|
| dayjs | 日期处理 |
| uuid | UUID 生成 |
| axios + @nestjs/axios | HTTP 请求 |
| class-validator + class-transformer | DTO 验证 |
| reflect-metadata | 装饰器元数据 |
| rxjs | 响应式编程 |

**开发依赖**

| 依赖 | 用途 |
|------|------|
| @nestjs/cli | NestJS CLI |
| prisma | Prisma CLI |
| jest + ts-jest | 测试 |
| typescript ^5.3.3 | TypeScript 编译 |
| eslint | 代码检查 |

### 3.3 Next.js Web — `@shengri/web`

| 依赖 | 版本 | 用途 |
|------|------|------|
| next | ^14.1.0 | Next.js (App Router) |
| react + react-dom | ^18.2.0 | React |
| tailwindcss | ^3.4.1 | CSS 框架 |
| zustand | ^4.5.0 | 状态管理 |
| axios | ^1.6.7 | HTTP 客户端 |
| socket.io-client | ^4.8.3 | WebSocket 客户端 |
| lunisolar | ^2.6.0 | 前端农历计算 |
| dayjs | ^1.11.10 | 日期处理 |
| lucide-react | ^0.330.0 | 图标库 |
| qrcode | ^1.5.4 | 二维码生成 |
| clsx | ^2.1.0 | 类名工具 |

### 3.4 Vite Admin — `@shengri/admin`

| 依赖 | 版本 | 用途 |
|------|------|------|
| react-admin | ^5.0.0 | 管理后台框架 |
| @mui/material | ^5.15.0 | Material UI |
| @mui/icons-material | ^5.15.0 | MUI 图标 |
| @emotion/react + styled | ^11.14.0 | CSS-in-JS |
| ra-data-simple-rest | ^5.0.0 | REST 数据提供者 |
| vite | ^5.0.0 | 构建工具 |
| vitest | ^2.1.9 | 测试框架 |
| axios | ^1.6.7 | HTTP 客户端 |
| qrcode | ^1.5.4 | 二维码生成 |

### 3.5 Calendar Engine — Python

| 依赖 | 用途 |
|------|------|
| fastapi >=0.110.0 | Web 框架 |
| uvicorn >=0.27.0 | ASGI 服务器 |
| sxtwl >=1.1.0 | 寿星天文历 C++ 扩展 |
| cnlunar >=0.1.0 | 中国农历 |
| pydantic >=2.5.0 | 数据验证 |
| python-dateutil | 日期工具 |
| timezonefinder | 时区查找 |
| pytz | 时区数据库 |
| httpx | HTTP 客户端 |

---

## 四、数据库模型（27 张表）

### 4.1 用户系统 (User System)
- **users** — 用户主表（手机/邮箱/微信/Google/Apple 多登录方式、VIP 等级、余额、推荐关系）
- **user_tags** — 用户标签（行为/消费/八字/自定义）

### 4.2 命盘系统 (Chart System)
- **bazi_charts** — 八字命盘（四柱干支、藏干、十神、纳音、五行、格局、用神、大运、流年、神煞、空亡、十二长生等完整字段）

### 4.3 规则引擎 (Rule Engine)
- **rules** — 分析规则（支持 A/B 分组、优先级、命中统计、审核流程）
- **prompts** — AI Prompt 模板（多版本、多模型、温度/token 配置、A/B 测试、转化率追踪）

### 4.4 产品订单 (Product & Order)
- **products** — 产品（多级别、多价格、分销佣金率）
- **orders** — 订单（支持折扣、优惠券、支付回调、退款、佣金计算、来源追踪）

### 4.5 分析报告 (Report)
- **analysis_reports** — 分析报告（关联命盘/占卜记录、AI 生成内容、质量评分、用户反馈、浏览/分享统计、追销钩子）

### 4.6 占卜风水 (Divination & Fengshui)
- **xiaoliuren_records** — 小六壬占卜（时/随机取数、六宫结果）
- **digital_energy_records** — 数字能量（手机号分析、八星、后四位分析）
- **bazhai_records** — 八宅风水（命卦、卦位、方向吉凶）
- **health_records** — 健康养生（五运六气、体质分析、脏腑评分、BMI、体重分析）

### 4.7 分销系统 (Distribution)
- **distributors** — 分销商（多级体系、佣金率、团队规模、累计收益）
- **commission_records** — 佣金记录（一级/二级返佣、结算状态）
- **withdrawal_requests** — 提现申请（审核流程）

### 4.8 CRM 系统
- **crm_customers** — 客户（分级分层、消费数据、LTV 预测、八字标签、跟进计划）
- **crm_follow_ups** — 跟进记录（支持 AI 建议话术、转化追踪）

### 4.9 命理师系统 (Master System)
- **masters** — 命理师（专长、价格、评分、佣金率）
- **consultations** — 咨询订单（文字/语音/视频、AI 辅助、评价）

### 4.10 聊天系统 (Chat)
- **chat_sessions** — 会话（关联报告、Mem0 记忆）
- **chat_messages** — 消息（角色、token 消耗、反馈）

### 4.11 社交系统 (Social)
- **moments** — 朋友圈动态
- **moment_images** — 动态图片
- **moment_likes** — 点赞
- **moment_comments** — 评论/回复

### 4.12 配对系统 (Pairing)
- **pairing_requests** — 配对请求（性格/事业/财富/合婚/综合，支持社交/自我两种模式）
- **pairing_free_trials** — 配对免费试用

### 4.13 通知系统
- **notifications** — 通知（配对请求/接受/拒绝/新消息等）

### 4.14 配置与计费
- **system_configs** — 系统配置 (JSON KV)
- **ai_model_configs** — AI 模型配置（多 provider、API Key、模型列表）
- **token_pricings** — Token 定价（按 provider + model）
- **token_usages** — Token 用量（关联余额交易、免费额度）
- **user_free_quotas** — 用户免费配额（永久 + 每日）
- **balance_transactions** — 余额变动（充值/支付/退款/调整/卡密）
- **card_keys** — 卡密

### 4.15 自动成交
- **auto_conversion_logs** — 自动转化日志（触发→推送→打开→点击→成交全链路）

---

## 五、API 模块一览（30 个模块）

### 5.1 核心模块
| 模块 | 路由前缀 | 功能 |
|------|----------|------|
| auth | `/api/v1/auth` | 注册、登录、验证码、短信登录、绑定手机 |
| user | `/api/v1/user` | 个人资料、命盘列表、订单、报告、密码修改 |
| bazi | `/api/v1/bazi` | 排盘计算、保存命盘、城市搜索、流年/流月/流日 |

### 5.2 分析报告
| 模块 | 路由前缀 | 功能 |
|------|----------|------|
| rule-engine | `/api/v1/rules` | 规则分析引擎 |
| ai | `/api/v1/ai` | AI 内容生成 |
| report | `/api/v1/report` | 报告生成、查看、分享 |

### 5.3 占卜风水
| 模块 | 路由前缀 | 功能 |
|------|----------|------|
| xiaoliuren | `/api/v1/xiaoliuren` | 小六壬占卜计算与报告 |
| digital-energy | `/api/v1/digital-energy` | 数字能量分析 |
| bazhai | `/api/v1/bazhai` | 八宅风水计算 |
| health | `/api/v1/health` | 五运六气、脏腑健康 |
| health-report | `/api/v1/health-report` | 健康报告 |
| hehun | `/api/v1/hehun` | 合婚匹配 |

### 5.4 业务系统
| 模块 | 路由前缀 | 功能 |
|------|----------|------|
| order | `/api/v1/order` | 下单、产品列表、余额支付 |
| payment | `/api/v1/payment` | 微信/支付宝回调、支付状态、发起支付 |
| token | `/api/v1/token` | 额度查询、用量记录 |
| card-key | `/api/v1/card-key` | 卡密兑换 |
| distribution | `/api/v1/distribution` | 分销申请、排行榜、提现 |
| promotion | `/api/v1/promotion` | 推广看板、收益、团队 |

### 5.5 社交互动
| 模块 | 路由前缀 | 功能 |
|------|----------|------|
| chat | `/api/v1/chat` | 创建会话、消息列表、消息反馈 |
| moments | `/api/v1/moments` | 朋友圈 CRUD、点赞、评论 |
| pairing | `/api/v1/pairing` | 配对请求、接受/拒绝、付款、生成报告、自我配对 |
| notification | `/api/v1/notification` | 通知列表、未读数、标记已读 |
| share | `/api/v1/share` | 报告分享链接 |
| upload | `/api/v1/upload` | 图片/头像上传 |

### 5.6 企业服务
| 模块 | 路由前缀 | 功能 |
|------|----------|------|
| master | `/api/v1/master` | 命理师申请、咨询下单 |
| crm | `/api/v1/crm` | 客户管理、跟进、漏斗 |
| conversion | `/api/v1/conversion` | 自动成交任务、统计 |
| config | `/api/v1/config` | 站点/支付公开配置 |
| enterprise | — | 企业管理 |

### 5.7 管理后台
| 模块 | 路由前缀 | 功能 |
|------|----------|------|
| admin | `/api/v1/admin` | CRUD 通用路由 + 仪表盘/统计 |
| admin (ai) | `/api/v1/admin/ai` | AI 模型配置管理 |
| admin (config) | `/api/v1/admin/config` | 站点/支付/推广/URL 配置 |
| admin (token) | `/api/v1/admin/token` | Token 定价配置 |
| admin (pairing) | `/api/v1/admin/pairing` | 配对配置 |
| admin (sms) | `/api/v1/admin/sms` | 短信配置 |
| admin (actions) | `/api/v1/admin/actions` | 佣金处理/咨询完成/卡密生成/提现审核 |

### 5.8 开放平台
| 模块 | 路由前缀 | 功能 |
|------|----------|------|
| open-api | `/api/v1/open` | 对外开放 API（排盘、分析） |

---

## 六、Python 历法引擎 API

FastAPI 服务，端口 8100，核心算法引擎。

### API 端点

| 路径 | 方法 | 功能 |
|------|------|------|
| `/api/v1/bazi/chart` | POST | 八字排盘计算 |
| `/api/v1/bazi/cities/search` | GET | 城市搜索 |
| `/api/v1/bazi/cities` | GET | 城市列表 |
| `/api/v1/bazi/liuyue` | GET | 流月计算 |
| `/api/v1/bazi/liuri` | GET | 流日计算 |
| `/api/v1/bazi/liunian` | GET | 流年计算 |
| `/api/v1/health/wuyun/*` | GET/POST | 五运六气健康 |
| `/api/v1/health/organs` | GET | 脏腑五行分析 |
| `/health` | GET | 健康检查 |

### 核心算法模块

| 模块 | 功能 |
|------|------|
| `pillar_calculator.py` | 四柱天干地支计算、大运排盘、流年岁君、十神、格局 |
| `wuyunliuqi.py` | 五运六气推算、司天在泉、主运客运 |
| `solar_time.py` | 真太阳时校正 |
| `lunar_table.py` | 农历日期转换 |
| `organ_wuxing.py` | 脏腑五行属性映射 |
| `geocoder.py` | 城市经纬度查询 |
| `constants.py` | 天干地支、五行、节气常量 |

---

## 七、前端路由与页面

### 7.1 Web 用户端 (:3001) — Next.js App Router

| 路由 | 页面功能 |
|------|----------|
| `/` | 首页 |
| `/login` | 登录 |
| `/register` | 注册 |
| `/about` | 关于 |
| `/products` | 产品列表 |
| `/profile` | 个人中心 |
| `/profile/settings` | 个人设置 |
| `/chart` | 命盘详情 |
| `/chat` | AI 对话 |
| `/report/generating/[chartId]` | 报告生成中 |
| `/pairing/self/new` | 自我配对 |
| `/xiaoliuren` | 小六壬占卜 |
| `/digital-energy` | 数字能量 |
| `/bazhai` | 八宅风水 |
| `/health` | 健康养生 |
| `/moments` | 朋友圈 |
| `/notifications` | 通知 |
| `/pay` | 支付页 |
| `/payment` | 支付结果 |
| `/share` | 报告分享 |

### 7.2 Admin 管理后台 (:3002) — React-Admin 29 个资源

| 资源 | 功能 |
|------|------|
| users | 用户管理 |
| charts | 命盘管理 |
| rules | 规则管理 |
| prompts | Prompt 管理 |
| reports | 报告管理 |
| orders | 订单管理 |
| products | 产品管理 |
| distributors | 分销商管理 |
| commissions | 佣金记录 |
| card-keys | 卡密管理 |
| balance-transactions | 余额交易 |
| chat-sessions | 聊天会话 |
| crm | CRM 客户管理 |
| consultations | 咨询订单 |
| masters | 命理师管理 |
| xiaoliuren | 小六壬记录 |
| digital-energy | 数字能量记录 |
| bazhai | 八宅风水记录 |
| bazhai-reports | 八宅报告 |
| health | 健康记录 |
| health-reports | 健康报告 |
| ai-config | AI 模型配置 |
| token-pricing | Token 定价 |
| token-usage | Token 用量 |
| site-config | 站点配置 |
| payment-config | 支付配置 |
| promotion-config | 推广配置 |
| sms-config | 短信配置 |
| ___tests___ | 测试 |

---

## 八、国学风设计系统（Design Tokens）

### 8.1 Tailwind 颜色系统 (`tailwind.config.ts`)

**五行颜色 (wx)**

| 五行 | CSS 类 | 色值 |
|------|--------|------|
| 木 Wood | `text-wx-wood` / `bg-wx-wood` | `#22c55e` |
| 火 Fire | `text-wx-fire` / `bg-wx-fire` | `#ef4444` |
| 土 Earth | `text-wx-earth` / `bg-wx-earth` | `#f59e0b` |
| 金 Metal | `text-wx-metal` / `bg-wx-metal` | `#eab308` |
| 水 Water | `text-wx-water` / `bg-wx-water` | `#3b82f6` |

**主题色板**

| 色板 | 用途 |
|------|------|
| `primary` (50-900) | 主色调（朱砂红系） |
| `gold` (50-900) | 金色（财富/尊贵） |
| `ink` (50-950) | 水墨色（背景/文字） |
| `chart` | 命盘专色（深色底+金 accent） |

**字体**

| 字体族 | CSS 类 | 用途 |
|--------|--------|------|
| 楷体 | `font-kai` | 标题/命盘天干地支 |
| 宋体 | `font-song` | 正文 |
| 展示体 | `font-display` | 首页大字 |

### 8.2 五行颜色渲染

- `PillarGrid.tsx` — 四柱天干地支颜色渲染
- `wuxing-utils.ts` — 天干地支五行查找工具
- `WuxingChart.tsx` — 五行力量图
- `ChartDisplay.tsx` — 标准 Tailwind 颜色
- `HealthPanel.tsx` — 内联 style 颜色

---

## 九、核心业务链路

### 9.1 排盘流程
```
Web 用户输入 → API (BaziService) → Python FastAPI (:8100/sxtwl) → 四柱干支/十神/格局/大运
                                        ↓
                                  lunisolar.js (预计算备选)
```

### 9.2 AI 报告生成
```
命盘数据 → RuleEngine (规则匹配 JSON) → AI Service (DeepSeek/MiniMax/OpenAI) → AnalysisReport
                ↓                                                   ↓
        rules/ 规则 JSON                                   prompts 模板 (A/B)
```

### 9.3 支付链路
```
下单 → 微信V3/支付宝 → 支付回调验签 → 订单状态更新 → 佣金结算(Distributor/Commission)
```

### 9.4 聊天链路
```
HTTP 创建会话 → Socket.IO WebSocket 实时消息 → Mem0/Qdrant 语义记忆持久化
```

### 9.5 配对系统
```
用户A发起配对请求 → 用户B接受 → 支付(可选) → 选取双方命盘 → AI分析 → 配对报告
                                                          ↓
                                              自我模式(Self): 单人无需B
```

---

## 十、环境变量配置

### API (`apps/api/.env`)

```env
# 数据库
DATABASE_URL=postgresql://postgres:123456@localhost:5432/shengri?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=dev-jwt-secret-for-local-testing
JWT_EXPIRES_IN=7d

# Calendar Engine
CALENDAR_ENGINE_URL=http://localhost:8100

# AI Provider (默认 deepseek)
DEFAULT_AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash

# Qdrant (Mem0)
QDRANT_URL=http://localhost:6333
MEM0_LLM_PROVIDER=openai
MEM0_LLM_MODEL=deepseek-v4-flash
MEM0_EMBEDDING_PROVIDER=ollama
MEM0_EMBEDDING_MODEL=nomic-embed-text
MEM0_EMBEDDING_BASE_URL=http://localhost:11434
MEM0_EMBEDDING_DIMS=768

# CORS
CORS_ORIGIN=http://localhost:3001,http://localhost:3002
WS_CORS_ORIGIN=http://localhost:3001
WEB_BASE_URL=https://sr.openedskill.com

# 阿里云短信
SMS_SIGN_NAME=生辰
SMS_TEMPLATE_CODE=xxx

# 微信支付
WECHAT_APP_ID=
WECHAT_MCH_ID=
WECHAT_API_KEY=
```

---

## 十一、启动指南

### 11.1 前置条件

1. PostgreSQL 16+ (端口 5432，数据库 `shengri`)
2. Redis 7+ (端口 6379)
3. Node.js >= 18 + pnpm >= 8
4. Python 3.11+ (用于历法引擎)
5. Qdrant (端口 6333，用于 Mem0 记忆)
6. Ollama (端口 11434，用于嵌入模型)

### 11.2 本地开发启动（无 Docker）

```bash
# 1. 安装依赖
pnpm install

# 2. 安装 Python 依赖
pip install -r apps/calendar-engine/requirements.txt

# 3. 同步数据库
cd apps/api && npx prisma db push && cd ../..

# 4. 启动历法引擎 (终端 1)
pnpm dev:calendar     # → localhost:8100

# 5. 启动 API (终端 2)
pnpm dev:api          # → localhost:3000, Swagger: /api/docs

# 6. 启动 Web (终端 3)
pnpm dev:web          # → localhost:3001

# 7. 启动 Admin (终端 4)
pnpm dev:admin        # → localhost:3002
```

### 11.3 Docker 启动

```bash
docker-compose up -d postgres redis  # 仅数据库
docker-compose up -d                 # 全部 7 个服务
```

### 11.4 可用脚本

```bash
pnpm dev:api         # 启动 API 开发服务器
pnpm dev:web         # 启动 Web 开发服务器
pnpm dev:admin       # 启动 Admin 开发服务器
pnpm dev:calendar    # 启动 Python 历法引擎
pnpm build:api       # 构建 API
pnpm build:web       # 构建 Web
pnpm build:admin     # 构建 Admin
pnpm db:migrate      # Prisma 迁移
pnpm db:seed         # 种子数据
pnpm lint            # 代码检查
pnpm test            # 运行测试
```

---

## 十二、关键文件索引

| 文件 | 说明 |
|------|------|
| `apps/api/src/main.ts` | API 入口（CORS、WebSocket、Swagger） |
| `apps/api/prisma/schema.prisma` | 完整数据模型 |
| `apps/api/src/app.module.ts` | 根模块导入 |
| `apps/web/src/app/layout.tsx` | Web 根布局 |
| `apps/web/tailwind.config.ts` | 国学风颜色系统 |
| `apps/admin/src/App.tsx` | Admin 资源配置 |
| `apps/calendar-engine/app/main.py` | 历法引擎入口 |
| `packages/shared/src/index.ts` | 共享类型 |
| `rules/` | 产品规则 JSON |
| `docker-compose.yml` | Docker 服务编排 |

---

## 十三、域名映射

| 本地 | 线上域名 | 用途 |
|------|----------|------|
| `localhost:3000` | `api.openedskill.com` | NestJS API |
| `localhost:3001` | `sr.openedskill.com` | Next.js Web |
| `localhost:3002` | `ht.openedskill.com` | Vite Admin |

---

> 最后更新: 2026-05-10
