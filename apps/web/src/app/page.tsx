'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { baziApi, userApi, type ChartRequest, type ChartResponse } from '@/lib/api';
import ChartLayout from '@/components/chart/ChartLayout';
import CityPicker, { type CitySelection } from '@/components/CityPicker';

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

const PRODUCTS = [
  { type: 'wealth', icon: '💰', name: '财运深度分析', desc: '3000字+ AI深度解读，识别财富爆发年份', price: 199, original: 299 },
  { type: 'annual', icon: '📊', name: '流年大运分析', desc: '未来10年逐年运势 + 关键年份提醒', price: 199, original: 399, hot: true },
  { type: 'marriage', icon: '💑', name: '婚姻感情分析', desc: '3000字+ 婚姻分析，桃花年份精准预测', price: 199, original: 299 },
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

  const handleBuyProduct = (reportType: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent('/')}&reason=buy`);
      return;
    }
    if (!chartId) return;
    router.push(`/report/generating/${chartId}?type=${reportType}&paid=1`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <section className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-kai text-primary-800 mb-4">
          八字命理 · 精准排盘 · 健康分析
        </h1>
        <p className="text-lg text-ink-500 max-w-2xl mx-auto">
          真太阳时精准校正 · AI智能深度解读 · 五运六气中医健康分析
        </p>
      </section>

      {/* Form */}
      <section className="card max-w-2xl mx-auto mb-12">
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
          {PRODUCTS.map((p) => {
            const existingReport = reportMap[p.type];
            return (
            <div key={p.type} className={`card text-center hover:shadow-lg transition-shadow relative ${p.hot ? 'border-gold-300 border-2' : ''}`}>
              {p.hot && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold-500 text-white text-xs px-3 py-1 rounded-full">
                  热门推荐
                </div>
              )}
              <div className="text-3xl mb-3">{p.icon}</div>
              <h3 className="font-bold text-lg mb-2">{p.name}</h3>
              <p className="text-sm text-ink-500 mb-4">{p.desc}</p>
              <p className="text-2xl font-bold text-primary-600 mb-1">¥{p.price}</p>
              <p className="text-xs text-ink-400 line-through mb-4">¥{p.original}</p>
              {existingReport ? (
                <div className="flex gap-2">
                  <button
                    className="btn-outline flex-1"
                    onClick={() => router.push(`/report/${existingReport.uuid}`)}
                  >
                    查看报告
                  </button>
                  <button
                    className="btn-gold flex-1"
                    onClick={() => handleBuyProduct(p.type)}
                  >
                    再次购买
                  </button>
                </div>
              ) : (
                <button
                  className="btn-gold w-full"
                  onClick={() => handleBuyProduct(p.type)}
                >
                  立即解锁
                </button>
              )}
            </div>
          )})}
        </section>
      )}

      {/* Trust Section */}
      <section className="mt-16 text-center">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { num: '100万+', label: '累计排盘次数' },
            { num: '99.9%', label: '排盘精准度' },
            { num: '五运六气', label: '中医体质分析' },
            { num: '4.9分', label: '用户好评' },
          ].map((s) => (
            <div key={s.label} className="card text-center py-6">
              <p className="text-2xl font-bold text-primary-600">{s.num}</p>
              <p className="text-sm text-ink-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
