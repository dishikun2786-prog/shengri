'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { digitalEnergyApi, orderApi } from '@/lib/api';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';

interface StarGroup { pair: string; star: string; luck: string; wuxing: string; level: number; mainAffair: string; desc: string; position: string; }

interface EnergyResult {
  phone: string; tailNumber: string; groups: StarGroup[]; lastFour: StarGroup[];
  stats: { totalStars: number; luckyCount: number; unluckyCount: number; luckyPercent: number; wuxingDistribution: Record<string,number>; dominantStar: string; dominantWuxing: string; };
  hasSpecialZero: boolean; hasSpecialFive: boolean; specialDigits: { digit: string; meaning: string; position: number }[];
  summary: string; suggestion: string;
}

const WUXING_COLORS: Record<string, string> = { '金': '#fbbf24', '木': '#4ade80', '水': '#3b82f6', '火': '#ef4444', '土': '#f59e0b' };

export default function DigitalEnergyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState('');
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<EnergyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [orderNo, setOrderNo] = useState('');
  const [orderAmount, setOrderAmount] = useState(0);
  const [paidViaProduct, setPaidViaProduct] = useState(false);
  const [paidOrderNo, setPaidOrderNo] = useState('');

  useEffect(() => {
    const paid = searchParams?.get('paid') || '';
    const order = searchParams?.get('orderNo') || '';
    if (paid === '1' && order) { setPaidViaProduct(true); setPaidOrderNo(order); }
  }, [searchParams]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  async function handleCalculate() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) { router.push('/login?redirect=/digital-energy'); return; }
    if (!/^1\d{10}$/.test(phone.trim())) { alert('请输入有效的11位中国大陆手机号'); return; }
    setLoading(true);
    try {
      const res = await digitalEnergyApi.calculate({ phone: phone.trim(), question: question.trim() || undefined });
      setResult(res.data as any);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '测算失败，请检查网络后重试';
      alert(msg);
    }
    finally { setLoading(false); }
  }

  async function handleGenerateReport() {
    if (!token) { router.push('/login?redirect=/digital-energy'); return; }
    if (!paidViaProduct) {
      setGenerating(true);
      try {
        const productsRes = await orderApi.getProducts();
        const products = (productsRes.data as any[]) || [];
        const deProduct = products.find((p: any) => p.reportType === 'digital_energy');
        if (!deProduct) { alert('产品未配置'); setGenerating(false); return; }
        const orderRes = await orderApi.create({ productId: deProduct.id });
        const orderData = orderRes.data as any;
        if (orderData.orderNo) { setOrderNo(orderData.orderNo); setOrderAmount(Number(orderData.paidAmount || deProduct.currentPrice || 39)); setGenerating(false); setShowPayment(true); }
      } catch (err: any) { alert(err?.response?.data?.message || '创建订单失败'); setGenerating(false); }
      return;
    }
    setGenerating(true);
    // Fire-and-forget: trigger generation, then poll for result (bypass Cloudflare 100s timeout)
    digitalEnergyApi.generateReport({ phone: phone.trim(), question: question.trim() || undefined, isPaid: true, orderNo: paidOrderNo })
      .then((res: any) => { if (res?.data?.uuid) router.push(`/digital-energy/report/${res.data.uuid}`); })
      .catch(() => { /* Cloudflare timeout — report still generating, poll instead */ });
    pollForReport();
  }

  function pollForReport() {
    let attempts = 0;
    const maxAttempts = 60; // 3 min max
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await digitalEnergyApi.getHistory(0, 5);
        const records = (res.data as any)?.records || [];
        const match = records.find((r: any) => r.phone === phone.trim() && r.reportUuid);
        if (match) { clearInterval(interval); router.push(`/digital-energy/report/${match.reportUuid}`); return; }
      } catch {}
      if (attempts >= maxAttempts) { clearInterval(interval); setGenerating(false); alert('报告生成超时，请在"我的报告"中查看'); }
    }, 3000);
  }

  async function handlePaymentSuccessAndGenerate() {
    setShowPayment(false);
    setPaidViaProduct(true);
    setGenerating(true);
    digitalEnergyApi.generateReport({ phone: phone.trim(), question: question.trim() || undefined, isPaid: true, orderNo })
      .then((res: any) => { if (res?.data?.uuid) router.push(`/digital-energy/report/${res.data.uuid}`); })
      .catch(() => {});
    pollForReport();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-ink-800 font-kai">数字能量 · 手机号码测算</h1>
        <p className="text-ink-400 mt-2 font-kai">八星磁场 · 洞察号码能量 · 预知吉凶趋势</p>
      </div>

      {/* 使用引导 */}
      <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white p-5 animate-fade-in">
        <div className="flex items-start gap-3 mb-3"><span className="text-2xl">📱</span><div><h3 className="font-bold text-blue-800 font-kai text-sm">数字能量能帮你分析什么？</h3><p className="text-xs text-ink-500 mt-0.5">八星磁场理论解读手机号后10位能量，5组数字对揭示你的事业、财运、婚姻和健康趋势</p></div></div>
        <div className="flex flex-wrap gap-2"><span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-kai border border-blue-100">💰 正偏财运</span><span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-kai border border-blue-100">💼 事业走势</span><span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-kai border border-blue-100">💑 婚姻感情</span><span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-kai border border-blue-100">🫀 健康隐患</span><span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-kai border border-blue-100">👥 人际关系</span></div>
      </div>

      <div className="card animate-fade-in">
        <div>
          <label className="block text-sm text-ink-500 mb-1.5 font-medium">手机号码</label>
          <input type="tel" className="input-field text-lg text-center tracking-widest" value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="输入11位手机号" maxLength={11} inputMode="numeric" />
        </div>
        <div className="mt-4">
          <label className="block text-sm text-ink-500 mb-1.5 font-medium">所问何事 <span className="text-ink-300 font-normal">（选填）</span></label>
          <input type="text" className="input-field" value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="如：财运、事业、婚姻..." />
        </div>
        <button onClick={handleCalculate} disabled={loading}
          className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-gold-500 text-white font-kai text-lg font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50">
          {loading ? '分析中...' : '开始测算'}
        </button>
      </div>

      {result && (
        <div className="mt-8 space-y-6 animate-fade-in">
          {/* Stats */}
          <div className="card">
            <h2 className="text-lg font-bold text-ink-700 font-kai mb-4">📱 {result.phone}</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[{ label: '吉星', val: result.stats.luckyCount, color: 'text-green-600' },
                { label: '凶星', val: result.stats.unluckyCount, color: 'text-red-500' },
                { label: '吉星占比', val: `${result.stats.luckyPercent}%`, color: 'text-primary-600' },
              ].map(item => (
                <div key={item.label} className="text-center p-3 rounded-xl bg-ink-50/60">
                  <div className={`text-2xl font-bold ${item.color}`}>{item.val}</div>
                  <div className="text-xs text-ink-400 mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm"><span className="text-ink-400">主导星：</span><span className="font-bold text-ink-700 font-kai">{result.stats.dominantStar}</span><span className="text-ink-400 ml-2">五行：</span><span className="font-bold" style={{color:WUXING_COLORS[result.stats.dominantWuxing]}}>{result.stats.dominantWuxing}</span></div>
          </div>

          {/* Star groups */}
          <div className="card">
            <h3 className="font-bold text-ink-700 font-kai mb-3">全号能量分布（从右往左）</h3>
            <div className="space-y-2">
              {result.groups.map((g, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: g.luck.includes('吉') ? '#bbf7d0' : '#fecaca', backgroundColor: g.luck.includes('吉') ? '#f0fdf4' : '#fef2f2' }}>
                  <span className="text-2xl font-mono font-bold tracking-widest text-ink-700">{g.pair}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${g.luck.includes('吉') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{g.star}</span>
                  <span className="text-xs text-ink-400">{g.position}</span>
                  <span className="text-[10px] px-1 py-0.5 rounded" style={{backgroundColor:WUXING_COLORS[g.wuxing]+'20',color:WUXING_COLORS[g.wuxing]}}>{g.wuxing}·L{g.level}</span>
                  <span className="text-xs text-ink-500 ml-auto">{g.mainAffair}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="card bg-gold-50/50 border-gold-100/60">
            <p className="text-sm text-ink-600 leading-relaxed font-kai">{result.summary}</p>
            <p className="text-sm text-ink-500 mt-2">{result.suggestion}</p>
          </div>

          {/* AI CTA */}
          <div className="card bg-gradient-to-br from-primary-50/50 to-gold-50/50 border-primary-100/40 text-center">
            <div className="text-2xl mb-2">🔮</div>
            <h3 className="text-lg font-bold text-primary-700 font-kai mb-1">AI 深度解读</h3>
            <p className="text-sm text-ink-500 mb-4">全面分析号码能量对财运、事业、婚姻、健康的影响</p>
            <button onClick={handleGenerateReport} disabled={generating}
              className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-kai font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50">
              {generating ? '生成中...' : (token ? '查看AI深度解读' : '登录查看AI解读')}
            </button>
          </div>
        </div>
      )}

      {showPayment && (
        <PaymentMethodSelector orderNo={orderNo} amount={orderAmount}
          onSuccess={handlePaymentSuccessAndGenerate}
          onCancel={() => setShowPayment(false)} />
      )}

      <div className="mt-12 text-center text-xs text-ink-300">
        <p>数字能量学仅供参考，人生选择由您做主</p>
        <p className="mt-1">© 生辰 ShengRi · 传承国学智慧</p>
      </div>
    </div>
  );
}
