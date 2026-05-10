'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { bazhaiApi, orderApi } from '@/lib/api';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';

const TRIGRAM_SYMBOLS: Record<number, string> = { 1:'☵', 2:'☷', 3:'☳', 4:'☴', 6:'☰', 7:'☱', 8:'☶', 9:'☲' };
const STAR_COLORS: Record<string, string> = { '上吉':'#16a34a', '中吉':'#65a30d', '次吉':'#0d9488', '次凶':'#ea580c', '中凶':'#f97316', '大凶':'#dc2626' };
const DIR_POSITIONS: Record<string, {x:number;y:number}> = { '南':{x:50,y:14},'西南':{x:84,y:30},'西':{x:90,y:50},'西北':{x:84,y:70},'北':{x:50,y:88},'东北':{x:16,y:70},'东':{x:10,y:50},'东南':{x:16,y:30} };

const TRIGRAM_LINES: Record<string, boolean[]> = {
  '乾': [true,true,true], '坤': [false,false,false],
  '离': [true,false,true], '坎': [false,true,false],
  '兑': [false,true,true], '艮': [true,false,false],
  '震': [false,false,true], '巽': [true,true,false],
};

function BazhaiPageInner() {
  const router = useRouter(); const searchParams = useSearchParams();
  const [birthYear, setBirthYear] = useState(1990); const [gender, setGender] = useState(1);
  const [question, setQuestion] = useState(''); const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false); const [generating, setGenerating] = useState(false);
  const [showPayment, setShowPayment] = useState(false); const [orderNo, setOrderNo] = useState(''); const [orderAmount, setOrderAmount] = useState(0);
  const [paidViaProduct, setPaidViaProduct] = useState(false); const [paidOrderNo, setPaidOrderNo] = useState('');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => { const p = searchParams?.get('paid')||'', o = searchParams?.get('orderNo')||''; if(p==='1'&&o){setPaidViaProduct(true);setPaidOrderNo(o);} }, [searchParams]);

  async function handleCalculate() {
    if (!token) { router.push('/login?redirect=/bazhai'); return; }
    setLoading(true);
    try { const res = await bazhaiApi.calculate({ birthYear, gender, question: question.trim()||undefined }); setResult(res.data as any); } catch (err: any) { alert(err?.response?.data?.message || '测算失败'); }
    finally { setLoading(false); }
  }

  function pollForReport() {
    let n=0; const iv=setInterval(async()=>{n++;try{const r=await bazhaiApi.getHistory(0,5);const m=(r.data as any)?.records?.find((x:any)=>x.birthYear===birthYear&&x.gender===gender&&x.reportUuid);if(m){clearInterval(iv);router.push(`/bazhai/report/${m.reportUuid}`);}}catch{}if(n>=60){clearInterval(iv);setGenerating(false);alert('报告生成超时，请在"我的报告"中查看');}},3000);
  }

  async function handleGenerateReport() {
    if(!token){router.push('/login?redirect=/bazhai');return;}
    if(!paidViaProduct){setGenerating(true);try{const r=await orderApi.getProducts();const p=(r.data as any[])?.find((x:any)=>x.reportType==='bazhai');if(!p){alert('产品未配置');setGenerating(false);return;}const o=await orderApi.create({productId:p.id});const d=o.data as any;if(d.orderNo){setOrderNo(d.orderNo);setOrderAmount(Number(d.paidAmount||p.currentPrice||39));setGenerating(false);setShowPayment(true);}}catch(e:any){alert(e?.response?.data?.message||'创建订单失败');setGenerating(false);}return;}
    setGenerating(true);bazhaiApi.generateReport({birthYear,gender,question:question.trim()||undefined,isPaid:true,orderNo:paidOrderNo}).then((r:any)=>{if(r?.data?.uuid)router.push(`/bazhai/report/${r.data.uuid}`);}).catch(()=>{});pollForReport();
  }
  async function handlePaymentSuccessAndGenerate() { setShowPayment(false);setPaidViaProduct(true);setGenerating(true);bazhaiApi.generateReport({birthYear,gender,question:question.trim()||undefined,isPaid:true,orderNo}).then((r:any)=>{if(r?.data?.uuid)router.push(`/bazhai/report/${r.data.uuid}`);}).catch(()=>{});pollForReport(); }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-6"><h1 className="text-3xl font-bold text-ink-800 font-kai">八宅风水 · 命卦测算</h1><p className="text-ink-400 mt-2 font-kai">大游年歌诀 · 八卦方位 · 吉凶布局</p></div>
      {/* 使用引导 */}
      <div className="mb-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-5 animate-fade-in">
        <div className="flex items-start gap-3 mb-3"><span className="text-2xl">🏠</span><div><h3 className="font-bold text-emerald-800 font-kai text-sm">八宅风水能帮你做什么？</h3><p className="text-xs text-ink-500 mt-0.5">输入出生年份和性别，即可推算你的命卦，洞察八方位吉凶，指导家居布局</p></div></div>
        <div className="flex flex-wrap gap-2"><span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-kai border border-emerald-100">🪟 大门朝向</span><span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-kai border border-emerald-100">🛏 卧室方位</span><span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-kai border border-emerald-100">🍳 厨房位置</span><span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-kai border border-emerald-100">📚 书房布局</span><span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-kai border border-emerald-100">🏢 办公室风水</span></div>
      </div>
      <div className="card animate-fade-in">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div><label className="block text-sm text-ink-500 mb-1.5">出生年份</label><input type="number" className="input-field text-center text-lg" value={birthYear} onChange={e=>setBirthYear(Number(e.target.value))} min={1900} max={2100} /></div>
          <div><label className="block text-sm text-ink-500 mb-1.5">性别</label><div className="flex gap-2">{[{v:1,l:'♂ 男'},{v:2,l:'♀ 女'}].map(o=>(<button key={o.v} onClick={()=>setGender(o.v)} className={`flex-1 py-2.5 rounded-lg text-lg font-medium transition-colors ${gender===o.v?'bg-primary-100 text-primary-700 border-2 border-primary-300':'bg-ink-50 text-ink-500 border border-ink-200'}`}>{o.l}</button>))}</div></div>
        </div>
        <div className="mt-4"><label className="block text-sm text-ink-500 mb-1.5">所问何事 <span className="text-ink-300">(选填)</span></label><input type="text" className="input-field" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="如：家居布局、办公室风水..." /></div>
        <button onClick={handleCalculate} disabled={loading} className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-gold-500 text-white font-kai text-lg font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50">{loading?'分析中...':'开始测算'}</button>
      </div>

      {result && (<div className="mt-8 space-y-6 animate-fade-in">
        <div className="card text-center">
          <div className="text-5xl mb-2">{TRIGRAM_SYMBOLS[result.kuaNumber]||'?'}</div>
          <h2 className="text-2xl font-bold font-kai text-ink-800">命卦 {result.kuaNumber}{result.trigram} · {result.groupLabel}</h2>
          <p className="text-sm text-ink-400 mt-1">{result.summary}</p>
        </div>

        {/* 八卦九宫方位图 — 古籍九宫格 */}
        <div className="card">
          <h3 className="font-bold text-ink-800 font-kai mb-1 text-center text-lg">八卦九宫方位图</h3>
          <p className="text-center text-xs text-ink-400 mb-4 font-kai">上南下北 · 左东右西</p>

          {/* 3x3 九宫格 */}
          <div className="grid grid-cols-3 border border-ink-200 rounded-xl overflow-hidden shadow-sm max-w-[360px] mx-auto">
            {/* Row 0 (top): 东南 | 南 | 西南 */}
            {(() => {
              const gridMap: Record<string, {row:number;col:number}> = {
                '东南':{row:0,col:0}, '南':{row:0,col:1}, '西南':{row:0,col:2},
                '东':{row:1,col:0}, '西':{row:1,col:2},
                '东北':{row:2,col:0}, '北':{row:2,col:1}, '西北':{row:2,col:2},
              };
              const grid: (any | null)[][] = [[null,null,null],[null,null,null],[null,null,null]];
              result.directions.forEach((d:any) => {
                const pos = gridMap[d.direction];
                if (pos) grid[pos.row][pos.col] = d;
              });

              return grid.flatMap((row, ri) =>
                row.map((d, ci) => {
                  // Center cell
                  if (ri === 1 && ci === 1) {
                    return (
                      <div key="center" className="flex flex-col items-center justify-center py-4 px-2 bg-gradient-to-br from-primary-50/40 to-gold-50/40 border border-ink-100"
                        style={{minHeight:100}}>
                        <span className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-50 to-gold-100 border-2 border-gold-300 flex items-center justify-center mb-2 shadow-sm">
                          <span className="text-gold-700 font-bold font-kai text-base">中</span>
                        </span>
                        <span className="text-[11px] text-ink-500 font-kai">中宫</span>
                        <span className="text-[10px] text-ink-400 mt-0.5 font-kai">{result.groupLabel}</span>
                      </div>
                    );
                  }

                  // Empty cell fallback
                  if (!d) return <div key={`empty-${ri}-${ci}`} className="border border-ink-100 bg-ink-50/30" style={{minHeight:100}} />;

                  const color = STAR_COLORS[d.luck] || '#6b7280';
                  const yaos = TRIGRAM_LINES[d.trigram] || [true,true,true];
                  const isLucky = d.luck.includes('吉');
                  const cellBg = isLucky ? 'bg-gradient-to-b from-green-50/40 to-white' : 'bg-gradient-to-b from-red-50/30 to-white';

                  return (
                    <div key={d.direction} className={`flex flex-col items-center justify-center py-3 px-1.5 border border-ink-100 ${cellBg} transition-colors hover:bg-ink-50/60`}
                      style={{minHeight:100}}>
                      {/* Trigram yao lines — inline SVG */}
                      <svg viewBox="0 0 20 14" className="w-5 h-3.5 mb-1.5" aria-label={d.trigram}>
                        {yaos.map((solid, li) => (
                          solid ? (
                            <line key={li} x1="3" y1={2 + li * 5} x2="17" y2={2 + li * 5} stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.8"/>
                          ) : (
                            <g key={li}>
                              <line x1="3" y1={2 + li * 5} x2="8.5" y2={2 + li * 5} stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.8"/>
                              <line x1="11.5" y1={2 + li * 5} x2="17" y2={2 + li * 5} stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.8"/>
                            </g>
                          )
                        ))}
                      </svg>

                      {/* Star name — primary hierarchy, colored by luck */}
                      <span className="text-sm font-bold font-kai leading-tight" style={{color}}>{d.star}</span>

                      {/* Direction + trigram — secondary hierarchy */}
                      <span className="text-[12px] text-ink-600 font-kai mt-0.5">{d.direction}方 · {d.trigram}</span>

                      {/* Short desc — tertiary */}
                      <span className="text-[10px] text-ink-400 mt-0.5 text-center leading-tight px-0.5">{d.mainAffair.slice(0,8)}</span>
                    </div>
                  );
                })
              );
            })()}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-5 mt-3 text-xs">
            <span className="flex items-center gap-1.5 text-ink-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500"/>吉星
            </span>
            <span className="flex items-center gap-1.5 text-ink-500">
              <span className="w-2 h-2 rounded-full bg-red-500"/>凶星
            </span>
          </div>
        </div>

        {/* Direction cards */}
        <div className="grid grid-cols-2 gap-3">
          {result.directions.filter((d:any)=>d.luck.includes('吉')).map((d:any,i:number)=>(<div key={i} className="card border-green-200 bg-green-50/30"><div className="flex items-center gap-2 mb-2"><span className="text-lg font-bold text-green-700">{d.direction}</span><span className="text-xs px-1.5 py-0.5 rounded" style={{backgroundColor:STAR_COLORS[d.luck]+'20',color:STAR_COLORS[d.luck]}}>{d.star}</span></div><p className="text-xs text-ink-600">{d.mainAffair}</p></div>))}
        </div>

        <div className="card bg-gradient-to-br from-primary-50/50 to-gold-50/50 border-primary-100/40 text-center">
          <div className="text-2xl mb-2">🏠</div><h3 className="text-lg font-bold text-primary-700 font-kai mb-1">AI 深度解读</h3><p className="text-sm text-ink-500 mb-4">全面分析八宅吉凶方位，给出具体空间布局和化解方案</p>
          <button onClick={handleGenerateReport} disabled={generating} className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-kai font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50">{generating?'生成中...':(token?'查看AI深度解读':'登录查看AI解读')}</button>
        </div>
      </div>)}

      {showPayment && <PaymentMethodSelector orderNo={orderNo} amount={orderAmount} onSuccess={handlePaymentSuccessAndGenerate} onCancel={()=>setShowPayment(false)} />}
      <div className="mt-12 text-center text-xs text-ink-300"><p>八宅风水仅供参考，人生选择由您做主</p><p className="mt-1">© 生辰 ShengRi · 传承国学智慧</p></div>
    </div>
  );
}

export default function BazhaiPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-20 text-center"><div className="animate-spin w-8 h-8 border-2 border-primary-300 border-t-primary-600 rounded-full mx-auto mb-4" /><p className="text-ink-400">加载中...</p></div>}>
      <BazhaiPageInner />
    </Suspense>
  );
}
