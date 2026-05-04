'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { shareApi } from '@/lib/api';
import { REPORT_TYPE_LABELS, SHARE_PAGE, PLATFORM_STATS } from '@/lib/constants';
import { parseReportContent } from '@/lib/report-parser';
import type { StructuredReport } from '@/lib/report-parser';

interface SharedReportClientProps {
  token: string;
  initialData: any;
  referrerId: string;
}

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
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

export default function SharedReportClient({ token, initialData, referrerId }: SharedReportClientProps) {
  const router = useRouter();
  const [data, setData] = useState<any>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [structured, setStructured] = useState<StructuredReport | null>(null);

  useEffect(() => {
    // Store referrer for registration tracking
    if (referrerId) {
      try { sessionStorage.setItem('ref', referrerId); } catch { /* noop */ }
    }

    if (!initialData) {
      shareApi.getSharedReport(token)
        .then((res) => {
          setData(res.data);
          const parsed = parseReportContent(res.data?.report?.aiContent || '', res.data?.report?.reportType);
          if (parsed) setStructured(parsed);
        })
        .catch((err) => {
          setError(err?.response?.status === 404
            ? SHARE_PAGE.notFound
            : '加载分享内容失败，请稍后重试');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
      const parsed = parseReportContent(initialData?.report?.aiContent || '', initialData?.report?.reportType);
      if (parsed) setStructured(parsed);
    }
  }, [token, initialData, referrerId]);

  const report = data?.report;
  const sharer = data?.sharer;
  const stats = data?.stats;
  const reportType = report?.reportType || '';
  const typeLabel = REPORT_TYPE_LABELS[reportType] || reportType;

  const sections = structured?.sections || [];
  const visibleSections = sections.slice(0, 2);
  const lockedSections = sections.slice(2);
  const overallScore = structured?.overallScore;

  // Loading
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="space-y-4">
          <div className="h-6 rounded w-1/3 mx-auto skeleton-shimmer" />
          <div className="h-4 rounded w-2/3 mx-auto skeleton-shimmer" />
          <div className="h-32 rounded-2xl mt-8 skeleton-shimmer" />
          <div className="h-32 rounded-2xl skeleton-shimmer" />
        </div>
      </div>
    );
  }

  // Error / Not Found
  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="card">
          <div className="text-5xl mb-4">📄</div>
          <h1 className="text-xl font-bold text-ink-600 mb-2 font-kai">
            {error || SHARE_PAGE.notFound}
          </h1>
          <p className="text-ink-400 text-sm mb-6">{SHARE_PAGE.platformIntro}</p>
          <button className="btn-gold px-8" onClick={() => router.push('/')}>
            {SHARE_PAGE.notFoundCTA}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Sharer Header — 社交证明 */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-sm font-kai shrink-0 ring-2 ring-gold-200/40">
            {(sharer?.nickname || '用')[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-ink-700 font-medium truncate">
              <span className="font-bold font-kai">{sharer?.nickname || '用户'}</span>
              <span className="text-ink-400 font-normal ml-1">{SHARE_PAGE.sharerSuffix}</span>
            </p>
            <p className="text-xs text-ink-400 mt-0.5">{SHARE_PAGE.limitedTime}</p>
          </div>
        </div>

        {/* Report Card — 内容预览 */}
        <div className="card text-center">
          {/* Type badge */}
          {typeLabel && (
            <span className="inline-block px-3 py-1 text-xs rounded-full bg-gold-100 text-gold-700 font-medium border border-gold-200/60 mb-3">
              {typeLabel}
            </span>
          )}

          <h1 className="text-xl md:text-2xl font-bold font-kai text-primary-700 mb-3">
            {structured?.title || typeLabel}
          </h1>

          {overallScore !== undefined && (
            <div className="flex flex-col items-center mb-3">
              <ScoreRing score={overallScore} size={80} />
              <span className="text-xs text-ink-400 mt-1">综合评分</span>
            </div>
          )}

          {structured?.overview && (
            <p className="text-ink-600 text-sm leading-relaxed max-w-lg mx-auto">
              {structured.overview}
            </p>
          )}

          {(structured?.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {structured!.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-0.5 bg-gold-50 text-gold-700 text-xs rounded-full border border-gold-100">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Visible Sections (前2节完整可见) */}
        {visibleSections.map((sec, i) => (
          <div key={i} className="card">
            <h3 className="text-lg font-bold text-primary-700 font-kai mb-3">{sec.title}</h3>
            <div className="text-ink-600 text-sm leading-relaxed whitespace-pre-wrap">{sec.content}</div>
            {sec.highlights && sec.highlights.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {sec.highlights.map((h, j) => (
                  <div key={j} className="flex items-start gap-2 px-3 py-2 bg-gold-50 rounded-lg border border-gold-100 text-sm text-ink-600">
                    <span className="text-gold-500 mt-0.5 shrink-0">✦</span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Locked Sections (模糊锁定 — 好奇心缺口) */}
        {lockedSections.length > 0 && (
          <div className="card relative overflow-hidden">
            <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-white/50 flex flex-col items-center justify-center rounded-2xl">
              <span className="text-2xl mb-2">🔒</span>
              <span className="text-ink-500 text-sm font-medium">{SHARE_PAGE.lockedHint}</span>
            </div>
            {lockedSections.map((sec, i) => (
              <div key={i} className={i > 0 ? 'mt-4 pt-4 border-t border-ink-100' : ''}>
                <h3 className="text-base font-bold text-ink-500 font-kai mb-2">{sec.title}</h3>
                <div className="text-ink-400 text-sm leading-relaxed whitespace-pre-wrap opacity-50">
                  {sec.content.slice(0, 120)}{sec.content.length > 120 ? '...' : ''}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* If only 2 or fewer sections, show a locked hint card */}
        {lockedSections.length === 0 && sections.length > 0 && (
          <div className="card text-center border-ink-100 bg-ink-50/60">
            <span className="text-2xl mb-2 block">🔒</span>
            <p className="text-sm text-ink-500">{SHARE_PAGE.lockedHint}</p>
          </div>
        )}

        {/* Stats row */}
        {stats && (
          <div className="text-center text-xs text-ink-400">
            {SHARE_PAGE.viewCountPrefix}{stats.viewCount || 0}{SHARE_PAGE.viewCountSuffix}
          </div>
        )}

        {/* === 转化 CTA 区域 === */}
        <div className="card bg-gradient-to-br from-primary-50 via-gold-50 to-primary-50 border-primary-200 text-center py-8">
          <p className="text-lg font-bold text-primary-700 font-kai mb-2">
            {SHARE_PAGE.primaryCTA}
          </p>
          <p className="text-ink-500 text-sm mb-5">
            {SHARE_PAGE.description}
          </p>

          {/* 主 CTA */}
          <button
            className="btn-gold text-lg px-10 py-3 shadow-lg shadow-gold-200/40"
            onClick={() => router.push(referrerId ? `/?ref=${referrerId}` : '/')}
          >
            {SHARE_PAGE.primaryCTA}
          </button>

          {/* 次 CTA */}
          {report?.uuid && (
            <button
              className="block mx-auto mt-3 text-sm text-ink-400 hover:text-primary-600 transition-colors"
              onClick={() => router.push(`/login?redirect=/report/${report.uuid}`)}
            >
              {SHARE_PAGE.secondaryCTA} →
            </button>
          )}
        </div>

        {/* Trust / 平台信任区 */}
        <div className="text-center space-y-3 pb-6">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div>
              <span className="font-bold font-kai text-primary-700">{PLATFORM_STATS.totalUsers}</span>
              <span className="text-ink-400 text-xs ml-1">用户</span>
            </div>
            <div className="w-px h-4 bg-ink-200" />
            <div>
              <span className="font-bold font-kai text-primary-700">{PLATFORM_STATS.totalReports}</span>
              <span className="text-ink-400 text-xs ml-1">报告</span>
            </div>
          </div>

          <p className="text-xs text-ink-400">{SHARE_PAGE.platformDesc}</p>
          <p className="text-xs text-ink-300">{SHARE_PAGE.privacyNote}</p>

          {/* Footer */}
          <p className="text-xs text-ink-300 pt-4">{SHARE_PAGE.footer}</p>
        </div>
      </div>
    </div>
  );
}
