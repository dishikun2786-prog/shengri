---
name: guoxue-fullstack
description: Full-stack development for Chinese traditional culture (国学风) themed SaaS platforms. Use when building metaphysics/divination/health apps with NestJS API + Next.js web + Vite admin, ink-paper design system, five-element colors, kai/song fonts, calculate→AI-report→payment business flow, JWT auth with login redirect, WeChat/Alipay integration. Trigger: 国学风, 八字, 命理, 占卜, 风水, 健康养生, traditional Chinese UI, ink-paper palette.
---

# 国学风全栈开发技能 · Guoxue Fullstack

Chinese traditional culture themed full-stack SaaS development skill. Covers monorepo architecture, design system, business module patterns, auth, payment, and AI integration.

## When to Use

- Building Chinese metaphysics / divination / health apps (八字, 小六壬, 风水, 数字能量, 五运六气)
- Need the 国学风 design system: warm ink-paper palette, kai/song fonts, five-element colors
- Implementing the "calculate → result → AI deep-dive → payment" business flow
- Setting up monorepo with NestJS API + Next.js web + React-Admin dashboard
- Need JWT auth with login redirect guard pattern
- Integrating WeChat Pay / Alipay with order management

---

## Tech Stack

```
Monorepo:     pnpm workspace (apps/* + packages/*)
API:          NestJS 10 + TypeScript + Prisma + PostgreSQL + Redis + Swagger
Web:          Next.js 14 (App Router) + Tailwind CSS 3 + Zustand + Socket.IO
Admin:        Vite + React-Admin 5 + MUI 5
AI Engine:    Python FastAPI (domain calculations) + OpenAI/DeepSeek/MiniMax (AI reports)
Vector DB:    Qdrant (semantic memory)
Infra:        Docker Compose, Cloudflare Tunnel
```

### Startup Sequence

```
1. PostgreSQL + Redis  →  docker-compose up -d postgres redis
2. Python engine       →  pnpm dev:calendar   (uvicorn --port 8100)
3. NestJS API          →  pnpm dev:api        (port 3000)
4. Web + Admin         →  pnpm dev:web / dev:admin  (ports 3001, 3002)
```

---

## Design System — 国学风

### Color Palette (Tailwind)

```ts
// tailwind.config.ts → theme.extend.colors

// 主色 Primary — 朱砂红 Cinnabar Red
primary: {
  50: '#fdf4f0', 100: '#fce8dd', 200: '#f8d0bb', 300: '#f3b099',
  400: '#eb885d', 500: '#dc5a2e', 600: '#c44520', 700: '#a3361d',
  800: '#842e1d', 900: '#6d2a1c',
}

// 金色 Gold — emphasis, CTAs
gold: {
  50: '#fdfae8', 100: '#fbf2c4', 200: '#f8e48a', 300: '#f5d04c',
  400: '#f0bb22', 500: '#dca310', 600: '#be7e0a', 700: '#975a0d',
  800: '#7d4712', 900: '#6a3b15',
}

// 墨色 Ink — text/border/background neutral (warm, NOT cool gray)
ink: {
  50: '#f6f5f3', 100: '#e8e4dd', 200: '#d1c9bd', 300: '#b5a898',
  400: '#9e8e7e', 500: '#8b806f', 600: '#7a6f60', 700: '#63594e',
  800: '#534b42', 900: '#474037', 950: '#2d251e',
}

// 五行 Wuxing — five element visualization colors
wx: {
  wood: '#22c55e',   // 木 — green
  fire: '#ef4444',   // 火 — red
  earth: '#f59e0b',  // 土 — amber
  metal: '#eab308',  // 金 — yellow
  water: '#3b82f6',  // 水 — blue
}

// 命盘图表深色主题 Chart Dark Theme
chart: {
  bg: '#2a2018', surface: '#3a2e22', border: '#5a4a3a',
  text: '#e8ddd3', muted: '#9e8e7e', accent: '#d4a84b',
}
```

### Font Stack

