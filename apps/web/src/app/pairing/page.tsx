'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { pairingApi } from '@/lib/api';
import { PairingRequestCard } from '@/components/pairing/PairingRequestCard';
import { PairingStatusBadge } from '@/components/pairing/PairingStatusBadge';

type TabKey = 'incoming' | 'outgoing' | 'completed' | 'self';

export default function PairingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('incoming');
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [selfRequests, setSelfRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [inRes, outRes, repRes, selfRes] = await Promise.all([
        pairingApi.getIncomingRequests({ size: 50 }),
        pairingApi.getOutgoingRequests({ size: 50 }),
        pairingApi.getPairingReports({ size: 50 }),
        pairingApi.getSelfPairingRequests({ size: 50 }),
      ]);
      setIncoming(inRes.data.requests || []);
      setOutgoing(outRes.data.requests || []);
      setReports(repRes.data.reports || []);
      setSelfRequests(selfRes.data.requests || []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, [loadData, router]);

  const handleAccept = async (uuid: string) => {
    setActionLoading(uuid);
    try {
      await pairingApi.acceptRequest(uuid);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (uuid: string) => {
    setActionLoading(uuid);
    try {
      await pairingApi.rejectRequest(uuid);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (uuid: string) => {
    if (!confirm('确定取消配对请求吗？')) return;
    setActionLoading(uuid);
    try {
      await pairingApi.cancelRequest(uuid);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewRequest = (uuid: string) => {
    router.push(`/pairing/${uuid}`);
  };

  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: 'incoming', label: '收到的请求', badge: incoming.filter((r) => r.status === 0).length },
    { key: 'outgoing', label: '发出的请求' },
    { key: 'self', label: '自选配对', badge: selfRequests.length },
    { key: 'completed', label: '配对报告', badge: reports.length },
  ];

  const TYPE_LABELS: Record<string, string> = {
    personality: '性格匹配',
    career: '事业合作',
    wealth: '财运互补',
    hehun: '合婚分析',
    comprehensive: '综合配对',
  };

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
          <h1 className="text-base font-medium text-gray-800">配对中心</h1>
          <div className="w-5" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 max-w-lg mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-sm font-medium relative transition-colors
                ${activeTab === tab.key ? 'text-primary-600' : 'text-gray-500'}`}
            >
              {tab.label}
              {tab.badge ? (
                <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                  {tab.badge}
                </span>
              ) : null}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto">
        {loading ? (
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white px-4 py-4 border-b border-gray-50">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
                    <div className="h-3 w-40 rounded bg-gray-100 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Incoming */}
            {activeTab === 'incoming' && (
              incoming.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-4xl text-gray-200 mb-3">☯</div>
                  <p className="text-gray-500 text-sm">暂无收到的配对请求</p>
                  <p className="text-gray-400 text-xs mt-1">去朋友圈发现更多朋友吧</p>
                </div>
              ) : (
                incoming.map((r) => (
                  <PairingRequestCard
                    key={r.uuid}
                    uuid={r.uuid}
                    pairingType={r.pairingType}
                    status={r.status}
                    message={r.message}
                    otherUser={r.initiator}
                    isIncoming
                    createdAt={r.createdAt}
                    onView={handleViewRequest}
                    onAccept={handleAccept}
                    onReject={handleReject}
                  />
                ))
              )
            )}

            {/* Outgoing */}
            {activeTab === 'outgoing' && (
              outgoing.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-4xl text-gray-200 mb-3">☯</div>
                  <p className="text-gray-500 text-sm">暂无发出的配对请求</p>
                  <p className="text-gray-400 text-xs mt-1">去朋友圈与他人配对分析吧</p>
                </div>
              ) : (
                outgoing.map((r) => (
                  <PairingRequestCard
                    key={r.uuid}
                    uuid={r.uuid}
                    pairingType={r.pairingType}
                    status={r.status}
                    message={r.message}
                    otherUser={r.receiver}
                    isIncoming={false}
                    createdAt={r.createdAt}
                    onView={handleViewRequest}
                    onCancel={handleCancel}
                  />
                ))
              )
            )}

            {/* Self-pairing */}
            {activeTab === 'self' && (
              <>
                <div className="px-4 py-3">
                  <button
                    onClick={() => router.push('/pairing/self/new')}
                    className="w-full py-3 bg-gradient-to-r from-primary-500 to-amber-500
                      text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2
                      hover:from-primary-600 hover:to-amber-600 transition-all shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    新建自选配对
                  </button>
                </div>
                {selfRequests.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-4xl text-gray-200 mb-3">☯</div>
                    <p className="text-gray-500 text-sm">暂无自选配对</p>
                    <p className="text-gray-400 text-xs mt-1">选择自己的两个命盘进行配对分析</p>
                  </div>
                ) : (
                  selfRequests.map((r) => (
                    <div
                      key={r.uuid}
                      onClick={() => router.push(`/pairing/${r.uuid}`)}
                      className="bg-white px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50
                        cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-amber-100
                          flex items-center justify-center text-primary-600 font-medium text-sm shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0 4 4 0 000 5.656l1.414 1.414m2.828-2.828l1.414-1.414a4 4 0 000-5.656 4 4 0 00-5.656 0" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">
                              {TYPE_LABELS[r.pairingType] || r.pairingType}
                            </span>
                            <PairingStatusBadge status={r.status} />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {r.chartA?.name || `${r.chartA?.dayGan || ''}日主`} vs {r.chartB?.name || `${r.chartB?.dayGan || ''}日主`}
                          </p>
                        </div>
                        <svg className="w-4 h-4 text-gray-300 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Completed Reports */}
            {activeTab === 'completed' && (
              reports.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-4xl text-gray-200 mb-3">☯</div>
                  <p className="text-gray-500 text-sm">暂无配对报告</p>
                  <p className="text-gray-400 text-xs mt-1">完成配对后报告将显示在这里</p>
                </div>
              ) : (
                reports.map((r) => (
                  <div
                    key={r.requestUuid}
                    onClick={() => router.push(`/pairing/${r.requestUuid}`)}
                    className="bg-white px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50
                      cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-amber-100
                        flex items-center justify-center text-primary-600 font-medium text-sm shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M13.828 10.172a4 4 0 00-5.656 0 4 4 0 000 5.656l1.414 1.414m2.828-2.828l1.414-1.414a4 4 0 000-5.656 4 4 0 00-5.656 0" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">
                            {TYPE_LABELS[r.pairingType] || r.pairingType}
                          </span>
                          <PairingStatusBadge status={5} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {r.initiator.nickname || r.initiator.username} & {r.receiver.nickname || r.receiver.username}
                        </p>
                        {r.report?.summary && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.report.summary}</p>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-gray-300 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
