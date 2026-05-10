'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { baziApi, userApi, orderApi, type ChartRequest, type ChartResponse } from '@/lib/api';
import api from '@/lib/api';
import ChartLayout from '@/components/chart/ChartLayout';
import CityPicker, { type CitySelection } from '@/components/CityPicker';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const labels = [
    '子时(23-01)', '丑时(01-03)', '丑时(01-03)', '寅时(03-05)', '寅时(03-05)',
    '卯时(05-07)', '卯时(05-07)', '辰时(07-09)', '辰时(07-09)', '巳时(09-11)',
    '巳时(09-11)', '午时(11-13)', '午时(11-13)', '未时(13-15)', '未时(13-15)',
    '申时(15-17)', '申时(15-17)', '酉时(17-19)', '酉时(17-19)', '戌时(19-21)',
    '戌时(19-21)', '亥时(21-23)', '亥时(21-23)', '子时(23-01)',
  ];
  return { value: i, label: `${i.toString().padStart(2, '0')}:00 ${labels[i]}` };
});

const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const LUNAR_MONTH_NAMES = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月',
];

interface ProductItem {
  id: number;
  productCode: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  category: string;
  reportType: string | null;
  originalPrice: number;
  currentPrice: number;
}

interface PendingOrder {
  productId: number;
  orderNo: string;
  amount: number;
  reportType: string;
}

// Fallback products shown while API loads — prices replaced by backend-synced values on mount
const PRODUCT_CARDS: Array<{ type: string; icon: string; name: string; desc: string; hot?: boolean }> = [
  { type: 'full', icon: '🔮', name: '全方位深度命盘', desc: '5000字+ 财运/婚姻/事业/健康 全维度分析', hot: true },
  { type: 'wealth', icon: '💰', name: '财运深度分析', desc: 'AI深度解读，盲派直断财富层次与爆发年份' },
  { type: 'marriage', icon: '💑', name: '婚姻感情分析', desc: '盲派婚姻直断，配偶特征画像与感情时间线' },
  { type: 'annual', icon: '📊', name: '流年大运分析', desc: '未来10年逐年运势 + 关键年份风险提醒' },
  { type: 'xiaoliuren', icon: '☯', name: '小六壬占卜', desc: '传统马前课掐指一算，AI解读预知吉凶' },
  { type: 'digital_energy', icon: '📱', name: '数字能量', desc: '八星磁场分析手机号能量，洞察财运事业吉凶' },
  { type: 'bazhai', icon: '🏠', name: '八宅风水', desc: '命卦定吉凶·大游年歌诀·AI深度解读' },
  { type: 'health', icon: '💚', name: '五运六气健康分析', desc: '中医体质辨识·脏腑调理·药膳食疗方案' },
];

interface UserReport {
  id: number;
  uuid: string;
  reportType: string;
  isPaid: boolean;
  createdAt: string;
}