```css
/* Display — hand-written style for hero titles */
--font-display: 'Ma Shan Zheng', 'ZCOOL XiaoWei', '楷体', serif;

/* Kai — primary body font, Chinese traditional */
--font-kai: 'ZCOOL XiaoWei', '楷体', 'KaiTi', 'STKaiti', serif;

/* Song — alternate serif */
--font-song: '宋体', 'SimSun', 'STSong', serif;
```

Google Fonts imports in `layout.tsx`:
```
Ma Shan Zheng, ZCOOL XiaoWei, Noto Serif SC
```

### CSS Component Classes (globals.css)

```css
/* Card */
.card { @apply bg-white rounded-2xl shadow-sm border border-ink-100 p-6; }

/* Buttons */
.btn-primary { @apply bg-primary-500 text-white rounded-xl px-6 py-3 font-kai
  shadow-md hover:bg-primary-600 hover:shadow-lg active:scale-[0.98]
  transition-all disabled:opacity-50; }

.btn-gold { @apply bg-gradient-to-r from-gold-500 to-gold-600 text-white
  rounded-xl px-6 py-3 font-kai font-bold shadow-md
  hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50; }

.btn-outline { @apply border-2 border-primary-300 text-primary-600
  rounded-xl px-6 py-3 font-kai bg-transparent
  hover:bg-primary-50 transition-all; }

/* Input */
.input-field { @apply w-full rounded-xl border border-ink-200 bg-white
  px-4 py-3 text-ink-700 placeholder:text-ink-300
  focus:outline-none focus:ring-2 focus:ring-primary-200
  focus:border-primary-300 transition-all; }

/* Pillar display (四柱) */
.pillar-box { @apply flex flex-col items-center gap-1 p-3
  rounded-xl border border-ink-100 min-w-[72px]; }
.gan-text { @apply text-2xl font-bold font-kai; }
.zhi-text { @apply text-2xl font-bold font-kai; }
```

### Root CSS Variables

```css
:root {
  --bg-primary: #fdf8f4;     /* warm paper white */
  --bg-card: #ffffff;
  --text-primary: #2d1f14;    /* deep ink brown */
  --text-secondary: #6b5b4f;
  --border-color: #e8ddd3;
  --accent: #dc5a2e;          /* cinnabar red */
  --gold: #dca310;
}
```

### Tai Chi / Yin-Yang Symbol (Pure CSS)

Three sizes via CSS background gradients and pseudo-elements:
- `.taiji` — 80px (standard icon)
- `.taiji-sm` — 48px
- `.taiji-xs` — 24px

Implementation: left-right split linear-gradient + `::after` circle with radial-gradient.

### Animations

```css
.animate-fade-in     { animation: fade-in 0.3s ease-out; }
.animate-slide-up    { animation: slide-up 0.4s ease-out; }
.animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
.skeleton-shimmer    { background: linear-gradient(90deg, #e8e4dd 25%, #f6f5f3 50%, #e8e4dd 75%); }
.pulse-ring          { animation: pulse-ring 1.5s ease-out infinite; }
.float-particle      { animation: float-particle 3s ease-in-out infinite; }
```

---

## Project Structure Template

