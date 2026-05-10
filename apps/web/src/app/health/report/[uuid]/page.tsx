'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { healthAnalysisApi, shareApi } from '@/lib/api';
import { parseReportContent } from '@/lib/report-parser';
import type { Section, StructuredReport } from '@/lib/report-parser';
import PosterGenerator from '@/components/PosterGenerator';

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 8) / 2; const c = 2 * Math.PI * r; const offset = c - (score / 100) * c;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (<div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
    <svg className="-rotate-90" width={size} height={size}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8ddd3" strokeWidth="4" /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease' }} /></svg>
    <span className="absolute text-sm font-bold" style={{ color }}>{score}</span>
  </div>);
}

function SectionCard({ section, index, locked }: { section: Section; index: number; locked: boolean }) {
  const isBlurred = locked && index > 0;
  return (<div className={`card relative ${isBlurred ? 'overflow-hidden' : ''}`}>
    {isBlurred && (<div className="absolute inset-0 z-10 backdrop-blur-md bg-white/60 flex flex-col items-center justify-center rounded-2xl"><span className="text-2xl mb-2">🔒</span><span className="text-ink-500 text-sm font-medium">解锁完整报告查看</span></div>)}
    <div className="flex items-start justify-between mb-4"><h3 className="text-lg font-bold text-green-700 font-kai">{section.title}</h3>{section.score !== undefined && <ScoreRing score={section.score} />}</div>
    <div className="text-ink-600 leading-relaxed whitespace-pre-wrap">{section.content}</div>
    {section.highlights && section.highlights.length > 0 && (<div className="mt-4 space-y-2">{section.highlights.map((h, i) => (<div key={i} className="flex items-start gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-100"><span className="text-green-500 mt-0.5 shrink-0">✦</span><span className="text-sm text-ink-600">{h}</span></div>))}</div>)}
  </div>);
}

export default function HealthReportPage() {
  const params = useParams(); const router = useRouter(); const uuid = (params as any)?.uuid as string;
  const [report, setReport] = useState<any>(null); const [parsed, setParsed] = useState<StructuredReport | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [showPoster, setShowPoster] = useState(false); const [referralLink, setReferralLink] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await healthAnalysisApi.getReport(uuid); const data = res.data as any; setReport(data);
        if (data.aiContent) { const p = parseReportContent(data.aiContent); setParsed(p); }
      } catch (err: any) {
        if (err?.response?.status === 401) { router.push(`/login?redirect=/health/report/${uuid}`); return; }
        setError(err?.response?.data?.message || '报告加载失败');
      } finally { setLoading(false); }
    }
    load();
  }, [uuid, router]);

  if (loading) return (<div className="max-w-2xl mx-auto px-4 py-20 text-center"><div className="animate-spin w-8 h-8 border-2 border-primary-300 border-t-primary-600 rounded-full mx-auto mb-4" /><p className="text-ink-400">加载报告中...</p></div>);
  if (error) return (<div className="max-w-2xl mx-auto px-4 py-20 text-center"><p className="text-red-500 mb-4">{error}</p><button onClick={() => router.push('/health')} className="text-green-600 font-medium">← 返回健康分析</button></div>);

  const locked = report?.locked || false; const haRecord = report?.haRecord;

  return (<div className="max-w-2xl mx-auto px-4 py-8">
    <button onClick={() => router.push('/health')} className="flex items-center gap-1 text-ink-400 hover:text-ink-600 transition-colors mb-6">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg><span className="text-sm">返回健康分析</span>
    </button>

    <div className="text-center mb-8">
      <h1 className="text-2xl font-bold text-ink-800 font-kai">五运六气健康养生报告</h1>
      {parsed?.overallScore !== undefined && (<div className="flex justify-center mt-4"><ScoreRing score={parsed.overallScore} size={80} /></div>)}
    </div>

    {haRecord && (<div className="card mb-6 text-center">
      <div className="text-4xl mb-3">🌿</div>
      <h2 className="text-xl font-bold font-kai text-ink-800">{haRecord.yearGan}{haRecord.yearZhi}年 · {haRecord.yearYun}</h2>
      <div className="flex justify-center gap-4 mt-2 text-sm text-ink-500"><span>司天：{haRecord.sitian}</span><span>在泉：{haRecord.zaiquan}</span></div>
      <div className="text-xs text-ink-400 mt-2">{new Date(haRecord.createdAt).toLocaleString('zh-CN')}</div>
    </div>)}

    {parsed && parsed.sections.length > 0 ? (<div className="space-y-4">
      {parsed.overview && (<div className="card"><h3 className="text-lg font-bold text-green-700 font-kai mb-3">总览</h3><p className="text-ink-600 leading-relaxed">{parsed.overview}</p></div>)}
      {parsed.sections.map((section, i) => (<SectionCard key={i} section={section} index={i} locked={locked} />))}
      {parsed.summary && !locked && (<div className="card bg-green-50/50 border-green-100/60"><h3 className="text-lg font-bold text-green-700 font-kai mb-3">总结</h3><p className="text-ink-600 leading-relaxed">{parsed.summary}</p></div>)}
      {parsed.tags && parsed.tags.length > 0 && (<div className="flex flex-wrap gap-2">{parsed.tags.map((tag: string, i: number) => (<span key={i} className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-medium border border-green-100">{tag}</span>))}</div>)}
    </div>) : (report?.aiContent && (<div className="card"><div className="text-ink-600 leading-relaxed whitespace-pre-wrap">{report.aiContent}</div></div>))}

    {(!report?.aiContent || (parsed && parsed.sections.length === 0)) && (<div className="card text-center py-12"><p className="text-ink-400">AI解读尚未生成或正在处理中...</p></div>)}

    {locked && report?.upgradeProduct && (<div className="mt-6 card bg-gradient-to-br from-green-50/50 to-emerald-50/50 border-green-100/40 text-center">
      <div className="text-2xl mb-2">🔓</div><h3 className="text-lg font-bold text-green-700 font-kai mb-1">解锁完整报告</h3><p className="text-sm text-ink-500 mb-4">仅需 ¥{report.upgradeProduct.currentPrice} 即可查看完整的五运六气深度解读</p>
      <Link href="/products?type=health" className="inline-block px-8 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-kai font-bold shadow-md hover:shadow-lg transition-all">立即解锁</Link>
    </div>)}

    <div className="mt-8 text-center text-xs text-ink-300"><p>五运六气分析仅供参考，不能替代专业医疗诊断</p><p className="mt-1">© 生辰 ShengRi · 传承国学智慧</p></div>
    {showPoster && <PosterGenerator referralLink={referralLink} onClose={() => setShowPoster(false)} />}
  </div>);
}
