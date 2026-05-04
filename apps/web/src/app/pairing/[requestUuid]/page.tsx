'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { pairingApi } from '@/lib/api';
import { PairingStatusBadge, getPairingStatusLabel } from '@/components/pairing/PairingStatusBadge';
import { PairingChartSelector } from '@/components/pairing/PairingChartSelector';

const TYPE_LABELS: Record<string, string> = {
  personality: '性格匹配',
  career: '事业合作',
  wealth: '财运互补',
  hehun: '合婚分析',
  comprehensive: '综合配对',
};

export default function PairingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const requestUuid = params.requestUuid as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [showChartSelector, setShowChartSelector] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [acceptChartId, setAcceptChartId] = useState<number | null>(null);
  const [pricing, setPricing] = useState<Record<string, { price: number; freeCount: number; enabled: boolean }> | null>(null);
  const [freeTrial, setFreeTrial] = useState<{ hasFree: boolean; remaining: number; total: number } | null>(null);
  const [paying, setPaying] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await pairingApi.getRequest(requestUuid);
      setData(res.data);
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setCurrentUserId(user.id);
        } catch {}
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [requestUuid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isSelfService = data?.mode === 'self';
  const isInitiator = currentUserId === data?.initiator?.id;
  const isReceiver = currentUserId === data?.receiver?.id;
  const myChartConfigured = isInitiator ? data?.initiatorConfigured : data?.receiverConfigured;
  const otherChartConfigured = isInitiator ? data?.receiverConfigured : data?.initiatorConfigured;
  const otherUser = isInitiator ? data?.receiver : data?.initiator;

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await pairingApi.acceptRequest(requestUuid, acceptChartId || undefined);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('确定拒绝吗？')) return;
    setActionLoading(true);
    try {
      await pairingApi.rejectRequest(requestUuid);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfigureChart = async (chartId: number) => {
    setActionLoading(true);
    try {
      await pairingApi.configurePairing(requestUuid, chartId);
      setShowChartSelector(false);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  // Load pricing and free trial info
  useEffect(() => {
    if (data && (data.status === 1 || data.status === 3)) {
      pairingApi.getPricing().then((res) => setPricing(res.data)).catch(() => {});
      pairingApi.getFreeTrialStatus(requestUuid).then((res) => setFreeTrial(res.data)).catch(() => {});
    }
  }, [data?.status, data?.pairingType, requestUuid]);

  // Poll for status changes when analyzing
  useEffect(() => {
    if (data?.status === 4) {
      const interval = setInterval(() => {
        loadData();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [data?.status, loadData]);

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      await pairingApi.generateReport(requestUuid);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handlePayAndGenerate = async () => {
    if (!confirm(`确认支付 ¥${typePricing?.price} 生成配对报告？`)) return;
    setPaying(true);
    try {
      const res = await pairingApi.payWithBalance(requestUuid);
      if (res.data.success) {
        // After payment, trigger report generation
        await pairingApi.generateReport(requestUuid);
        loadData();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || '支付失败，请确认余额充足');
    } finally {
      setPaying(false);
    }
  };

  const typePricing = data?.pairingType && pricing ? pricing[data.pairingType] : null;
  const bothConfigured = data?.initiatorConfigured && data?.receiverConfigured;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 mt-3">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">{error || '配对请求不存在'}</p>
          <button onClick={() => router.back()} className="mt-3 text-sm text-primary-500">返回</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => router.back()} className="text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-medium text-gray-800">配对详情</h1>
          <div className="w-5" />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Status Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">配对状态</span>
            <PairingStatusBadge status={data.status} />
          </div>

          {isSelfService ? (
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">命盘A</p>
                <p className="text-sm font-medium text-gray-800">
                  {data.initiatorChart?.name || `${data.initiatorChart?.dayGan || ''}日主`}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {data.initiatorChart?.yearGan}{data.initiatorChart?.yearZhi}年 · {data.initiatorChart?.gender === 1 ? '男' : '女'}
                </p>
              </div>
              <div className="shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0 4 4 0 000 5.656l1.414 1.414m2.828-2.828l1.414-1.414a4 4 0 000-5.656 4 4 0 00-5.656 0" />
                  </svg>
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-1">
                  {TYPE_LABELS[data.pairingType] || data.pairingType}
                </p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">命盘B</p>
                <p className="text-sm font-medium text-gray-800">
                  {data.receiverChart?.name || `${data.receiverChart?.dayGan || ''}日主`}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {data.receiverChart?.yearGan}{data.receiverChart?.yearZhi}年 · {data.receiverChart?.gender === 1 ? '男' : '女'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 mb-4">
              {/* Initiator */}
              <div className="flex-1 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-primary-100 to-amber-100
                  flex items-center justify-center text-primary-600 font-bold text-lg overflow-hidden">
                  {data.initiator?.avatarUrl ? (
                    <img src={data.initiator.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (data.initiator?.nickname || data.initiator?.username || '?')[0]
                  )}
                </div>
                <p className="text-xs font-medium text-gray-700 mt-1.5 truncate">
                  {data.initiator?.nickname || data.initiator?.username || '用户'}
                </p>
                {data.initiatorChart && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    日主{data.initiatorChart.dayGan}
                  </p>
                )}
              </div>

              {/* Connection */}
              <div className="shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0 4 4 0 000 5.656l1.414 1.414m2.828-2.828l1.414-1.414a4 4 0 000-5.656 4 4 0 00-5.656 0" />
                  </svg>
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-1">
                  {TYPE_LABELS[data.pairingType] || data.pairingType}
                </p>
              </div>

              {/* Receiver */}
              <div className="flex-1 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-amber-100 to-primary-100
                  flex items-center justify-center text-primary-600 font-bold text-lg overflow-hidden">
                  {data.receiver?.avatarUrl ? (
                    <img src={data.receiver.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (data.receiver?.nickname || data.receiver?.username || '?')[0]
                  )}
                </div>
                <p className="text-xs font-medium text-gray-700 mt-1.5 truncate">
                  {data.receiver?.nickname || data.receiver?.username || '用户'}
                </p>
                {data.receiverChart && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    日主{data.receiverChart.dayGan}
                  </p>
                )}
              </div>
            </div>
          )}

          {data.message && (
            <div className="bg-gray-50 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-500">留言：{data.message}</p>
            </div>
          )}
        </div>

        {/* Actions based on status */}
        {/* Pending - receiver can accept/reject */}
        {data.status === 0 && isReceiver && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-800 mb-3">处理配对请求</h3>

            {/* Chart selection before accepting */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">
                选择要用于配对的命盘（可选，接受后也可配置）
              </p>
              <PairingChartSelector
                selectedChartId={acceptChartId}
                onSelect={(id) => setAcceptChartId(id)}
                disabled={actionLoading}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium
                  hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? '处理中...' : '同意配对'}
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium
                  hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                拒绝
              </button>
            </div>
          </div>
        )}

        {/* Accepted / Configuring - chart selection (social only) */}
        {!isSelfService && (data.status === 1 || data.status === 3) && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-800 mb-3">配置命盘</h3>

            {myChartConfigured ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 rounded-xl text-sm text-green-700 mb-3">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                你已配置命盘
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  请选择你的命盘用于配对分析
                </p>
                {showChartSelector ? (
                  <PairingChartSelector
                    onSelect={handleConfigureChart}
                    disabled={actionLoading}
                  />
                ) : (
                  <button
                    onClick={() => setShowChartSelector(true)}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl
                      text-sm text-gray-500 hover:border-primary-300 hover:text-primary-500 transition-colors"
                  >
                    + 选择命盘
                  </button>
                )}
              </>
            )}

            {!otherChartConfigured && (
              <p className="text-xs text-gray-400 mt-3 text-center">
                等待对方配置命盘...
              </p>
            )}
          </div>
        )}

        {/* Both charts configured — show generate/pay action */}
        {(data.status === 3) && bothConfigured && !data.isPaid && !data.freeTrial && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-800 mb-3">生成配对报告</h3>

            {freeTrial?.hasFree ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 rounded-xl text-sm text-green-700 mb-3">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  剩余免费体验 {freeTrial.remaining}/{freeTrial.total} 次
                </div>
                <button
                  onClick={handleGenerateReport}
                  disabled={generating}
                  className="w-full px-4 py-3 bg-green-500 text-white rounded-xl text-sm font-medium
                    hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  {generating ? '生成中...' : '免费生成报告'}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 rounded-xl text-sm text-amber-700 mb-3">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  免费次数已用完
                  {freeTrial && <span>（已用 {freeTrial.total} 次）</span>}
                </div>
                {typePricing && (
                  <p className="text-xs text-gray-500 mb-3 text-center">
                    付费解锁完整报告：
                    <span className="text-base font-bold text-primary-600">¥{typePricing.price}</span>
                  </p>
                )}
                <button
                  onClick={handlePayAndGenerate}
                  disabled={paying}
                  className="w-full px-4 py-3 bg-gradient-to-r from-primary-500 to-amber-500
                    text-white rounded-xl text-sm font-medium hover:from-primary-600 hover:to-amber-600
                    disabled:opacity-50 transition-all"
                >
                  {paying ? '支付中...' : `余额支付 ¥${typePricing?.price || '—'}`}
                </button>
              </>
            )}
          </div>
        )}

        {/* Analyzing */}
        {data.status === 4 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-50 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
            </div>
            <h3 className="text-sm font-medium text-gray-800 mb-1">AI 正在分析中</h3>
            <p className="text-xs text-gray-400">
              正在进行八字配对分析，请稍候...
            </p>
          </div>
        )}

        {/* Completed - show report */}
        {data.status === 5 && data.report && (
          <>
            {/* Score Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-800 mb-4">配对报告</h3>

              {data.report.ruleResults && (
                <>
                  {/* Total Score */}
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full
                      bg-gradient-to-br from-primary-50 to-amber-50 border-4 border-primary-100">
                      <div className="text-center">
                        <span className="text-2xl font-bold text-primary-600">
                          {data.report.ruleResults.totalScore}
                        </span>
                        <span className="text-xs text-primary-400 block -mt-1">分</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-700 mt-2">
                      {data.report.ruleResults.level}
                    </p>
                  </div>

                  {/* Dimension Scores */}
                  <div className="space-y-2 mb-4">
                    {data.report.ruleResults.scores && Object.entries(data.report.ruleResults.scores).map(([key, val]: [string, any]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-20 shrink-0">{key}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary-400 to-amber-400 rounded-full transition-all"
                            style={{ width: `${typeof val === 'number' ? val : 50}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">
                          {typeof val === 'number' ? val : val}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* AI Summary */}
              {data.report.aiSummary && (
                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <p className="text-xs text-gray-600 leading-relaxed">{data.report.aiSummary}</p>
                </div>
              )}

              {/* Highlights */}
              {data.report.ruleResults?.highlights?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-1.5">配对优势</p>
                  {data.report.ruleResults.highlights.map((h: string, i: number) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-green-600 mb-1">
                      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {h}
                    </div>
                  ))}
                </div>
              )}

              {/* Cautions */}
              {data.report.ruleResults?.cautions?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-1.5">注意事项</p>
                  {data.report.ruleResults.cautions.map((c: string, i: number) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-amber-600 mb-1">
                      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {c}
                    </div>
                  ))}
                </div>
              )}

              {/* Full AI Content - rendered as formatted Markdown sections */}
              {data.report.aiContent && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {(() => {
                    // Simple Markdown section parser for AI output
                    const text = data.report.aiContent;
                    // Remove JSON artifacts if any
                    const cleaned = text.replace(/^[\[\{].*[\}\]]\s*/s, '').trim();
                    // Split by ## headings
                    const sections = cleaned.split(/\n(?=## )/);
                    return sections.map((section: string, idx: number) => {
                      const lines = section.trim().split('\n');
                      const heading = lines[0].replace(/^##\s*/, '');
                      const body = lines.slice(1).join('\n').trim();
                      if (!heading && !body) return null;
                      return (
                        <div key={idx} className="mb-4 last:mb-0">
                          {heading && (
                            <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                              <span className="w-1 h-4 bg-primary-400 rounded-full" />
                              {heading}
                            </h4>
                          )}
                          {body && (
                            <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap pl-3">
                              {body.split('\n').map((line: string, i: number) => {
                                // Bold markers
                                const rendered = line
                                  .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-800">$1</strong>')
                                  .replace(/^- /, '• ');
                                return (
                                  <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: rendered }} />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Chat Button */}
            <button
              onClick={() => router.push(`/pairing/${requestUuid}/chat`)}
              className="w-full px-4 py-3 bg-gradient-to-r from-primary-500 to-amber-500
                text-white rounded-xl text-sm font-medium hover:from-primary-600 hover:to-amber-600
                shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {isSelfService ? '进入分析对话' : '进入配对对话'}
            </button>
          </>
        )}

        {/* Rejected */}
        {data.status === 2 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
            <div className="text-4xl text-gray-200 mb-3">☯</div>
            <p className="text-sm text-gray-500">配对请求已被拒绝</p>
          </div>
        )}

        {/* Cancelled */}
        {data.status === 6 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
            <div className="text-4xl text-gray-200 mb-3">☯</div>
            <p className="text-sm text-gray-500">配对请求已取消</p>
          </div>
        )}
      </div>
    </div>
  );
}