```
project-root/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # DB schema (User, Chart, Report, Order, Product...)
│   │   │   └── seed.ts
│   │   └── src/
│   │       ├── main.ts         # Bootstrap, Swagger, CORS, Cloudflare proxy
│   │       ├── app.module.ts   # Root module imports
│   │       ├── common/         # Redis, calculators, guards, interceptors
│   │       └── modules/        # One folder per domain module
│   │           ├── auth/       # JWT + SMS login/register
│   │           ├── user/       # Profile, charts, reports CRUD
│   │           ├── bazi/       # Chart calculation endpoints
│   │           ├── report/     # AI report generation + share
│   │           ├── order/      # Products, orders
│   │           ├── payment/    # WeChat V3 + Alipay callbacks
│   │           ├── chat/       # HTTP session + Socket.IO WebSocket
│   │           ├── xiaoliuren/ # 小六壬 calculation + report
│   │           ├── digital-energy/ # 数字能量
│   │           ├── bazhai/     # 八宅风水
│   │           ├── health-report/ # 五运六气 health analysis
│   │           ├── pairing/    # 合婚/配对 system
│   │           ├── ai/         # Multi-provider AI service
│   │           ├── notification/
│   │           └── admin/      # Admin dashboard API
│   │
│   ├── web/                    # Next.js 14 (App Router)
│   │   ├── tailwind.config.ts  # Colors, fonts, extend
│   │   ├── next.config.js      # API rewrite proxy
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx   # Root layout (fonts, metadata)
│   │       │   ├── globals.css  # Root vars, .card, .btn-*, .input-field, animations
│   │       │   ├── page.tsx     # Home (八字排盘 form + products)
│   │       │   ├── login/       # Password + SMS login
│   │       │   ├── register/    # Registration with captcha
│   │       │   ├── chart/[id]/  # Bazi chart detail page
│   │       │   ├── report/[uuid]/      # Report detail with AI chat
│   │       │   ├── report/generating/[chartId]/ # Report generation + payment
│   │       │   ├── xiaoliuren/         # 小六壬 input + result
│   │       │   ├── xiaoliuren/report/[uuid]/
│   │       │   ├── digital-energy/     # Digital energy input + result
│   │       │   ├── digital-energy/report/[uuid]/
│   │       │   ├── bazhai/             # 八宅风水 input + result
│   │       │   ├── bazhai/report/[uuid]/
│   │       │   ├── health/             # Health analysis input + result
│   │       │   ├── health/report/[uuid]/
│   │       │   ├── products/    # Product listing + purchase
│   │       │   ├── profile/     # User profile + report history
│   │       │   ├── pairing/     # 配对 system
│   │       │   ├── chat/        # Chat sessions
│   │       │   └── share/[token]/ # Shared report
│   │       ├── components/
│   │       │   ├── AuthNav.tsx          # Auth state (login/avatar/logout)
│   │       │   ├── CityPicker.tsx       # City search for true solar time
│   │       │   ├── PaymentMethodSelector.tsx  # WeChat/Alipay modal
│   │       │   ├── chart/              # Bazi visualization components
│   │       │   │   ├── ChartLayout.tsx
│   │       │   │   ├── PillarGrid.tsx   # 四柱 color rendering
│   │       │   │   ├── wuxing-utils.ts  # GAN_WUXING, ZHI_WUXING lookups
│   │       │   │   └── WuxingChart.tsx  # Five-element strength chart
│   │       │   ├── xiaoliuren/
│   │       │   │   └── PalmDiagram.tsx  # Palm position SVG diagram
│   │       │   ├── report/
│   │       │   └── pairing/
│   │       ├── hooks/
│   │       │   ├── useSocket.ts
│   │       │   └── useAddToHomeScreen.ts
│   │       └── lib/
│   │           ├── api.ts       # All API calls, axios interceptors, types
│   │           └── constants.ts # Report type labels
│   │
│   ├── admin/                   # React-Admin dashboard
│   │   └── src/
│   │       ├── App.tsx          # Admin resources registration
│   │       ├── constants.ts
│   │       └── resources/       # CRUD resources (reports, users, orders...)
│   │
│   └── calendar-engine/         # Python FastAPI domain engine
│       └── app/
│           ├── main.py
│           ├── core/
│           │   ├── constants.py       # 天干地支, 五行, 纳音, 神煞
│           │   └── pillar_calculator.py  # Solar→lunar, 四柱, 大运, 流年
│           └── routers/
│
├── packages/
│   └── shared/                  # Shared TypeScript types
│       └── src/
│           └── index.ts         # BaziChart, Report, Order, Product types
│
├── docs/                        # Technical docs
├── rules/                       # Business rules JSON (八字, 合婚, 神煞)
├── docker-compose.yml           # postgres, redis, qdrant, etc.
├── package.json                 # Root workspace scripts
└── pnpm-workspace.yaml
```

---

## Business Module Pattern

Every "calculate" feature follows this pattern:

### 1. Page Structure (Next.js)

```
apps/web/src/app/<feature-name>/
├── page.tsx              # Input form + result display + AI CTA
└── report/[uuid]/
    └── page.tsx          # AI report detail view
```

