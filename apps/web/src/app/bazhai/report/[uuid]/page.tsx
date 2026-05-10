'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { bazhaiApi, shareApi } from '@/lib/api';
import { parseReportContent } from '@/lib/report-parser';
import type { Section, StructuredReport } from '@/lib/report-parser';
import PosterGenerator from '@/components/PosterGenerator';

const TRIGRAM_SYMBOLS: Record<string, string> = { '坎':'☵', '坤':'☷', '震':'☳', '巽':'☴', '乾':'☰', '兑':'☱', '艮':'☶', '离':'☲' };
const GROUP_LABELS: Record<string, string> = { 'east': '东四命', 'west': '西四命' };

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8ddd3" strokeWidth="4" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

function SectionCard({ section, index, locked }: { section: Section; index: number; locked: boolean }) {
  const isBlurred = locked && index > 0;

  return (
    <div className={`card relative ${isBlurred ? 'overflow-hidden' : ''}`}>
      {isBlurred && (
        <div className="absolute inset-0 z-10 backdrop-blur-md bg-white/60 flex flex-col items-center justify-center rounded-2xl">
          <span className="text-2xl mb-2">🔒</span>
          <span className="text-ink-500 text-sm font-medium">解锁完整报告查看</span>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-bold text-primary-700 font-kai">{section.title}</h3>
        {section.score !== undefined && <ScoreRing score={section.score} />}
      </div>

      <div className="text-ink-600 leading-relaxed whitespace-pre-wrap">{section.content}</div>

      {section.highlights && section.highlights.length > 0 && (
        <div className="mt-4 space-y-2">
          {section.highlights.map((h, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2 bg-gold-50 rounded-lg border border-gold-100">
              <span className="text-gold-500 mt-0.5 shrink-0">✦</span>
              <span className="text-sm text-ink-600">{h}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BazhaiReportPage() {
  const params = useParams();
  const router = useRouter();
  const uuid = (params as any)?.uuid as string;

  const [report, setReport] = useState<any>(null);
  const [parsed, setParsed] = useState<StructuredReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPoster, setShowPoster] = useState(false);
  const [referralLink, setReferralLink] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await bazhaiApi.getReport(uuid);
        const data = res.data as any;
        setReport(data);

        if (data.aiContent) {
          const p = parseReportContent(data.aiContent);
          setParsed(p);
        }
      } catch (err: any) {
        if (err?.response?.status === 401) {
          router.push(`/login?redirect=/bazhai/report/${uuid}`);
          return;
        }
        setError(err?.response?.data?.message || '报告加载失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [uuid, router]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary-300 border-t-primary-600 rounded-full mx-auto mb-4" />
        <p className="text-ink-400">加载报告中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={() => router.push('/bazhai')} className="text-primary-600 font-medium">
          ← 返回测算
        </button>
      </div>
    );
  }

  const locked = report?.locked || false;
  const bzRecord = report?.bzRecord;

  const handleOpenPoster = async () => {
    try {
      const res = await shareApi.create(uuid);
      const data = res.data as any;
      setReferralLink(data.shareUrl || `${window.location.origin}/bazhai/report/${uuid}`);
    } catch {
      setReferralLink(`${window.location.origin}/bazhai/report/${uuid}`);
    }
    setShowPoster(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => router.push('/bazhai')}
        className="flex items-center gap-1 text-ink-400 hover:text-ink-600 transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-sm">返回测算</span>
      </button>

      {/* Title + Share */}
      <div className="text-center mb-8 relative">
        <button
          onClick={handleOpenPoster}
          className="absolute right-0 top-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-600 text-xs font-medium border border-primary-200 hover:bg-primary-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.368-2.684 3 3 0 00-5.368 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          生成推广海报
        </button>
        <h1 className="text-2xl font-bold text-ink-800 font-kai">八宅风水报告</h1>
        {parsed?.overallScore !== undefined && (
          <div className="flex justify-center mt-4">
            <ScoreRing score={parsed.overallScore} size={80} />
          </div>
        )}
      </div>

      {/* Record info */}
      {bzRecord && (
        <div className="card mb-6 text-center">
          <div className="text-5xl mb-3">{TRIGRAM_SYMBOLS[bzRecord.trigram] || '?'}</div>
          <h2 className="text-xl font-bold font-kai text-ink-800">
            命卦 {bzRecord.kuaNumber} {bzRecord.trigram} · {GROUP_LABELS[bzRecord.group] || bzRecord.group}
          </h2>
          <div className="flex justify-center gap-4 mt-3 text-sm text-ink-500">
            <span>出生年份：{bzRecord.birthYear}</span>
            <span>性别：{bzRecord.gender === 1 ? '男' : '女'}</span>
          </div>
          {bzRecord.question && (
            <p className="text-sm text-ink-500 mt-2">
              <span className="text-ink-400">所问：</span>{bzRecord.question}
            </p>
          )}
          <div className="text-xs text-ink-400 mt-2">
            {new Date(bzRecord.createdAt).toLocaleString('zh-CN')}
          </div>
        </div>
      )}

      {/* AI Content */}
      {parsed && parsed.sections.length > 0 ? (
        <div className="space-y-4">
          {parsed.overview && (
            <div className="card">
              <h3 className="text-lg font-bold text-primary-700 font-kai mb-3">总览</h3>
              <p className="text-ink-600 leading-relaxed">{parsed.overview}</p>
            </div>
          )}

          {parsed.sections.map((section, i) => (
            <SectionCard key={i} section={section} index={i} locked={locked} />
          ))}

          {parsed.summary && !locked && (
            <div className="card bg-gold-50/50 border-gold-100/60">
              <h3 className="text-lg font-bold text-primary-700 font-kai mb-3">总结</h3>
              <p className="text-ink-600 leading-relaxed">{parsed.summary}</p>
            </div>
          )}

          {/* Tags */}
          {parsed.tags && parsed.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {parsed.tags.map((tag: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-xs font-medium border border-primary-100">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        report?.aiContent && (
          <div className="card">
            <div className="text-ink-600 leading-relaxed whitespace-pre-wrap">
              {report.aiContent}
            </div>
          </div>
        )
      )}

      {(!report?.aiContent || (parsed && parsed.sections.length === 0)) && (
        <div className="card text-center py-12">
          <p className="text-ink-400">AI解读尚未生成或正在处理中...</p>
        </div>
      )}

      {/* Upgrade CTA */}
      {locked && report?.upgradeProduct && (
        <div className="mt-6 card bg-gradient-to-br from-primary-50/50 to-gold-50/50 border-primary-100/40 text-center">
          <div className="text-2xl mb-2">🔓</div>
          <h3 className="text-lg font-bold text-primary-700 font-kai mb-1">解锁完整报告</h3>
          <p className="text-sm text-ink-500 mb-4">
            仅需 ¥{report.upgradeProduct.currentPrice} 即可查看完整的八宅风水深度解读
          </p>
          <Link
            href={`/products?type=bazhai`}
            className="inline-block px-8 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-kai font-bold shadow-md hover:shadow-lg transition-all"
          >
            立即解锁
          </Link>
        </div>
      )}

      {/* Operations CTA */}
      <div className="mt-10 rounded-2xl overflow-hidden" style={{
        background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 40%, #fde68a 100%)',
        border: '2px solid #fcd34d',
      }}>
        <div className="px-6 py-8 text-center">
          <div className="text-3xl mb-3">☯</div>
          <h3 className="text-xl font-bold font-kai text-amber-900 mb-2">你的家居风水如何？</h3>
          <p className="text-amber-700 text-sm mb-4 leading-relaxed">
            八宅风水 · 大游年法<br />
            命卦定吉凶，方位决兴衰
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all"
            >
              立即免费注册体验 →
            </Link>
            <Link
              href="/bazhai"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-white text-amber-700 font-medium text-sm border-2 border-amber-300 hover:bg-amber-50 transition-all"
            >
              再算一次
            </Link>
          </div>
          <p className="text-xs text-amber-500 mt-4">
            已有 50,000+ 用户通过生辰探索命理
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-amber-200 border-t border-amber-200 bg-white/50">
          {[
            { n: '8', label: '八卦方位' },
            { n: 'AI', label: '深度分析' },
            { n: '9星', label: '大游年诀' },
          ].map((item) => (
            <div key={item.label} className="py-3 text-center">
              <div className="text-lg font-bold text-amber-800 font-kai">{item.n}</div>
              <div className="text-[10px] text-amber-500">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-ink-300">
        <p>八宅风水仅供参考，人生选择由您做主</p>
        <p className="mt-1">© 生辰 ShengRi · 传承国学智慧</p>
      </div>

      {/* Poster Generator */}
      {showPoster && (
        <PosterGenerator
          referralLink={referralLink}
          onClose={() => setShowPoster(false)}
        />
      )}
    </div>
  );
}
