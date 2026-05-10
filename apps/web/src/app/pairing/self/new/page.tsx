'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { pairingApi, baziApi, userApi } from '@/lib/api';
import { PairingChartSelector } from '@/components/pairing/PairingChartSelector';
import ChartCreationForm from '@/components/ChartCreationForm';

const PAIRING_TYPE_META: Record<string, { label: string; desc: string; emoji: string }> = {
  personality: { label: '性格匹配', desc: '分析双方性格是否互补', emoji: '🧠' },
  career: { label: '事业合作', desc: '判断事业格局协同度', emoji: '💼' },
  wealth: { label: '财运互补', desc: '分析双方财运同步性', emoji: '💰' },
  hehun: { label: '合婚分析', desc: '天干地支合冲分析', emoji: '💍' },
  comprehensive: { label: '综合配对', desc: '全方位多维配对分析', emoji: '🎯' },
};

type Step = 1 | 2 | 3 | 'pay' | 'generating';

export default function SelfPairingWizardPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [chartA, setChartA] = useState<number | null>(null);
  const [chartB, setChartB] = useState<number | null>(null);
  const [charts, setCharts] = useState<any[]>([]);
  const [pairingType, setPairingType] = useState('');
  const [pricing, setPricing] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestUuid, setRequestUuid] = useState<string | null>(null);
  const [showNewChartFor, setShowNewChartFor] = useState<'A' | 'B' | null>(null);
  const [freeTrialRemaining, setFreeTrialRemaining] = useState(-1);

  useEffect(() => {
    pairingApi.getPricing().then((res: any) => setPricing(res.data)).catch(() => {});
    userApi.getCharts().then((res: any) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.charts || []);
      setCharts(list);
    }).catch(() => setCharts([]));
  }, []);

  const handleChartCreated = async (target: 'A' | 'B', chartId: number) => {
    const refresh: any = await userApi.getCharts();
    const list = Array.isArray(refresh.data) ? refresh.data : (refresh.data?.charts || []);
    setCharts(list);
    if (target === 'A') setChartA(chartId); else setChartB(chartId);
    setShowNewChartFor(null);
  };

  const handleInitiate = async () => {
    if (!chartA || !chartB || !pairingType) return;
    setLoading(true);
    setError('');
    try {
      const res: any = await pairingApi.initiateSelfPairing({ chartIdA: chartA, chartIdB: chartB, pairingType });
      setRequestUuid(res.data.uuid);
      // Check free trial status for this pairing type
      try {
        const ftRes: any = await pairingApi.getFreeTrialStatus(res.data.uuid);
        setFreeTrialRemaining(ftRes.data?.remaining ?? 0);
      } catch {
        setFreeTrialRemaining(0);
      }
      setStep('pay');
    } catch (err: any) {
      setError(err?.response?.data?.message || '创建失败');
    } finally { setLoading(false); }
  };

  const handlePayAndGenerate = async () => {
    if (!requestUuid) return;
    setStep('generating');
    setError('');
    try {
      await pairingApi.payAndGenerateSelfPairing(requestUuid, 'balance');
      router.push('/pairing/' + requestUuid);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '生成失败';
      // Check if report was actually created despite the error (e.g. timeout)
      try {
        const checkRes: any = await pairingApi.getRequest(requestUuid);
        if (checkRes.data?.status === 5 || checkRes.data?.status === 4) {
          router.push('/pairing/' + requestUuid);
          return;
        }
      } catch {}
      setError(msg);
      setStep('pay');
    }
  };

  const getChartLabel = (chart: any): string => {
    if (!chart) return '';
    if (chart.name) return chart.name;
    return chart.dayGan + '日主 · ' + (chart.gender === 1 ? '男' : '女');
  };

  const selectedPairing = pairingType ? PAIRING_TYPE_META[pairingType] : null;

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: 80 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ maxWidth: 512, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ padding: 4, marginLeft: -4, border: 'none', background: 'none', color: '#6b7280', cursor: 'pointer' }}>
            <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: '#1f2937' }}>新建自选配对</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {([1, 2, 3] as number[]).map((s) => (
              <div key={s} style={{ width: 8, height: 8, borderRadius: '50%', background: (typeof step === 'number' && step >= s) || typeof step === 'string' ? '#c44520' : '#e5e7eb' }} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 512, margin: '0 auto', padding: '16px 16px' }}>
        {error && (
          <div style={{ marginBottom: 16, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, color: '#dc2626', fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 14, color: '#6b7280' }}>步骤 1/3</p>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginTop: 4 }}>选择命盘 A</h2>
            </div>
            <PairingChartSelector selectedChartId={chartA} onSelect={(id) => setChartA(id)} />
            {showNewChartFor === 'A' ? (
              <div className="card mt-3">
                <p className="text-sm font-semibold text-ink-700 mb-3">新建命盘 A</p>
                <ChartCreationForm
                  compact
                  submitLabel="创建并选择"
                  onSubmit={(payload) => baziApi.saveChart(payload)}
                  onSuccess={(id) => handleChartCreated('A', id)}
                />
                <button onClick={() => setShowNewChartFor(null)} className="w-full mt-3 py-2 text-sm text-ink-400 hover:text-ink-600 transition-colors">
                  取消
                </button>
              </div>
            ) : (
              <button onClick={() => setShowNewChartFor('A')} className="w-full mt-3 py-3 border-2 border-dashed border-ink-200 rounded-xl text-sm text-ink-400 hover:text-ink-600 hover:border-ink-300 transition-colors">
                + 新建命盘
              </button>
            )}
            <button onClick={() => setStep(2)} disabled={!chartA} style={{ width: '100%', marginTop: 20, padding: '12px 0', background: chartA ? '#1f2937' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: chartA ? 'pointer' : 'not-allowed' }}>
              下一步：选择命盘 B
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 14, color: '#6b7280' }}>步骤 2/3</p>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginTop: 4 }}>选择命盘 B</h2>
            </div>
            <PairingChartSelector selectedChartId={chartB} onSelect={(id) => setChartB(id)} />
            {showNewChartFor === 'B' ? (
              <div className="card mt-3">
                <p className="text-sm font-semibold text-ink-700 mb-3">新建命盘 B</p>
                <ChartCreationForm
                  compact
                  submitLabel="创建并选择"
                  onSubmit={(payload) => baziApi.saveChart(payload)}
                  onSuccess={(id) => handleChartCreated('B', id)}
                />
                <button onClick={() => setShowNewChartFor(null)} className="w-full mt-3 py-2 text-sm text-ink-400 hover:text-ink-600 transition-colors">
                  取消
                </button>
              </div>
            ) : (
              <button onClick={() => setShowNewChartFor('B')} className="w-full mt-3 py-3 border-2 border-dashed border-ink-200 rounded-xl text-sm text-ink-400 hover:text-ink-600 hover:border-ink-300 transition-colors">
                + 新建命盘
              </button>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '12px 0', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>上一步</button>
              <button onClick={() => setStep(3)} disabled={!chartB || chartA === chartB} style={{ flex: 1, padding: '12px 0', background: (chartB && chartA !== chartB) ? '#1f2937' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: (chartB && chartA !== chartB) ? 'pointer' : 'not-allowed' }}>
                {chartA === chartB ? '请选择不同的命盘' : '下一步：选择配对类型'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 14, color: '#6b7280' }}>步骤 3/3</p>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginTop: 4 }}>选择配对类型</h2>
            </div>
            <div style={{ padding: 12, background: '#f9fafb', borderRadius: 12, textAlign: 'center', fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              {getChartLabel(charts.find(c => c.id === chartA))} vs {getChartLabel(charts.find(c => c.id === chartB))}
            </div>
            {Object.entries(PAIRING_TYPE_META).map(([type, meta]) => {
              const cfg = pricing?.[type];
              const disabled = cfg && !cfg.enabled;
              const selected = pairingType === type;
              return (
                <button key={type} onClick={() => !disabled && setPairingType(type)} disabled={disabled}
                  style={{ width: '100%', textAlign: 'left', padding: 16, marginBottom: 10, borderRadius: 12,
                    border: selected ? '2px solid #c44520' : '1px solid #e5e7eb',
                    background: selected ? '#fef2f2' : '#fff', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 28 }}>{meta.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{meta.label}</p>
                      <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{meta.desc}</p>
                      {cfg && <p style={{ fontSize: 12, marginTop: 4 }}><span style={{ color: '#d97706', fontWeight: 500 }}>¥{cfg.price}</span> <span style={{ color: '#9ca3af' }}>免费{cfg.freeCount}次</span></p>}
                    </div>
                    {selected && <svg style={{ width: 20, height: 20, color: '#c44520', marginTop: 2 }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                  </div>
                </button>
              );
            })}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: '12px 0', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>上一步</button>
              <button onClick={handleInitiate} disabled={!pairingType || loading} style={{ flex: 2, padding: '12px 0', background: pairingType && !loading ? 'linear-gradient(135deg, #c44520, #d97706)' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: pairingType && !loading ? 'pointer' : 'not-allowed' }}>
                {loading ? '创建中...' : '确认配对'}
              </button>
            </div>
          </div>
        )}

        {/* Payment */}
        {step === 'pay' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>☯</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937' }}>确认配对分析</h2>
            <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 4 }}>将使用配对算法 + AI 深度分析生成报告</p>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 12, textAlign: 'left', marginTop: 16, fontSize: 14, lineHeight: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>命盘A</span><span style={{ color: '#1f2937', fontWeight: 500 }}>{getChartLabel(charts.find(c => c.id === chartA))}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>命盘B</span><span style={{ color: '#1f2937', fontWeight: 500 }}>{getChartLabel(charts.find(c => c.id === chartB))}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>配对类型</span><span style={{ color: '#1f2937', fontWeight: 500 }}>{selectedPairing?.label}</span></div>
              <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>价格</span>
                <span style={{ color: freeTrialRemaining > 0 ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                  {freeTrialRemaining > 0 ? `免费 (剩余${freeTrialRemaining}次)` : `¥${pricing?.[pairingType]?.price || '--'}`}
                </span>
              </div>
            </div>
            <button onClick={handlePayAndGenerate} disabled={!pricing} style={{ width: '100%', marginTop: 20, padding: '14px 0', background: pricing ? (freeTrialRemaining > 0 ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'linear-gradient(135deg, #c44520, #d97706)') : '#d1d5db', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: pricing ? 'pointer' : 'not-allowed' }}>
              {freeTrialRemaining > 0 ? '免费生成报告' : '余额支付并生成报告'}
            </button>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
              {freeTrialRemaining > 0 ? '使用免费体验次数，无需支付' : '免费次数用完后的价格'}
            </p>
            <button onClick={() => setStep(3)} style={{ width: '100%', marginTop: 12, padding: '10px 0', background: 'none', color: '#6b7280', border: 'none', fontSize: 14, cursor: 'pointer' }}>
              返回修改
            </button>
          </div>
        )}

        {/* Generating */}
        {step === 'generating' && (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <svg style={{ width: 64, height: 64, margin: '0 auto', color: '#c44520', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginTop: 24 }}>AI 分析中...</h2>
            <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 4 }}>正在运行配对算法 + AI 深度分析</p>
          </div>
        )}
      </div>
    </div>
  );
}