### 2. Page Component Anatomy

```tsx
'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { <feature>Api, orderApi } from '@/lib/api';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';

function FeaturePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── State ──
  const [inputFields, setInputFields] = useState({...});  // Form inputs
  const [result, setResult] = useState<any>(null);          // Calculation result
  const [loading, setLoading] = useState(false);            // Calculate spinner
  const [generating, setGenerating] = useState(false);      // AI generate spinner
  const [showPayment, setShowPayment] = useState(false);    // Payment modal
  const [orderNo, setOrderNo] = useState('');
  const [orderAmount, setOrderAmount] = useState(0);
  const [paidViaProduct, setPaidViaProduct] = useState(false);
  const [paidOrderNo, setPaidOrderNo] = useState('');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Read paid params from product page redirect
  useEffect(() => {
    const paid = searchParams?.get('paid') || '';
    const order = searchParams?.get('orderNo') || '';
    if (paid === '1' && order) { setPaidViaProduct(true); setPaidOrderNo(order); }
  }, [searchParams]);

  // ── Calculate: MUST check auth ──
  async function handleCalculate() {
    if (!token) { router.push('/login?redirect=/<feature>'); return; }
    setLoading(true);
    try {
      const res = await <feature>Api.calculate(payload);
      setResult(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || '计算失败');
    } finally { setLoading(false); }
  }

  // ── Generate AI Report: login → order → pay → generate ──
  async function handleGenerateReport() {
    if (!token) { router.push('/login?redirect=/<feature>'); return; }
    if (!paidViaProduct) {
      // Find product, create order, show payment
      setGenerating(true);
      const productsRes = await orderApi.getProducts();
      const product = (productsRes.data as any[])?.find(p => p.reportType === '<type>');
      const orderRes = await orderApi.create({ productId: product.id });
      setOrderNo(orderRes.data.orderNo);
      setOrderAmount(orderRes.data.paidAmount || product.currentPrice || 39);
      setShowPayment(true);
      setGenerating(false);
      return;
    }
    // Already paid: generate report + poll
    setGenerating(true);
    <feature>Api.generateReport({...payload, isPaid: true, orderNo: paidOrderNo})
      .then(res => { if (res?.data?.uuid) router.push(`/<feature>/report/${res.data.uuid}`); })
      .catch(() => {});
    pollForReport();  // Poll every 3s for 60 attempts (bypass Cloudflare 100s timeout)
  }

  // ── Payment success callback ──
  async function handlePaymentSuccessAndGenerate() {
    setShowPayment(false);
    setPaidViaProduct(true);
    setGenerating(true);
    <feature>Api.generateReport({...payload, isPaid: true, orderNo})
      .then(res => { if (res?.data?.uuid) router.push(`/<feature>/report/${res.data.uuid}`); })
      .catch(() => {});
    pollForReport();
  }

  // ── Polling fallback (Cloudflare 100s timeout workaround) ──
  function pollForReport() {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await <feature>Api.getHistory(0, 5);
        const match = (res.data as any)?.records?.find(r => r.reportUuid);
        if (match) { clearInterval(interval); router.push(`/<feature>/report/${match.reportUuid}`); }
      } catch {}
      if (attempts >= 60) { clearInterval(interval); setGenerating(false); alert('报告生成超时'); }
    }, 3000);
  }

  // ── Render ──
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-ink-800 font-kai">功能标题</h1>
        <p className="text-ink-400 mt-2 font-kai">副标题描述</p>
      </div>

      {/* Usage Guide Card (wuxing-colored) */}
      <div className="mb-6 rounded-2xl border border-<color>-100
        bg-gradient-to-br from-<color>-50/60 to-white p-5">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">🔮</span>
          <div>
            <h3 className="font-bold text-<color>-800 font-kai text-sm">功能能帮你做什么？</h3>
            <p className="text-xs text-ink-500 mt-0.5">功能描述</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-<color>-50 text-<color>-700
            text-xs font-kai border border-<color>-100">标签1</span>
          {/* more tags */}
        </div>
      </div>

      {/* Input Card */}
      <div className="card animate-fade-in">
        {/* Form inputs */}
        <button onClick={handleCalculate} disabled={loading}
          className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r
            from-primary-600 to-gold-500 text-white font-kai text-lg
            font-bold shadow-md hover:shadow-lg transition-all
            disabled:opacity-50">
          {loading ? '分析中...' : '开始测算'}
        </button>
      </div>

      {/* Result Display */}
      {result && (
        <div className="mt-8 space-y-6 animate-fade-in">
          {/* Result cards */}

          {/* AI CTA Card */}
          <div className="card bg-gradient-to-br from-primary-50/50 to-gold-50/50
            border-primary-100/40 text-center">
            <div className="text-2xl mb-2">🔮</div>
            <h3 className="text-lg font-bold text-primary-700 font-kai mb-1">AI 深度解读</h3>
            <p className="text-sm text-ink-500 mb-4">AI深度解读描述</p>
            <button onClick={handleGenerateReport} disabled={generating}
              className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-primary-600
                to-primary-700 text-white font-kai font-bold shadow-md
                hover:shadow-lg transition-all disabled:opacity-50">
              {generating ? '生成中...' : (token ? '查看AI深度解读' : '登录查看AI解读')}
            </button>
            {!token && (
              <p className="text-xs text-ink-400 mt-2">新用户每日免费1次AI解读</p>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <PaymentMethodSelector
          orderNo={orderNo}
          amount={orderAmount}
          onSuccess={handlePaymentSuccessAndGenerate}
          onCancel={() => setShowPayment(false)}
        />
      )}

      {/* Footer */}
      <div className="mt-12 text-center text-xs text-ink-300">
        <p>免责声明文案</p>
        <p className="mt-1">© 生辰 · 传承国学智慧</p>
      </div>
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function FeaturePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <FeaturePageInner />
    </Suspense>
  );
}
```

