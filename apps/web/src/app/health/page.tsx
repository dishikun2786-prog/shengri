'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { healthAnalysisApi, orderApi } from '@/lib/api';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';

const SEVERITY_OPTIONS = [{ v: '轻', l: '轻微' }, { v: '中', l: '中等' }, { v: '重', l: '较重' }];
const SYMPTOM_SUGGESTIONS = ['头痛眩晕', '失眠多梦', '疲劳乏力', '胃胀消化', '腰膝酸软', '咳嗽气喘', '心慌胸闷', '皮肤过敏', '关节疼痛'];

const CONSTITUTION_COLORS: Record<string, string> = {
  '平和质': '#22c55e', '气虚质': '#f59e0b', '阳虚质': '#f97316', '阴虚质': '#ef4444',
  '痰湿质': '#8b5cf6', '湿热质': '#ec4899', '血瘀质': '#6b7280', '气郁质': '#3b82f6', '特禀质': '#14b8a6',
};

function HealthPageInner() {
  const router = useRouter(); const searchParams = useSearchParams();
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [birthYear, setBirthYear] = useState(1990); const [birthMonth, setBirthMonth] = useState(1); const [birthDay, setBirthDay] = useState(1);
  const [calendarType, setCalendarType] = useState<'solar' | 'lunar'>('solar');
  const [gender, setGender] = useState(1); const [hasBirth, setHasBirth] = useState(false);

  const LUNAR_MONTHS = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
  const maxDay = calendarType === 'lunar' ? 30 : 31;
  const [symptoms, setSymptoms] = useState<{ symptom: string; duration: string; severity: string }[]>([]);
  const [question, setQuestion] = useState('');
  const [height, setHeight] = useState(''); const [weight, setWeight] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [orderNo, setOrderNo] = useState(''); const [orderAmount, setOrderAmount] = useState(0);
  const [paidViaProduct, setPaidViaProduct] = useState(false); const [paidOrderNo, setPaidOrderNo] = useState('');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => { const p = searchParams?.get('paid') || '', o = searchParams?.get('orderNo') || ''; if (p === '1' && o) { setPaidViaProduct(true); setPaidOrderNo(o); } }, [searchParams]);

  function addSymptom() { setSymptoms([...symptoms, { symptom: '', duration: '', severity: '中' }]); }
  function removeSymptom(i: number) { setSymptoms(symptoms.filter((_, idx) => idx !== i)); }
  function updateSymptom(i: number, f: string, v: string) {
    setSymptoms(symptoms.map((s, idx) => idx === i ? { ...s, [f]: v } : s));
  }
  function quickAddSymptom(name: string) {
    if (!symptoms.find(s => s.symptom === name)) setSymptoms([...symptoms, { symptom: name, duration: '最近', severity: '中' }]);
  }

  async function handleCalculate() {
    if (!token) { router.push('/login?redirect=/health'); return; }
    setLoading(true);
    try {
      const birthDate = hasBirth ? `${birthYear}-${String(birthMonth).padStart(2,'0')}-${String(birthDay).padStart(2,'0')}` : undefined;
      const res = await healthAnalysisApi.calculate({
        targetDate, birthDate, birthCalendarType: hasBirth ? calendarType : undefined, gender: hasBirth ? gender : undefined,
        question: question.trim() || undefined,
        symptoms: symptoms.filter(s => s.symptom.trim()).map(s => ({ symptom: s.symptom.trim(), duration: s.duration || undefined, severity: s.severity })),
        height: height ? Number(height) : undefined, weight: weight ? Number(weight) : undefined,
      });
      setResult(res.data as any);
    } catch (err: any) { alert(err?.response?.data?.message || '分析失败'); }
    finally { setLoading(false); }
  }

  function pollForReport() {
    let n = 0; const iv = setInterval(async () => {
      n++; try {
        const r = await healthAnalysisApi.getHistory(0, 5);
        const m = (r.data as any)?.records?.find((x: any) => x.targetDate === targetDate && x.reportUuid);
        if (m) { clearInterval(iv); router.push(`/health/report/${m.reportUuid}`); }
      } catch { }
      if (n >= 60) { clearInterval(iv); setGenerating(false); alert('报告生成超时，请在"我的报告"中查看'); }
    }, 3000);
  }

  async function handleGenerateReport() {
    if (!token) { router.push('/login?redirect=/health'); return; }
    if (!paidViaProduct) {
      setGenerating(true); try {
        const r = await orderApi.getProducts(); const p = (r.data as any[])?.find((x: any) => x.reportType === 'health');
        if (!p) { alert('产品未配置'); setGenerating(false); return; }
        const o = await orderApi.create({ productId: p.id }); const d = o.data as any;
        if (d.orderNo) { setOrderNo(d.orderNo); setOrderAmount(Number(d.paidAmount || p.currentPrice || 39)); setGenerating(false); setShowPayment(true); }
      } catch (e: any) { alert(e?.response?.data?.message || '创建订单失败'); setGenerating(false); }
      return;
    }
    setGenerating(true);
    const symps = symptoms.filter(s => s.symptom.trim()).map(s => ({ symptom: s.symptom.trim(), duration: s.duration || undefined, severity: s.severity }));
    const birthDate = hasBirth ? `${birthYear}-${String(birthMonth).padStart(2,'0')}-${String(birthDay).padStart(2,'0')}` : undefined;
    healthAnalysisApi.generateReport({ targetDate, birthDate, birthCalendarType: hasBirth ? calendarType : undefined, gender: hasBirth ? gender : undefined, question: question.trim() || undefined, symptoms: symps.length ? symps : undefined, isPaid: true, orderNo: paidOrderNo, height: height ? Number(height) : undefined, weight: weight ? Number(weight) : undefined })
      .then((r: any) => { if (r?.data?.uuid) router.push(`/health/report/${r.data.uuid}`); }).catch(() => { });
    pollForReport();
  }
  async function handlePaymentSuccessAndGenerate() {
    setShowPayment(false); setPaidViaProduct(true); setGenerating(true);
    const symps2 = symptoms.filter(s => s.symptom.trim()).map(s => ({ symptom: s.symptom.trim(), duration: s.duration || undefined, severity: s.severity }));
    healthAnalysisApi.generateReport({ targetDate, birthDate: hasBirth ? `${birthYear}-${String(birthMonth).padStart(2,'0')}-${String(birthDay).padStart(2,'0')}` : undefined, birthCalendarType: hasBirth ? calendarType : undefined, gender: hasBirth ? gender : undefined, question: question.trim() || undefined, symptoms: symps2.length ? symps2 : undefined, isPaid: true, orderNo, height: height ? Number(height) : undefined, weight: weight ? Number(weight) : undefined })
      .then((r: any) => { if (r?.data?.uuid) router.push(`/health/report/${r.data.uuid}`); }).catch(() => { });
    pollForReport();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-6"><h1 className="text-3xl font-bold text-ink-800 font-kai">五运六气 · 健康养生</h1><p className="text-ink-400 mt-2 font-kai">黄帝内经 · 运气七篇 · 天人相应</p></div>

      {/* 使用引导 */}
      <div className="mb-6 rounded-2xl border border-green-100 bg-gradient-to-br from-green-50/60 to-white p-5 animate-fade-in">
        <div className="flex items-start gap-3 mb-3"><span className="text-2xl">💚</span><div><h3 className="font-bold text-green-800 font-kai text-sm">五运六气能帮你做什么？</h3><p className="text-xs text-ink-500 mt-0.5">基于出生年月和当前日期，推算岁运司天在泉，结合中医体质和症状，给出个性化的五运六气健康养生建议</p></div></div>
        <div className="flex flex-wrap gap-2"><span className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-kai border border-green-100">🫀 体质辨识</span><span className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-kai border border-green-100">🌿 四季养生</span><span className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-kai border border-green-100">🫁 脏腑调理</span><span className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-kai border border-green-100">🍵 饮食指导</span><span className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-kai border border-green-100">📍 穴位保健</span></div>
      </div>

      <div className="card animate-fade-in">
        {/* Birth date toggle */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer" onClick={() => setHasBirth(!hasBirth)}>
            <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${hasBirth ? 'bg-green-500 border-green-500' : 'border-ink-300'}`}>
              {hasBirth && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
            </span>
            <span className="text-sm text-ink-600 font-kai">输入出生日期进行八字五行分析（推荐）</span>
          </label>
          {hasBirth && (
            <div className="mt-3 p-3 bg-green-50/50 rounded-xl border border-green-100">
              {/* Calendar type toggle */}
              <div className="flex justify-center mb-2">
                <div className="inline-flex rounded-lg border border-ink-200 overflow-hidden">
                  <button type="button" onClick={() => setCalendarType('solar')} className={`px-3 py-1 text-[11px] font-medium transition-all ${calendarType==='solar'?'bg-green-500 text-white':'bg-white text-ink-500'}`}>公历</button>
                  <button type="button" onClick={() => setCalendarType('lunar')} className={`px-3 py-1 text-[11px] font-medium transition-all ${calendarType==='lunar'?'bg-green-500 text-white':'bg-white text-ink-500'}`}>农历</button>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 mb-2">
                <div><label className="block text-xs text-ink-400 mb-1">{calendarType==='lunar'?'农历年':'出生年'}</label><input type="number" className="input-field text-center text-sm" value={birthYear} onChange={e => setBirthYear(Number(e.target.value))} min={1900} max={2100} /></div>
                <div><label className="block text-xs text-ink-400 mb-1">{calendarType==='lunar'?'农历月':'月'}</label>
                  <select className="input-field text-sm" value={birthMonth} onChange={e => setBirthMonth(Number(e.target.value))}>
                    {calendarType==='lunar' ? LUNAR_MONTHS.map((name,i) => (<option key={i+1} value={i+1}>{name}</option>)) : Array.from({length:12},(_,i)=>i+1).map(m=>(<option key={m} value={m}>{m}月</option>))}
                  </select>
                </div>
                <div><label className="block text-xs text-ink-400 mb-1">{calendarType==='lunar'?'农历日':'日'}</label>
                  <select className="input-field text-sm" value={birthDay} onChange={e => setBirthDay(Number(e.target.value))}>
                    {Array.from({length:maxDay},(_,i)=>i+1).map(d=>(<option key={d} value={d}>{d}日</option>))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">{[{v:1,l:'♂ 男'},{v:2,l:'♀ 女'}].map(o=>(<button key={o.v} onClick={()=>setGender(o.v)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${gender===o.v?'bg-green-100 text-green-700 border border-green-300':'bg-white text-ink-500 border border-ink-200'}`}>{o.l}</button>))}</div>
            </div>
          )}
        </div>

        <div className="mb-4"><label className="block text-sm text-ink-500 mb-1.5">分析日期</label><input type="date" className="input-field text-center" value={targetDate} onChange={e => setTargetDate(e.target.value)} /></div>

        {/* Height & Weight */}
        <div className="mb-4">
          <label className="block text-sm text-ink-500 mb-1.5">身高体重 <span className="text-ink-300">(选填，用于体重管理分析)</span></label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input type="number" className="input-field text-center pr-10" value={height} onChange={e => setHeight(e.target.value)} placeholder="身高" min={100} max={250} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400">cm</span>
            </div>
            <div className="relative">
              <input type="number" className="input-field text-center pr-10" value={weight} onChange={e => setWeight(e.target.value)} placeholder="体重" min={30} max={300} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400">kg</span>
            </div>
          </div>
        </div>

        {/* Symptom input */}
        <div className="mb-4">
          <label className="block text-sm text-ink-500 mb-1.5">当前身体症状 <span className="text-ink-300">(选填，可添加多条)</span></label>
          {/* Quick add suggestions */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SYMPTOM_SUGGESTIONS.map(s => {
              const isSelected = symptoms.some(x => x.symptom === s);
              return (
                <button key={s} onClick={() => quickAddSymptom(s)}
                  className={`px-2.5 py-1.5 rounded-full text-[11px] border transition-all whitespace-nowrap ${isSelected ? 'bg-green-500 text-white border-green-500 shadow-sm' : 'bg-ink-50 text-ink-500 border-ink-200 hover:border-green-300 hover:text-green-600 active:scale-95'}`}>
                  {isSelected ? '✓ ' : '+ '}{s}
                </button>
              );
            })}
          </div>
          {symptoms.map((s, i) => (
            <div key={i} className="flex flex-wrap gap-2 mb-3 items-start p-3 bg-green-50/30 rounded-xl border border-green-100/50">
              <div className="w-full sm:flex-1">
                <label className="text-[10px] text-ink-400 mb-0.5 block sm:hidden">症状</label>
                <input type="text" className="input-field text-sm py-2.5" value={s.symptom} onChange={e => updateSymptom(i, 'symptom', e.target.value)} placeholder={`症状${i + 1}，如：头痛、失眠...`} />
              </div>
              <div className="flex gap-2 flex-1 sm:flex-none">
                <div className="flex-1 sm:flex-none sm:w-20">
                  <label className="text-[10px] text-ink-400 mb-0.5 block sm:hidden">持续</label>
                  <input type="text" className="input-field text-sm py-2.5" value={s.duration} onChange={e => updateSymptom(i, 'duration', e.target.value)} placeholder="持续" />
                </div>
                <div className="flex-1 sm:flex-none sm:w-20">
                  <label className="text-[10px] text-ink-400 mb-0.5 block sm:hidden">程度</label>
                  <select className="input-field text-sm py-2.5" value={s.severity} onChange={e => updateSymptom(i, 'severity', e.target.value)}>
                    {SEVERITY_OPTIONS.map(o => (<option key={o.v} value={o.v}>{o.l}</option>))}
                  </select>
                </div>
                <button onClick={() => removeSymptom(i)} className="text-red-400 hover:text-red-600 text-lg leading-none self-center sm:self-start sm:mt-1.5 flex-shrink-0">✕</button>
              </div>
            </div>
          ))}
          <button onClick={addSymptom} className="text-xs text-green-600 hover:text-green-700 font-medium transition-colors py-1.5 px-3 rounded-lg bg-green-50/50 hover:bg-green-100/50 border border-dashed border-green-300 hover:border-green-400 w-full sm:w-auto">+ 添加症状</button>
        </div>

        <div className="mt-4"><label className="block text-sm text-ink-500 mb-1.5">所问何事 <span className="text-ink-300">(选填)</span></label><input type="text" className="input-field" value={question} onChange={e => setQuestion(e.target.value)} placeholder="如：最近总是疲劳，如何调理..." /></div>
        <button onClick={handleCalculate} disabled={loading} className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-kai text-lg font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50">{loading ? '分析中...' : '开始分析'}</button>
      </div>

      {result && (<div className="mt-8 space-y-6 animate-fade-in">
        {/* 五运六气 Overview */}
        <div className="card text-center">
          <div className="text-4xl mb-2">🌿</div>
          <h2 className="text-xl font-bold font-kai text-ink-800">{result.yearGan}{result.yearZhi}年 · {result.yearYun}</h2>
          <p className="text-sm text-ink-500 mt-1">{result.sitian}司天 · {result.zaiquan}在泉</p>
          <p className="text-xs text-ink-400 mt-2">{result.summary}</p>
        </div>

        {/* Birth year + dryness/dampness */}
        {result.birthYun && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="card bg-gradient-to-br from-purple-50/40 to-white border-purple-100">
              <h4 className="font-bold text-purple-700 font-kai text-sm mb-2">🎂 先天运气</h4>
              <p className="text-xs text-ink-600">生于{result.birthYun.gan}{result.birthYun.zhi}年 · {result.birthYun.yearYun}</p>
              <p className="text-xs text-ink-500 mt-1">{result.birthYun.sitian}司天 · {result.birthYun.zaiquan}在泉</p>
              <p className="text-xs text-purple-600 mt-1">{result.birthYun.analysis}</p>
            </div>
            {result.drynessDampness && (
              <div className={`card border ${result.drynessDampness.level.includes('燥') ? 'bg-gradient-to-br from-amber-50/40 to-white border-amber-200' : result.drynessDampness.level.includes('湿') ? 'bg-gradient-to-br from-blue-50/40 to-white border-blue-200' : 'bg-gradient-to-br from-green-50/40 to-white border-green-200'}`}>
                <h4 className="font-bold text-ink-700 font-kai text-sm mb-2">🌡 燥湿分析</h4>
                <p className="text-xs font-bold text-ink-700">{result.drynessDampness.level}</p>
                <p className="text-xs text-ink-500 mt-1">{result.drynessDampness.desc}</p>
                <p className="text-xs text-ink-600 mt-1">💡 {result.drynessDampness.advice}</p>
              </div>
            )}
          </div>
        )}

        {/* Bazi wuxing */}
        {result.baziWuxing && (
          <div className="card">
            <h3 className="font-bold text-ink-700 font-kai mb-2 text-center text-sm">八字五行分布</h3>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {Object.entries(result.baziWuxing).map(([wx, count]: any) => (
                <div key={wx} className="p-1.5 rounded-lg bg-ink-50">
                  <div className="text-[10px] text-ink-400">{wx}</div>
                  <div className="text-lg font-bold text-ink-700">{count}</div>
                  <div className="w-full h-1 bg-ink-200 rounded-full mt-1"><div className="h-1 rounded-full bg-green-500" style={{width:`${Math.min(count/4*100,100)}%`}} /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 六气阶段 */}
        <div className="card">
          <h3 className="font-bold text-ink-700 font-kai mb-3 text-center">六气阶段</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
            {result.hostQi.map((h: any, i: number) => (
              <div key={i} className={`text-center p-1.5 sm:p-2 rounded-lg ${i === result.currentStep ? 'bg-green-100 border-2 border-green-400' : 'bg-ink-50'}`}>
                <div className="text-[10px] text-ink-500">{['初', '二', '三', '四', '五', '终'][i]}</div>
                <div className="text-[11px] font-bold text-ink-700 font-kai mt-0.5">{h.name.slice(0, 2)}</div>
                <div className="text-[10px] text-ink-400">{h.wuxing}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-400 mt-3 text-center">{result.dailyTip?.slice(0, 150)}...</p>
        </div>

        {/* 体质分析 */}
        <div className="card">
          <h3 className="font-bold text-ink-700 font-kai mb-3 text-center">中医体质分析</h3>
          <div className="text-center mb-3">
            <span className="text-lg font-bold font-kai" style={{ color: CONSTITUTION_COLORS[result.constitution?.primary] || '#22c55e' }}>{result.constitution?.primary || '未知'}</span>
            <span className="text-xs text-ink-400 ml-2">主要体质倾向</span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(result.constitution?.scores || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([k, v]: any) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-16 text-xs text-ink-500 font-kai text-right">{k}</span>
                <div className="flex-1 h-4 bg-ink-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(v, 100)}%`, backgroundColor: CONSTITUTION_COLORS[k] || '#22c55e' }} />
                </div>
                <span className="text-xs text-ink-400 w-8">{v}分</span>
              </div>
            ))}
          </div>
        </div>

        {/* 脏腑状态 */}
        <div className="card">
          <h3 className="font-bold text-ink-700 font-kai mb-3 text-center">脏腑五行状态</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
            {Object.entries(result.organStatus || {}).map(([organ, detail]: any) => (
              <div key={organ} className={`p-2 rounded-lg ${detail.status === '过旺' ? 'bg-red-50 border border-red-200' : detail.status === '过弱' ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="text-sm font-bold font-kai text-ink-700">{organ}</div>
                <div className={`text-[10px] font-medium mt-0.5 ${detail.status === '过旺' ? 'text-red-600' : detail.status === '过弱' ? 'text-amber-600' : 'text-green-600'}`}>{detail.status}</div>
                {detail.detail && <div className="text-[9px] text-ink-400 mt-1 leading-tight">{detail.detail.slice(0,30)}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* 体重管理·中医分析 */}
        {result.weightAnalysis && (
          <div className="card bg-gradient-to-br from-amber-50/40 to-white border-amber-200">
            <h3 className="font-bold text-ink-700 font-kai mb-3 text-center">⚖️ 体重管理·中医分析</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3 text-center">
              <div className="p-2 rounded-lg bg-white/60">
                <div className="text-2xl font-bold text-ink-800">{result.weightAnalysis.bmi}</div>
                <div className="text-[10px] text-ink-400">BMI</div>
              </div>
              <div className="p-2 rounded-lg bg-white/60">
                <div className={`text-sm font-bold ${result.weightAnalysis.bmiCategory === '正常' ? 'text-green-600' : result.weightAnalysis.bmiCategory.includes('瘦') ? 'text-amber-600' : 'text-red-500'}`}>{result.weightAnalysis.bmiCategory}</div>
                <div className="text-[10px] text-ink-400">BMI分类</div>
              </div>
              <div className="p-2 rounded-lg bg-white/60">
                <div className="text-sm font-bold text-purple-600 font-kai">{result.weightAnalysis.tcmBodyType}</div>
                <div className="text-[10px] text-ink-400">《灵枢》体型</div>
              </div>
            </div>
            <div className="mb-2 p-2.5 rounded-lg bg-red-50/50 border border-red-100">
              <p className="text-xs font-medium text-red-700 mb-0.5">中医证型</p>
              <p className="text-xs text-ink-600">{result.weightAnalysis.tcmPattern}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <div className="p-2.5 rounded-lg bg-yellow-50/50 border border-yellow-100">
                <p className="text-xs font-medium text-yellow-700 mb-0.5">脾胃诊断</p>
                <p className="text-xs text-ink-600">{result.weightAnalysis.spleenStomachAnalysis}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100">
                <p className="text-xs font-medium text-blue-700 mb-0.5">湿气诊断</p>
                <p className="text-xs text-ink-600">{result.weightAnalysis.dampnessLevel}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-green-50/50 border border-green-100">
                <p className="text-xs font-medium text-green-700 mb-0.5">🍵 饮食建议</p>
                <p className="text-xs text-ink-600">{result.weightAnalysis.dietaryAdvice}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50/50 border border-purple-100">
                <p className="text-xs font-medium text-purple-700 mb-0.5">📍 推荐穴位</p>
                <p className="text-xs text-ink-600">{(result.weightAnalysis.acupoints || []).join('、')}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-100">
                <p className="text-xs font-medium text-amber-700 mb-0.5">🏃 运动建议</p>
                <p className="text-xs text-ink-600">{result.weightAnalysis.exerciseAdvice}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-100">
                <p className="text-xs font-medium text-rose-700 mb-0.5">🌿 药食同源</p>
                <p className="text-xs text-ink-600">{(result.weightAnalysis.herbSuggestions || []).join('、')}</p>
              </div>
              {result.weightAnalysis.neijingQuotes?.length > 0 && (
                <div className="p-2.5 rounded-lg bg-ink-50/50 border border-ink-200">
                  <p className="text-xs font-medium text-ink-700 mb-0.5">📜 《黄帝内经》引用</p>
                  {result.weightAnalysis.neijingQuotes.map((q: string, i: number) => (
                    <p key={i} className="text-xs text-ink-500 italic leading-relaxed">{q}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 症状匹配 */}
        {result.symptomMatches?.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-ink-700 font-kai mb-3 text-center">症状辨证分析</h3>
            {result.symptomMatches.map((m: any, i: number) => (
              <div key={i} className="mb-3 p-3 bg-ink-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1"><span className="text-sm font-bold text-ink-700">{m.symptom}</span><span className="text-[10px] text-ink-400">{m.pattern}</span></div>
                <div className="text-xs text-ink-500">关联脏腑：{m.organs?.join('、') || '需进一步辨证'}</div>
                <div className="text-xs text-ink-500 mt-0.5">建议穴位：{m.acupoints?.join('、') || '-'}</div>
                <div className="text-xs text-green-600 mt-0.5">{m.advice}</div>
              </div>
            ))}
          </div>
        )}

        {/* AI CTA */}
        <div className="card bg-gradient-to-br from-green-50/50 to-emerald-50/50 border-green-100/40 text-center">
          <div className="text-2xl mb-2">💚</div><h3 className="text-lg font-bold text-green-700 font-kai mb-1">AI 深度健康解读</h3><p className="text-sm text-ink-500 mb-4">结合五运六气和您的症状，给出个性化饮食、穴位、运动、药膳全方位健康方案</p>
          <button onClick={handleGenerateReport} disabled={generating} className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-kai font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50">{generating ? '生成中...' : (token ? '查看AI深度解读' : '登录查看AI解读')}</button>
        </div>
      </div>)}

      {showPayment && <PaymentMethodSelector orderNo={orderNo} amount={orderAmount} onSuccess={handlePaymentSuccessAndGenerate} onCancel={() => setShowPayment(false)} />}
      <div className="mt-12 text-center text-xs text-ink-300"><p>五运六气分析仅供参考，不能替代专业医疗诊断</p><p className="mt-1">© 生辰 ShengRi · 传承国学智慧</p></div>
    </div>
  );
}

export default function HealthPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-20 text-center"><div className="animate-spin w-8 h-8 border-2 border-primary-300 border-t-primary-600 rounded-full mx-auto mb-4" /><p className="text-ink-400">加载中...</p></div>}>
      <HealthPageInner />
    </Suspense>
  );
}
