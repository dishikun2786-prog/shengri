'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { reportApi, orderApi } from '@/lib/api';
import { REPORT_TYPE_LABELS as TYPE_LABELS } from '@/lib/constants';
import { parseReportContent } from '@/lib/report-parser';
import type { Section, StructuredReport, KeyYear } from '@/lib/report-parser';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import ShareModal from '@/components/ShareModal';
import MangpaiInsightCard from '@/components/report/MangpaiInsightCard';
import ChuanGongPanel from '@/components/report/ChuanGongPanel';

const LEVEL_STYLES: Record<string, string> = {
  good: 'bg-green-100 text-green-700 border-green-200',
  caution: 'bg-amber-100 text-amber-700 border-amber-200',
  risk: 'bg-red-100 text-red-700 border-red-200',
};

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

function SectionCard({ section, index, locked }: { section: Section; index: number; locked: boolean }) {
  const isBlurred = locked && index > 1;

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

      {section.yearMarks && section.yearMarks.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {section.yearMarks.map((ym) => (
            <span key={ym.year} className={`px-2 py-1 text-xs rounded-full border ${LEVEL_STYLES[ym.level]}`}>
              {ym.year} {ym.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function KeyYearsTimeline({ years }: { years: KeyYear[] }) {
  if (!years?.length) return null;

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-primary-700 font-kai mb-4">关键年份</h3>
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-2">
          {years.map((ky) => (
            <div
              key={ky.year}
              className={`flex flex-col items-center p-3 rounded-xl border min-w-[100px] transition-all ${
                ky.importance === 'high'
                  ? 'border-primary-300 bg-primary-50'
                  : 'border-ink-200 bg-white'
              }`}
            >
              <span className={`text-lg font-bold font-kai ${
                ky.importance === 'high' ? 'text-primary-600' : 'text-ink-600'
              }`}>
                {ky.year}
              </span>
              <span className="text-xs text-ink-500 mt-1 text-center leading-tight">{ky.event}</span>
              {ky.importance === 'high' && (
                <span className="mt-1 w-2 h-2 rounded-full bg-primary-500" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConsultantFAB({ uuid }: { uuid: string }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [bounced, setBounced] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setBounced(false), 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <button
      onClick={() => router.push(`/chat/${uuid}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`fixed bottom-20 md:bottom-6 right-6 z-[60] flex items-center gap-2
                  bg-gradient-to-r from-primary-600 to-gold-600 text-white
                  rounded-full shadow-lg hover:shadow-xl
                  transition-all duration-300 active:scale-95
                  ${bounced ? 'animate-bounce' : ''}`}
      style={{ padding: hovered ? '12px 20px' : '14px' }}
    >
      <span className="relative flex items-center justify-center w-6 h-6">
        <span className="absolute inset-0 rounded-full bg-gold-300/30" style={{ animation: 'pulse-ring 2.5s ease-out infinite' }} />
        <span className="relative text-lg leading-none">☯</span>
      </span>
      <span
        className="text-sm font-medium font-kai whitespace-nowrap overflow-hidden transition-all duration-300"
        style={{ maxWidth: hovered ? 80 : 0, opacity: hovered ? 1 : 0 }}
      >
        咨询顾问
      </span>
    </button>
  );
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const uuid = (params?.uuid as string) || '';
  const [report, setReport] = useState<any>(null);
  const [structured, setStructured] = useState<StructuredReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [orderAmount, setOrderAmount] = useState(0);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const loadReport = useCallback(() => {
    if (!uuid) return;
    reportApi.get(uuid)
      .then((res) => {
        setReport(res.data);
        const content = res.data.aiContent || '';
        const parsed = parseReportContent(content, res.data.reportType);
        if (parsed) setStructured(parsed);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [uuid]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const handleUnlock = async () => {
    if (!report) return;

    const reportTypeToProductId: Record<string, number> = {
      'free': 2,     // BASIC_REPORT_9
      'wealth': 3,   // WEALTH_REPORT
      'marriage': 4, // MARRIAGE_REPORT
      'annual': 5,   // ANNUAL_FORTUNE
      'career': 3,   // WEALTH_REPORT (复用)
      'partner': 3,  // WEALTH_REPORT (复用)
      'enterprise': 3, // WEALTH_REPORT (复用)
      'hehun': 4,    // MARRIAGE_REPORT (复用)
      'full': 6,     // FULL_ANALYSIS
    };

    let productId = report.upgradeProduct?.id || report.productId;
    if (!productId && report.reportType) {
      productId = reportTypeToProductId[report.reportType] || 3;
    }

    if (!productId) {
      alert('暂无可用的升级产品，请联系客服');
      return;
    }

    setCreatingOrder(true);
    try {
      const res = await orderApi.create({
        productId,
        chartId: report.chartId,
        reportId: report.id,
      });
      const data = res.data;
      setOrderNo(data.orderNo);
      setOrderAmount(Number(data.paidAmount || data.totalAmount || data.amount || 0));
      setShowPayment(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || '创建订单失败';
      alert(msg);
    } finally {
      setCreatingOrder(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setOrderNo(null);
    loadReport();
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="space-y-4">
          <div className="h-8 rounded w-1/3 mx-auto skeleton-shimmer" />
          <div className="h-4 rounded w-2/3 mx-auto skeleton-shimmer" />
          <div className="h-4 rounded w-1/2 mx-auto skeleton-shimmer" />
          <div className="h-32 rounded-2xl mt-8 skeleton-shimmer" />
          <div className="h-32 rounded-2xl skeleton-shimmer" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="card">
          <div className="text-4xl mb-4">📄</div>
          <h1 className="text-2xl font-bold text-ink-600 mb-2">报告未找到</h1>
          <p className="text-ink-400 mb-6">该报告可能已过期或链接无效</p>
          <button className="btn-primary" onClick={() => router.push('/')}>返回首页</button>
        </div>
      </div>
    );
  }

  if (structured) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="card text-center relative">
          <button
            onClick={() => setShowShareModal(true)}
            className="absolute top-0 right-0 btn-outline flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.368-2.684 3 3 0 00-5.368 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            分享报告
          </button>
          <h1 className="text-2xl md:text-3xl font-bold font-kai text-primary-700 mb-3">
            {structured.title || TYPE_LABELS[report.reportType] || '命理分析报告'}
          </h1>

          {structured.overallScore !== undefined && (
            <div className="flex flex-col items-center mb-4">
              <ScoreRing score={structured.overallScore} size={96} />
              <span className="text-sm text-ink-400 mt-2">综合评分</span>
            </div>
          )}

          <p className="text-ink-600 leading-relaxed max-w-xl mx-auto">{structured.overview}</p>

          {structured.tags?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {structured.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-gold-50 text-gold-700 text-sm rounded-full border border-gold-200">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Blind School Insight */}
        <MangpaiInsightCard ruleTags={report.ruleTags} ruleScores={report.ruleScores} />

        {/* Chuan Gong for annual reports */}
        {report.reportType === 'annual' && <ChuanGongPanel />}

        {/* Sections */}
        {structured.sections?.map((sec, i) => (
          <SectionCard key={i} section={sec} index={i} locked={report.locked} />
        ))}

        {/* Key Years Timeline */}
        {!report.locked && <KeyYearsTimeline years={structured.keyYears} />}

        {/* Summary */}
        {!report.locked && structured.summary && (
          <div className="card bg-gradient-to-br from-primary-50 to-gold-50 border-primary-200">
            <h3 className="text-lg font-bold text-primary-700 font-kai mb-2">总结</h3>
            <p className="text-ink-600 leading-relaxed">{structured.summary}</p>
          </div>
        )}

        {/* Upsell / Unlock */}
        {report.locked && (
          <div className="card bg-gradient-to-br from-primary-50 via-gold-50 to-primary-50 border-primary-200 text-center">
            <div className="text-3xl mb-3">✨</div>
            <p className="text-lg font-bold text-primary-700 mb-2">完整报告已生成</p>
            <p className="text-ink-500 text-sm mb-6 max-w-md mx-auto">
              {structured.upsellHint || report.upsellHook || '解锁完整报告，查看所有维度的深度分析和专属建议'}
            </p>
            {report.upgradeProduct && (
              <p className="text-gold-700 font-bold text-xl mb-4">
                ¥{Number(report.upgradeProduct.price).toFixed(2)}
              </p>
            )}
            <button
              className="btn-gold text-lg px-8 disabled:opacity-50"
              onClick={handleUnlock}
              disabled={creatingOrder}
            >
              {creatingOrder ? '创建订单中...' : '解锁完整报告'}
            </button>
          </div>
        )}

        {!report.locked && (structured.upsellHint || report.upsellHook) && (
          <div className="card text-center bg-ink-50 border-ink-200">
            <p className="text-sm text-ink-500">{structured.upsellHint || report.upsellHook}</p>
            <button className="btn-outline mt-3 text-sm" onClick={() => router.push('/')}>
              查看更多分析服务
            </button>
          </div>
        )}

        {/* bottom spacer for FAB */}
        <div className="h-20" />

        <ConsultantFAB uuid={uuid} />

        {showPayment && orderNo && (
          <PaymentMethodSelector
            orderNo={orderNo}
            amount={orderAmount}
            onSuccess={handlePaymentSuccess}
            onCancel={() => { setShowPayment(false); setOrderNo(null); }}
          />
        )}

        {showShareModal && (
          <ShareModal
            reportUuid={uuid}
            reportTitle={structured.title || TYPE_LABELS[report.reportType] || '命理分析报告'}
            reportType={report.reportType}
            overallScore={structured.overallScore}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </div>
    );
  }

  // Fallback: attempt structured extraction from raw content
  const fallbackStructured = parseReportContent(report.aiContent || '', report.reportType);
  if (fallbackStructured) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="card text-center relative">
          <button
            onClick={() => setShowShareModal(true)}
            className="absolute top-0 right-0 btn-outline flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.368-2.684 3 3 0 00-5.368 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            分享报告
          </button>
          <h1 className="text-2xl md:text-3xl font-bold font-kai text-primary-700 mb-3">
            {fallbackStructured.title || TYPE_LABELS[report.reportType] || '命理分析报告'}
          </h1>

          {fallbackStructured.overallScore !== undefined && (
            <div className="flex flex-col items-center mb-4">
              <ScoreRing score={fallbackStructured.overallScore} size={96} />
              <span className="text-sm text-ink-400 mt-2">综合评分</span>
            </div>
          )}

          {fallbackStructured.overview && (
            <p className="text-ink-600 leading-relaxed max-w-xl mx-auto">{fallbackStructured.overview}</p>
          )}

          {(fallbackStructured.tags?.length > 0 || report.ruleTags?.length > 0) && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {(fallbackStructured.tags?.length ? fallbackStructured.tags : report.ruleTags || []).map((tag: string) => (
                <span key={tag} className="px-3 py-1 bg-gold-50 text-gold-700 text-sm rounded-full border border-gold-200">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <MangpaiInsightCard ruleTags={report.ruleTags} ruleScores={report.ruleScores} />

        {report.reportType === 'annual' && <ChuanGongPanel />}

        {fallbackStructured.sections?.map((sec, i) => (
          <SectionCard key={i} section={sec} index={i} locked={report.locked} />
        ))}

        {report.locked && (
          <div className="card bg-gradient-to-br from-primary-50 via-gold-50 to-primary-50 border-primary-200 text-center">
            <div className="text-3xl mb-3">✨</div>
            <p className="text-lg font-bold text-primary-700 mb-2">完整报告已生成</p>
            <p className="text-ink-500 text-sm mb-6 max-w-md mx-auto">
              {report.upsellHook || '解锁完整报告，查看所有维度的深度分析和专属建议'}
            </p>
            <button
              className="btn-gold text-lg px-8 disabled:opacity-50"
              onClick={handleUnlock}
              disabled={creatingOrder}
            >
              {creatingOrder ? '创建订单中...' : '解锁完整报告'}
            </button>
          </div>
        )}

        {!report.locked && report.upsellHook && (
          <div className="card text-center bg-ink-50 border-ink-200">
            <p className="text-sm text-ink-500">{report.upsellHook}</p>
            <button className="btn-outline mt-3 text-sm" onClick={() => router.push('/')}>
              查看更多分析服务
            </button>
          </div>
        )}

        <div className="h-20" />
        <ConsultantFAB uuid={uuid} />

        {showPayment && orderNo && (
          <PaymentMethodSelector
            orderNo={orderNo}
            amount={orderAmount}
            onSuccess={handlePaymentSuccess}
            onCancel={() => { setShowPayment(false); setOrderNo(null); }}
          />
        )}

        {showShareModal && (
          <ShareModal
            reportUuid={uuid}
            reportTitle={fallbackStructured.title || TYPE_LABELS[report.reportType] || '命理分析报告'}
            reportType={report.reportType}
            overallScore={fallbackStructured.overallScore}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </div>
    );
  }

  // Ultimate fallback: sanitize any JSON-like characters and render as paragraphs
  const safeContent = (report.aiContent || '')
    .replace(/[{}\[\]"]/g, '')
    .replace(/\\n/g, '\n')
    .replace(/,\s*$/gm, '')
    .replace(/^\s*\w+\s*:\s*/gm, '')
    .trim();
  const paragraphs = safeContent.split(/\n{2,}/).filter((p: string) => p.trim().length > 10);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="card text-center relative">
        <button
          onClick={() => setShowShareModal(true)}
          className="absolute top-0 right-0 btn-outline flex items-center gap-1.5 px-3 py-1.5 text-xs"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.368-2.684 3 3 0 00-5.368 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          分享报告
        </button>
        <h1 className="text-2xl font-bold font-kai text-primary-700 mb-2">
          {TYPE_LABELS[report.reportType] || '命理分析报告'}
        </h1>
        {report.ruleTags?.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {report.ruleTags.map((tag: string) => (
              <span key={tag} className="px-3 py-1 bg-gold-50 text-gold-700 text-sm rounded-full border border-gold-200">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {paragraphs.map((p: string, i: number) => (
        <div key={i} className="card">
          <div className="text-ink-600 leading-relaxed whitespace-pre-wrap">{p.trim()}</div>
        </div>
      ))}

      {report.locked && (
        <div className="card bg-gradient-to-br from-primary-50 via-gold-50 to-primary-50 border-primary-200 text-center">
          <div className="text-3xl mb-3">✨</div>
          <p className="text-lg font-bold text-primary-700 mb-2">完整报告已生成</p>
          <p className="text-ink-500 text-sm mb-6 max-w-md mx-auto">
            {report.upsellHook || '解锁完整报告，查看所有维度的深度分析和专属建议'}
          </p>
          <button
            className="btn-gold text-lg px-8 disabled:opacity-50"
            onClick={handleUnlock}
            disabled={creatingOrder}
          >
            {creatingOrder ? '创建订单中...' : '解锁完整报告'}
          </button>
        </div>
      )}

      <div className="h-20" />
      <ConsultantFAB uuid={uuid} />

      {showPayment && orderNo && (
        <PaymentMethodSelector
          orderNo={orderNo}
          amount={orderAmount}
          onSuccess={handlePaymentSuccess}
          onCancel={() => { setShowPayment(false); setOrderNo(null); }}
        />
      )}

      {showShareModal && (
        <ShareModal
          reportUuid={uuid}
          reportTitle={TYPE_LABELS[report.reportType] || '命理分析报告'}
          reportType={report.reportType}
          overallScore={undefined}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