### 3. Color Assignment Per Feature

| Feature | Guide Card Border | Tag bg/text | AI CTA Gradient |
|---------|-------------------|-------------|-----------------|
| 八字排盘 | primary | primary | primary→gold |
| 小六壬 | amber | amber | primary→gold |
| 数字能量 | blue | blue | primary→gold |
| 八宅风水 | emerald | emerald | primary→gold |
| 健康养生 | green | green | green→emerald |

### 4. API Layer Pattern (api.ts)

```ts
// All APIs in apps/web/src/lib/api.ts

// Axios instance with JWT interceptor
const api = axios.create({ baseURL, timeout: 30000 });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
// Auto-redirect to login on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    return Promise.reject(err);
  }
);

// AI generation uses extended timeout (10 min)
const AI_TIMEOUT = 600000;
export const healthAiApi = {
  post: (url, data, config) => api.post(url, data, { ...config, timeout: AI_TIMEOUT }),
};

// Each feature gets its own API object
export const <feature>Api = {
  calculate: (data) => api.post('/<feature>/calculate', data),
  generateReport: (data) => api.post('/<feature>/report/generate', data, { timeout: AI_TIMEOUT }),
  getReport: (uuid) => api.get(`/<feature>/report/${uuid}`),
  getHistory: (skip, take) => api.get('/<feature>/history', { params: { skip, take } }),
  delete: (id) => api.delete(`/<feature>/${id}`),
};
```

---

## Authentication Pattern

### Login Guard (Every Calculate Button)

```tsx
async function handleCalculate() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) {
    router.push('/login?redirect=/current-page-path');
    return;
  }
  // ... proceed with calculation
}
```

### Auth State Component (AuthNav.tsx)

```tsx
// Three-state loading: undefined=loading, null=guest, object=logged-in
const [user, setUser] = useState<any>(undefined);

// Cross-tab sync via custom event + storage event
window.addEventListener('auth-state-change', checkAuth);
window.addEventListener('storage', (e) => { if (e.key === 'token') checkAuth(); });

// Export dispatch function for login/register pages
export function dispatchAuthChange() {
  window.dispatchEvent(new Event('auth-state-change'));
}
```

### Login Page (login/page.tsx)

