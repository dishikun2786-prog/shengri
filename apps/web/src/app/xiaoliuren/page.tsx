'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { xiaoliurenApi, orderApi } from '@/lib/api';
import PalmDiagram, { POSITIONS } from '@/components/xiaoliuren/PalmDiagram';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';

/** 公历日期转农历月日（使用 lunisolar 库） */
async function getLunarDate(date?: Date): Promise<{ month: number; day: number }> {
  const d = date || new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  try {
    const lunisolar = (await import('lunisolar')).default;
    const ls = lunisolar(dateStr);
    return { month: ls.lunar.month, day: ls.lunar.day };
  } catch {
    // 如果 lunisolar 加载失败，回退到公历月日
    return { month: d.getMonth() + 1, day: d.getDate() };
  }
}

interface PalmResult {
  position: number;
  name: string;
  wuxing: string;
  luckLevel: string;
  direction: string;
  mainAffair: string;
  bodyAffair: string;
  travelAffair: string;
  seekingAffair: string;
  lostAffair: string;
  detailedText: string;
}

const HOUR_OPTIONS = [
  { label: '子时 23-1', value: 0 }, { label: '丑时 1-3', value: 2 },
  { label: '寅时 3-5', value: 4 }, { label: '卯时 5-7', value: 6 },
  { label: '辰时 7-9', value: 8 }, { label: '巳时 9-11', value: 10 },
  { label: '午时 11-13', value: 12 }, { label: '未时 13-15', value: 14 },
  { label: '申时 15-17', value: 16 }, { label: '酉时 17-19', value: 18 },
  { label: '戌时 19-21', value: 20 }, { label: '亥时 21-23', value: 22 },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const LUCK_LABELS: Record<string, string> = {
  '大吉': 'bg-green-100 text-green-700 border-green-200',
  '中吉': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '小吉': 'bg-teal-100 text-teal-700 border-teal-200',
  '凶': 'bg-orange-100 text-orange-700 border-orange-200',
  '大凶': 'bg-red-100 text-red-700 border-red-200',
};

export default function XiaoliurenPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paidViaProduct, setPaidViaProduct] = useState(false);
  const [paidOrderNo, setPaidOrderNo] = useState('');

  // 读取产品购买后的支付参数
  useEffect(() => {
    const paid = searchParams?.get('paid') || '';
    const order = searchParams?.get('orderNo') || '';
    if (paid === '1' && order) {
      setPaidViaProduct(true);
      setPaidOrderNo(order);
    }
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<'time' | 'random'>('time');
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [day, setDay] = useState(() => new Date().getDate());
  const [hour, setHour] = useState(() => {
    const h = new Date().getHours();
    return Math.floor(h / 2) * 2;
  });
  const [r1, setR1] = useState<number | ''>(3);
  const [r2, setR2] = useState<number | ''>(5);
  const [r3, setR3] = useState<number | ''>(1);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PalmResult | null>(null);
  const [steps, setSteps] = useState<any>(null);
  const [path, setPath] = useState<{ from: string; to: string; label: string }[] | null>(null);
  const [inputDetail, setInputDetail] = useState<any>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [orderNo, setOrderNo] = useState('');
  const [orderAmount, setOrderAmount] = useState(0);
  const [lunarDate, setLunarDate] = useState<{ month: number; day: number } | null>(null);

  const userToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const isLoggedIn = !!userToken;

  // 初始化时加载当前农历日期
  useEffect(() => {
    getLunarDate().then(d => {
      setLunarDate(d);
      setMonth(d.month);
      setDay(d.day);
    });
  }, []);

  async function handleCalculate() {
    if (!isLoggedIn) {
      router.push('/login?redirect=/xiaoliuren');
      return;
    }
    setLoading(true);
    try {
      const payload: any = { inputType: activeTab };
      if (activeTab === 'time') {
        payload.month = month;
        payload.day = day;
        payload.hour = hour;
      } else {
        payload.random1 = Number(r1);
        payload.random2 = Number(r2);
        payload.random3 = Number(r3);
      }
      if (question.trim()) payload.question = question.trim();

      const res = await xiaoliurenApi.calculate(payload);
      const data = res.data as any;
      setResult(data.result);
      setSteps(data.steps || null);
      setPath(data.path || null);
      setInputDetail(data.inputDetail);
    } catch (err: any) {
      alert(err?.response?.data?.message || '推算失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReport() {
    if (!isLoggedIn) {
      router.push('/login?redirect=/xiaoliuren');
      return;
    }

    // 如果通过产品页支付过，直接生成；否则走支付流程
    if (!paidViaProduct) {
      // 未支付：创建订单 → 支付 → 再生成
      setGeneratingReport(true);
      try {
        // 查找小六壬产品
        const productsRes = await orderApi.getProducts();
        const products = (productsRes.data as any[]) || [];
        const xlrProduct = products.find((p: any) => p.reportType === 'xiaoliuren');
        if (!xlrProduct) {
          alert('小六壬产品未配置，请联系客服');
          setGeneratingReport(false);
          return;
        }
        const orderRes = await orderApi.create({ productId: xlrProduct.id });
        const orderData = orderRes.data as any;
        if (orderData.orderNo) {
          setOrderNo(orderData.orderNo);
          setOrderAmount(Number(orderData.paidAmount || orderData.amount || xlrProduct.currentPrice || 39));
          setGeneratingReport(false);
          setShowPayment(true);
        }
      } catch (err: any) {
        alert(err?.response?.data?.message || '创建订单失败');
        setGeneratingReport(false);
      }
      return;
    }

    // 已支付：直接生成AI报告
    setGeneratingReport(true);
    try {
      const payload: any = { inputType: activeTab, isPaid: true, orderNo: paidOrderNo };
      if (activeTab === 'time') {
        payload.month = month; payload.day = day; payload.hour = hour;
      } else {
        payload.random1 = Number(r1); payload.random2 = Number(r2); payload.random3 = Number(r3);
      }
      if (question.trim()) payload.question = question.trim();

      const res = await xiaoliurenApi.generateReport(payload);
      const data = res.data as any;
      if (data.uuid) {
        router.push(`/xiaoliuren/report/${data.uuid}`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || '报告生成失败';
      alert(msg);
    } finally {
      setGeneratingReport(false);
    }
  }

  async function handlePaymentSuccessAndGenerate() {
    setShowPayment(false);
    setPaidViaProduct(true);
    // 支付成功后直接生成
    setGeneratingReport(true);
    try {
      const payload: any = { inputType: activeTab, isPaid: true, orderNo };
      if (activeTab === 'time') {
        payload.month = month; payload.day = day; payload.hour = hour;
      } else {
        payload.random1 = Number(r1); payload.random2 = Number(r2); payload.random3 = Number(r3);
      }
      if (question.trim()) payload.question = question.trim();

      const res = await xiaoliurenApi.generateReport(payload);
      const data = res.data as any;
      if (data.uuid) {
        router.push(`/xiaoliuren/report/${data.uuid}`);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || '报告生成失败');
    } finally {
      setGeneratingReport(false);
    }
  }

  async function handleUseCurrentTime() {
    const now = new Date();
    const lunar = await getLunarDate(now);
    setMonth(lunar.month);
    setDay(lunar.day);
    setLunarDate(lunar);
    setHour(Math.floor(now.getHours() / 2) * 2);
  }

  function handleRandomNumbers() {
    setR1(Math.ceil(Math.random() * 6));
    setR2(Math.ceil(Math.random() * 6));
    setR3(Math.ceil(Math.random() * 6));
  }

  function getHourLabel(h: number) {
    const opt = HOUR_OPTIONS.find(o => o.value === h);
    return opt ? opt.label : `${h}时`;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6 animate-fade-in">
        <h1 className="text-3xl font-bold text-ink-800 font-kai">小六壬 · 马前课</h1>
        <p className="text-ink-400 mt-2 font-kai">掐指一算，预知吉凶</p>
      </div>

      {/* 使用引导 */}
      <div className="mb-6 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-white p-5 animate-fade-in">
        <div className="flex items-start gap-3 mb-3"><span className="text-2xl">☯</span><div><h3 className="font-bold text-amber-800 font-kai text-sm">小六壬能帮你算什么？</h3><p className="text-xs text-ink-500 mt-0.5">传统马前课掐指算法，通过月日时或随机数推算，即时预知事情吉凶趋势</p></div></div>
        <div className="flex flex-wrap gap-2"><span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-kai border border-amber-100">🔍 寻物失物</span><span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-kai border border-amber-100">✈️ 出行吉凶</span><span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-kai border border-amber-100">💰 求财方向</span><span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-kai border border-amber-100">📋 办事成败</span><span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-kai border border-amber-100">💑 姻缘感情</span></div>
      </div>

      {/* Tab Switch */}
      <div className="flex bg-ink-50/60 rounded-xl p-1 mb-6">
        {(['time', 'random'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setResult(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-ink-400 hover:text-ink-600'
            }`}
          >
            {tab === 'time' ? '时间推算' : '随机数推算'}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="card animate-fade-in">
        {activeTab === 'time' ? (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-ink-400 mb-1.5 font-medium">月份</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>农历{m}月</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-ink-400 mb-1.5 font-medium">日期</label>
                <select
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>农历{d}日</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-ink-400 mb-1.5 font-medium">时辰</label>
                <select
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300"
                >
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h.value} value={h.value}>{h.label}时</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleUseCurrentTime}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              ↻ 使用当前时间
            </button>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-ink-400 mb-1.5 font-medium">上数</label>
                <input
                  type="number" min={1} max={6} value={r1}
                  onChange={(e) => setR1(e.target.value === '' ? '' : Math.min(6, Math.max(1, Number(e.target.value))))}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-center text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300"
                  placeholder="1-6"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-400 mb-1.5 font-medium">中数</label>
                <input
                  type="number" min={1} max={6} value={r2}
                  onChange={(e) => setR2(e.target.value === '' ? '' : Math.min(6, Math.max(1, Number(e.target.value))))}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-center text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300"
                  placeholder="1-6"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-400 mb-1.5 font-medium">下数</label>
                <input
                  type="number" min={1} max={6} value={r3}
                  onChange={(e) => setR3(e.target.value === '' ? '' : Math.min(6, Math.max(1, Number(e.target.value))))}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-center text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300"
                  placeholder="1-6"
                />
              </div>
            </div>
            <button
              onClick={handleRandomNumbers}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              🎲 随机生成
            </button>
          </div>
        )}

        {/* Question */}
        <div className="mt-5 pt-4 border-t border-ink-100">
          <label className="block text-xs text-ink-400 mb-1.5 font-medium">
            所问何事 <span className="text-ink-300 font-normal">（选填）</span>
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="输入你想占卜的事情，如：今日出行是否顺利..."
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-700 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300"
          />
        </div>

        {/* Calculate Button */}
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-gold-500 text-white font-kai text-lg font-bold shadow-md hover:shadow-lg hover:from-primary-700 hover:to-gold-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              掐指推算中...
            </span>
          ) : '开始测算'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="mt-8 animate-fade-in space-y-6">
          {/* Palm Diagram */}
          <div className="card">
            <h2 className="text-lg font-bold text-ink-700 font-kai text-center mb-4">
              {activeTab === 'time' ? (
                <>农历{month}月{day}日 {getHourLabel(hour)}时 · 掌诀落位</>
              ) : (
                <>上数{r1} 中数{r2} 下数{r3} · 掌诀落位</>
              )}
            </h2>
            <PalmDiagram activePosition={result.position} steps={steps} path={path ?? undefined} size="md" />
          </div>

          {/* Result Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold font-kai text-ink-800">{result.name}</h3>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium border ${LUCK_LABELS[result.luckLevel] || 'bg-ink-100 text-ink-600 border-ink-200'}`}>
                  {result.luckLevel}
                </span>
              </div>
              <div className="text-right text-sm text-ink-400">
                <div>五行：<span className="font-medium text-ink-600">{result.wuxing}</span></div>
                <div>六神：<span className="font-medium text-ink-600">{(result as any).liushen || ''}</span></div>
                <div>方位：<span className="font-medium text-ink-600">{result.direction}</span></div>
              </div>
            </div>

            {/* Detail grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: '主事', value: result.mainAffair },
                { label: '身体', value: result.bodyAffair },
                { label: '行人', value: result.travelAffair },
                { label: '谋事', value: result.seekingAffair },
                { label: '失物', value: result.lostAffair },
              ].map((item) => (
                <div key={item.label} className="px-3 py-2 bg-ink-50/50 rounded-lg">
                  <span className="text-xs text-ink-400">{item.label}</span>
                  <p className="text-sm text-ink-700 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Detailed text */}
            <div className="p-4 bg-gold-50/50 rounded-xl border border-gold-100/60">
              <p className="text-sm text-ink-600 leading-relaxed font-kai whitespace-pre-wrap">
                {result.detailedText}
              </p>
            </div>
          </div>

          {/* AI Interpretation CTA */}
          <div className="card bg-gradient-to-br from-primary-50/50 to-gold-50/50 border-primary-100/40">
            <div className="text-center">
              <div className="text-2xl mb-2">🔮</div>
              <h3 className="text-lg font-bold text-primary-700 font-kai mb-1">AI 深度解读</h3>
              <p className="text-sm text-ink-500 mb-4">
                结合{question ? '您的问题' : '掌诀属性'}，AI命理师为您提供专业解读和行动建议
              </p>
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-kai font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {generatingReport ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    AI解读生成中...
                  </span>
                ) : (
                  isLoggedIn ? '查看AI深度解读' : '登录查看AI解读'
                )}
              </button>
              {!isLoggedIn && (
                <p className="text-xs text-ink-400 mt-2">新用户每日免费1次AI解读</p>
              )}
            </div>
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
        <p>小六壬为传统民间占卜术，结果仅供参考</p>
        <p className="mt-1">© 生辰 ShengRi · 传承国学智慧</p>
      </div>
    </div>
  );
}