export default function HomePage() {
  const router = useRouter();

  // Capture referrer from URL query param and store for registration
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) sessionStorage.setItem('ref', ref);
    } catch { /* noop */ }
  }, []);

  const [form, setForm] = useState<ChartRequest>({
    year: 1990, month: 1, day: 1, hour: 12, minute: 0, gender: 1, city: '',
    calendar_type: 'solar', name: '',
  });
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [midnightRule, setMidnightRule] = useState<'early' | 'late'>('early');
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [chartId, setChartId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);

  // Fetch products from backend (prices synced from admin)
  useEffect(() => {
    api.get('/products')
      .then((res) => {
        if (Array.isArray(res.data)) setProducts(res.data);
      })
      .catch(() => { /* fallback to product cards without prices */ })
      .finally(() => setProductsLoaded(true));
  }, []);

  // Fetch user reports for button state sync
  const fetchUserReports = async (token?: string) => {
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('token') || undefined;
    }
    if (!token) return;
    try {
      const res = await userApi.getReports();
      setUserReports(Array.isArray(res.data) ? res.data : []);
    } catch { /* silently fail */ }
  };

  // Build latest-report map by reportType
  const reportMap = useMemo(() => {
    const map: Record<string, UserReport> = {};
    for (const r of userReports) {
      if (!map[r.reportType] || new Date(r.createdAt) > new Date(map[r.reportType].createdAt)) {
        map[r.reportType] = r;
      }
    }
    return map;
  }, [userReports]);

  const isLunar = form.calendar_type === 'lunar';
  const maxDay = isLunar ? 30 : 31;

  const lunarMonthOptions = useMemo(() => {
    const options: { value: number; label: string; isLeap: boolean }[] = [];
    for (let i = 1; i <= 12; i++) {
      options.push({ value: i, label: LUNAR_MONTH_NAMES[i - 1], isLeap: false });
    }
    return options;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      const redirect = encodeURIComponent('/');
      router.push(`/login?redirect=${redirect}&reason=chart`);
      return;
    }

    setLoading(true);
    setError('');
    setSaveMsg('');
    try {
      const payload: ChartRequest = {
        ...form,
        midnight_rule: midnightRule,
      };
      if (isLunar) {
        payload.is_leap_month = isLeapMonth;
      }

      const res = await baziApi.saveChart(payload);
      setSaveMsg('命盘已保存到个人中心');

      setChart(res.data);
      const id = res.data.id;
      if (id) {
        setChartId(id);
      }

      // Fetch user reports to sync product button states
      const currentToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (currentToken) {
        fetchUserReports(currentToken);
      }
    } catch (err: any) {
      const data = err.response?.data;
      const msg =
        (typeof data?.message === 'string' && data.message) ||
        (Array.isArray(data?.message) && data.message.join(' ')) ||
        data?.detail;
      setError(msg || '排盘失败，请检查输入或稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyProduct = async (product: ProductItem) => {
    const reportType = product.reportType || '';
    // 小六壬等特殊产品跳转到产品页
    if (reportType === 'xiaoliuren' || reportType === 'digital_energy' || reportType === 'bazhai' || reportType === 'health') {
      router.push(`/${reportType === 'digital_energy' ? 'digital-energy' : reportType === 'health' ? 'health' : reportType}${chartId ? `?chartId=${chartId}` : ''}`);
      return;
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent('/')}&reason=buy`);
      return;
    }
    if (!chartId) return;

    setBuyLoading(true);
    try {
      const orderRes = await orderApi.create({ productId: product.id });
      const orderData = orderRes.data as any;
      if (orderData.orderNo) {
        setPendingOrder({
          productId: product.id,
          orderNo: orderData.orderNo,
          amount: product.currentPrice,
          reportType,
        });
        setShowPayment(true);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || '创建订单失败，请稍后重试';
      setError(msg);
    } finally {
      setBuyLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    if (!pendingOrder) return;
    setShowPayment(false);
    const { reportType } = pendingOrder;
    setPendingOrder(null);
    if (reportType === 'xiaoliuren') {
      router.push(`/xiaoliuren?paid=1&orderNo=${encodeURIComponent(pendingOrder.orderNo)}`);
    } else if (reportType === 'digital_energy') {
      router.push(`/digital-energy?paid=1&orderNo=${encodeURIComponent(pendingOrder.orderNo)}`);
    } else if (reportType === 'bazhai') {
      router.push(`/bazhai?paid=1&orderNo=${encodeURIComponent(pendingOrder.orderNo)}`);
    } else if (reportType === 'health') {
      router.push(`/health?paid=1&orderNo=${encodeURIComponent(pendingOrder.orderNo)}`);
    } else {
      router.push(`/report/generating/${chartId}?type=${reportType}&paid=1`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <section className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold font-kai text-primary-800 mb-4">
          AI国学派 · 智慧命理 · 健康养生
        </h1>
        <p className="text-lg text-ink-500 max-w-2xl mx-auto leading-relaxed">
          八字排盘 · 小六壬占卜 · 数字能量 · 八宅风水 · 五运六气中医健康
        </p>
        <p className="text-sm text-ink-400 mt-2">真太阳时精准校正 · AI大模型深度解读 · 传承国学智慧</p>
      </section>

      {/* Feature Cards */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-12">
        {[
          { href: '#form', icon: '☯', label: '八字排盘', desc: '精准四柱·大运流年', color: 'primary' },
          { href: '/xiaoliuren', icon: '☲', label: '小六壬占卜', desc: '掐指一算·预知吉凶', color: 'amber' },
          { href: '/digital-energy', icon: '📱', label: '数字能量', desc: '八星磁场·号码解读', color: 'blue' },
          { href: '/bazhai', icon: '🏠', label: '八宅风水', desc: '命卦定吉凶·方位决兴衰', color: 'emerald' },
          { href: '/health', icon: '💚', label: '健康养生', desc: '五运六气·体质调理', color: 'green' },
        ].map(f => {
          const colors: Record<string, string> = {
            primary: 'border-primary-100 bg-primary-50/40 hover:border-primary-300 text-primary-700',
            amber: 'border-amber-100 bg-amber-50/40 hover:border-amber-300 text-amber-700',
            blue: 'border-blue-100 bg-blue-50/40 hover:border-blue-300 text-blue-700',
            emerald: 'border-emerald-100 bg-emerald-50/40 hover:border-emerald-300 text-emerald-700',
            green: 'border-green-100 bg-green-50/40 hover:border-green-300 text-green-700',
          };
          return (
            <a key={f.href} href={f.href} className={`card text-center py-4 px-2 border transition-all hover:shadow-md cursor-pointer ${colors[f.color]}`}>
              <div className="text-2xl mb-1.5">{f.icon}</div>
              <div className="font-bold font-kai text-sm">{f.label}</div>
              <div className="text-[11px] text-ink-400 mt-1">{f.desc}</div>
            </a>
          );
        })}
      </section>

      {/* Form */}
      <section id="form" className="card max-w-2xl mx-auto mb-12">
        <h2 className="text-xl font-bold text-center mb-6 font-kai text-primary-700">
          输入出生信息
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Calendar Type Toggle */}
          <div className="flex justify-center mb-2">
            <div className="inline-flex rounded-xl border-2 border-ink-200 overflow-hidden">
              <button
                type="button"
                className={`px-6 py-2 text-sm font-medium transition-all ${
                  !isLunar
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-ink-500 hover:bg-ink-50'
                }`}
                onClick={() => {
                  setForm({ ...form, calendar_type: 'solar' });
                  setIsLeapMonth(false);
                }}
              >
                阳历（公历）
              </button>
              <button
                type="button"
                className={`px-6 py-2 text-sm font-medium transition-all ${
                  isLunar
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-ink-500 hover:bg-ink-50'
                }`}
                onClick={() => setForm({ ...form, calendar_type: 'lunar' })}
              >
                农历（阴历）
              </button>
            </div>
          </div>

          {/* 命主姓名 */}
          <div>
            <label className="block text-sm text-ink-500 mb-1">命主姓名</label>
            <input
              type="text"
              className="input-field w-full"
              placeholder={'选填，如"张三"'}
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={20}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-ink-500 mb-1">
                {isLunar ? '农历年' : '出生年'}
              </label>
              <input
                type="number"
                className="input-field"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: +e.target.value })}
                min={1900} max={2100}
              />
            </div>
            <div>
              <label className="block text-sm text-ink-500 mb-1">
                {isLunar ? '农历月' : '月'}
              </label>
              <select
                className="input-field"
                value={form.month}
                onChange={(e) => setForm({ ...form, month: +e.target.value })}
              >
                {isLunar ? (
                  lunarMonthOptions.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))
                ) : (
                  Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}月</option>
                  ))
                )}
              </select>
              {isLunar && (
                <label className="flex items-center gap-1.5 mt-1.5 text-xs text-ink-400">
                  <input
                    type="checkbox"
                    className="rounded border-ink-300"
                    checked={isLeapMonth}
                    onChange={(e) => setIsLeapMonth(e.target.checked)}
                  />
                  闰月
                </label>
              )}
            </div>
            <div>
              <label className="block text-sm text-ink-500 mb-1">
                {isLunar ? '农历日' : '日'}
              </label>
              <select
                className="input-field"
                value={form.day}
                onChange={(e) => setForm({ ...form, day: +e.target.value })}
              >
                {Array.from({ length: maxDay }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}日</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-ink-500 mb-1">出生时辰</label>
              <select
                className="input-field"
                value={form.hour}
                onChange={(e) => setForm({ ...form, hour: +e.target.value })}
              >
                {HOURS.map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-ink-500 mb-1">分钟</label>
              <select
                className="input-field"
                value={form.minute}
                onChange={(e) => setForm({ ...form, minute: +e.target.value })}
              >
                {MINUTES.map((m) => (
                  <option key={m} value={m}>{m.toString().padStart(2, '0')}分</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-ink-500 mb-1">性别</label>
              <div className="flex gap-2 mt-0.5">
                <button
                  type="button"
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    form.gender === 1
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-ink-200 text-ink-500'
                  }`}
                  onClick={() => setForm({ ...form, gender: 1 })}
                >
                  男 (乾造)
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    form.gender === 2
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-ink-200 text-ink-500'
                  }`}
                  onClick={() => setForm({ ...form, gender: 2 })}
                >
                  女 (坤造)
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-ink-500 mb-1">出生城市（用于真太阳时校正）</label>
            <CityPicker
              value={form.city}
              onChange={(selection: CitySelection) => setForm({ ...form, city: selection.name })}
            />
          </div>

          {/* Advanced Settings */}
          <div>
            <button
              type="button"
              className="text-xs text-ink-400 hover:text-ink-600 transition-colors flex items-center gap-1"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span className={`transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>▸</span>
              高级设置
            </button>
            {showAdvanced && (
              <div className="mt-2 p-3 bg-ink-50 rounded-xl space-y-2">
                <div>
                  <label className="block text-xs text-ink-500 mb-1">子时规则</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                        midnightRule === 'early'
                          ? 'border-primary-400 bg-primary-50 text-primary-700'
                          : 'border-ink-200 text-ink-400'
                      }`}
                      onClick={() => setMidnightRule('early')}
                    >
                      早子时（23时换日柱）
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                        midnightRule === 'late'
                          ? 'border-primary-400 bg-primary-50 text-primary-700'
                          : 'border-ink-200 text-ink-400'
                      }`}
                      onClick={() => setMidnightRule('late')}
                    >
                      晚子时（0时换日柱）
                    </button>
                  </div>
                  <p className="text-xs text-ink-400 mt-1">
                    * 早子时：23:00后日柱切换到次日。多数命理流派采用此规则。
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-lg"
          >
            {loading ? '排盘中...' : '立即排盘'}
          </button>
        </form>
      </section>

      {/* Chart Display */}
      {chart && (
        <section className="mb-12">
          {saveMsg && (
            <div className="mb-4 text-center py-2 px-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
              {saveMsg}
            </div>
          )}
          <ChartLayout chart={chart} />
          {chartId && (
            <div className="mt-6 text-center">
              <button
                onClick={() => router.push(`/chart/${chartId}`)}
                className="text-sm text-primary-600 hover:text-primary-700 underline"
              >
                在独立页面查看完整命盘
              </button>
            </div>
          )}
        </section>
      )}

      {/* Products CTA */}
      {chart && (
        <section className="mt-12 grid md:grid-cols-3 gap-6">
          {PRODUCT_CARDS.map((card) => {
            // Merge API product data with card display data
            const apiProduct = products.find(
              (p) => p.reportType === card.type,
            );
            const price = apiProduct?.currentPrice;
            const original = apiProduct?.originalPrice;
            const existingReport = reportMap[card.type];
            return (
            <div key={card.type} className={`card text-center hover:shadow-lg transition-shadow relative ${card.hot ? 'border-gold-300 border-2' : ''}`}>
              {card.hot && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold-500 text-white text-xs px-3 py-1 rounded-full">
                  热门推荐
                </div>
              )}
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="font-bold text-lg mb-2">{card.name}</h3>
              <p className="text-sm text-ink-500 mb-4">{card.desc}</p>
              {productsLoaded ? (
                price !== undefined ? (
                  <>
                    <p className="text-2xl font-bold text-primary-600 mb-1">¥{price}</p>
                    {original !== undefined && original > price && (
                      <p className="text-xs text-ink-400 line-through mb-4">¥{original}</p>
                    )}
                    {(!original || original <= price) && <div className="mb-4" />}
                  </>
                ) : (
                  <div className="mb-4 text-sm text-ink-400">价格加载中...</div>
                )
              ) : (
                <div className="mb-4 flex justify-center">
                  <div className="w-16 h-6 bg-ink-100 rounded animate-pulse" />
                </div>
              )}
              {apiProduct ? (
                existingReport ? (
                  <div className="flex gap-2">
                    <button
                      className="btn-outline flex-1"
                      onClick={() => router.push(`/report/${existingReport.uuid}`)}
                    >
                      查看报告
                    </button>
                    <button
                      className="btn-gold flex-1"
                      onClick={() => handleBuyProduct(apiProduct)}
                      disabled={buyLoading}
                    >
                      再次购买
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-gold w-full"
                    onClick={() => handleBuyProduct(apiProduct)}
                    disabled={buyLoading}
                  >
                    立即解锁
                  </button>
                )
              ) : (
                <button
                  className="btn-primary w-full"
                  onClick={() => router.push('/products')}
                >
                  查看产品
                </button>
              )}
            </div>
          )})}
        </section>
      )}

      {/* Payment Modal */}
      {showPayment && pendingOrder && (
        <PaymentMethodSelector
          orderNo={pendingOrder.orderNo}
          amount={pendingOrder.amount}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPayment(false)}
        />
      )}

      {/* Trust + Feature Highlights */}
      <section className="mt-16 text-center">
        <h2 className="text-2xl font-bold font-kai text-ink-800 mb-8">五大核心功能 · 一站式国学平台</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { num: '☯', label: '八字排盘', sub: '真太阳时精准四柱' },
            { num: '☲', label: '小六壬占卜', sub: '马前课掐指算法' },
            { num: '📱', label: '数字能量', sub: '八星磁场手机解读' },
            { num: '🏠', label: '八宅风水', sub: '大游年命卦方位' },
            { num: '💚', label: '健康养生', sub: '五运六气体质分析' },
          ].map((s) => (
            <div key={s.label} className="card text-center py-6">
              <p className="text-3xl">{s.num}</p>
              <p className="text-sm font-bold font-kai text-ink-700 mt-2">{s.label}</p>
              <p className="text-xs text-ink-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