- Two modes: password login + SMS login (tabs)
- Redux pattern: `localStorage.setItem('token', data.token)` + `dispatchAuthChange()` + `router.push('/')`
- If phone not registered, redirect to `/register?phone=xxx`

---

## Payment Flow

```
User clicks "查看AI深度解读"
  → Check login → not logged in → /login?redirect=/feature
  → Check paidViaProduct → no
    → orderApi.getProducts() → find matching product by reportType
    → orderApi.create({ productId })
    → Show PaymentMethodSelector modal
      → WeChat扫码 / Alipay / Balance
      → onSuccess → setPaidViaProduct(true) → generateReport
    → Report UUID returned → router.push to report page
  → If paidViaProduct → generateReport directly

Fallback: If Cloudflare 100s timeout, poll getHistory every 3s for 3 min
  → Match by input params + reportUuid → navigate when found
```

### Payment Method Selector Component

Reusable modal component that:
1. Fetches enabled payment methods from `/config/payment-methods`
2. Renders WeChat QR code / Alipay redirect / Balance pay
3. Polls `/payment/status/{orderNo}` every 2s
4. Calls `onSuccess` when payment confirmed

---

## API Module Template (NestJS)

```
apps/api/src/modules/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts     # @Controller('<feature>')
├── <feature>.service.ts        # Business logic
└── dto/
    └── <feature>.dto.ts        # class-validator DTOs
```

### Controller Pattern

```ts
@Controller('xiaoliuren')
export class XiaoliurenController {
  @Post('calculate')       // Free calculation (requires auth)
  @Post('report/generate') // Paid AI report generation (requires auth)
  @Get('report/:uuid')     // Get report
  @Get('history')          // User's calculation history
  @Delete(':id')           // Delete record
}
```

### Prisma Schema Additions

```prisma
model FeatureRecord {
  id        Int      @id @default(autoincrement())
  uuid      String   @unique @default(uuid())
  userId    Int
  // Input fields
  // Output fields (as JSON)
  reportUuid String?
  report     AnalysisReport? @relation(...)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

---

## Five Element System (五行)

### Mappings

```ts
// 天干 → 五行
const GAN_WUXING: Record<string, string> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

// 地支 → 五行
const ZHI_WUXING: Record<string, string> = {
  '寅': '木', '卯': '木',
  '巳': '火', '午': '火',
  '申': '金', '酉': '金',
  '亥': '水', '子': '水',
  '辰': '土', '丑': '土', '未': '土', '戌': '土',
};

// Tailwind class lookup
const WUXING_COLORS: Record<string, string> = {
  '木': 'text-wx-wood', '火': 'text-wx-fire',
  '土': 'text-wx-earth', '金': 'text-wx-metal', '水': 'text-wx-water',
};
```

---

## Quality Checklist

When building a new feature following this skill:

- [ ] `handleCalculate` checks `token` before API call, redirects to `/login?redirect=/<feature>`
- [ ] Page wrapped in `<Suspense>` if using `useSearchParams()`
- [ ] Usage guide card uses feature-specific color (amber/blue/emerald/green)
- [ ] AI CTA card uses `bg-gradient-to-br from-primary-50/50 to-gold-50/50`
- [ ] Tags use wuxing-colored bg/border (e.g., `bg-amber-50 text-amber-700 border-amber-100`)
- [ ] Payment flow: getProducts → find by reportType → create order → show PaymentMethodSelector
- [ ] Poll fallback for Cloudflare 100s timeout (3s interval, 60 attempts)
- [ ] Footer includes disclaimer + `© 生辰 · 传承国学智慧`
- [ ] All headings use `font-kai`, body text uses `text-ink-*` colors
- [ ] Primary CTA uses `bg-gradient-to-r from-primary-600 to-gold-500`
- [ ] API client in `lib/api.ts` with separate entry per feature
- [ ] NestJS module follows standard structure (module/controller/service/dto)
- [ ] Prisma model includes uuid, userId relation, input/output fields, report relation
- [ ] Custom colors defined in `tailwind.config.ts` with all shades (50-900+)
