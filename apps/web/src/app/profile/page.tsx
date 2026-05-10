'use client';

import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { userApi, cardKeyApi, chatApi, pairingApi, xiaoliurenApi, digitalEnergyApi, bazhaiApi, healthAnalysisApi } from '@/lib/api';
import { REPORT_TYPE_LABELS } from '@/lib/constants';
import ShareModal from '@/components/ShareModal';
import PromotionTab from '@/components/PromotionTab';
import { PairingRequestCard } from '@/components/pairing/PairingRequestCard';
import { PairingStatusBadge } from '@/components/pairing/PairingStatusBadge';

const TYPE_LABELS: Record<string, string> = {
  personality: '性格匹配',
  career: '事业合作',
  wealth: '财运互补',
  hehun: '合婚分析',
  comprehensive: '综合配对',
};

const VIP_LABELS = ['普通用户', '基础会员', '高级会员', '企业会员'];

const GAN_WUXING_COLOR: Record<string, string> = {
  '甲': 'text-green-700', '乙': 'text-green-600',
  '丙': 'text-red-600', '丁': 'text-red-500',
  '戊': 'text-amber-700', '己': 'text-amber-600',
  '庚': 'text-yellow-600', '辛': 'text-yellow-500',
  '壬': 'text-blue-600', '癸': 'text-blue-500',
};

const XLR_PALM: Record<number, { name: string; wuxing: string; liushen: string; luck: string; direction: string; text: string }> = {
  1: { name: '大安', wuxing: '木', liushen: '青龙', luck: '大吉', direction: '东方', text: '大安事事昌，求谋在东方，失物不远去，宅舍保安康。' },
  2: { name: '留连', wuxing: '水', liushen: '玄武', luck: '凶', direction: '北方', text: '留连事难成，求谋日不明，官事只宜缓，去者未回程。' },
  3: { name: '速喜', wuxing: '火', liushen: '朱雀', luck: '中吉', direction: '南方', text: '速喜喜来临，求财向南行，失物申午未，逢人路上寻。' },
  4: { name: '赤口', wuxing: '金', liushen: '白虎', luck: '大凶', direction: '西方', text: '赤口主口舌，官非切要防，失物急去寻，行人有惊慌。' },
  5: { name: '小吉', wuxing: '水', liushen: '六合', luck: '小吉', direction: '北方', text: '小吉最吉昌，路上好商量，阴人来报喜，失物在坤方。' },
  6: { name: '空亡', wuxing: '土', liushen: '勾陈', luck: '大凶', direction: '中央', text: '空亡事不长，阴人小乘张，求财无利益，行人有灾殃。' },
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [tab, setTab] = useState<'reports' | 'charts' | 'chats' | 'pairing' | 'promotion'>('reports');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [chatsSubTab, setChatsSubTab] = useState<'ai' | 'pairing'>('ai');
  const [chartsSubTab, setChartsSubTab] = useState<'bazi' | 'xiaoliuren' | 'digital_energy' | 'bazhai' | 'health'>('bazi');
  const [xlrRecords, setXlrRecords] = useState<any[]>([]);
  const [xlrExpanded, setXlrExpanded] = useState<string | null>(null);
  const [deRecords, setDeRecords] = useState<any[]>([]);
  const [deExpanded, setDeExpanded] = useState<string | null>(null);
  const [bzRecords, setBzRecords] = useState<any[]>([]);
  const [healthRecords, setHealthRecords] = useState<any[]>([]);

  // Unified delete state for xiaoliuren / digital-energy / bazhai records
  const [deleteTargetRecord, setDeleteTargetRecord] = useState<any | null>(null);
  const [deleteRecordType, setDeleteRecordType] = useState<'xiaoliuren' | 'digital_energy' | 'bazhai' | 'health' | null>(null);
  const [showDeleteRecordModal, setShowDeleteRecordModal] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null);
  const [recordDeleteMsg, setRecordDeleteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pairing tab state
  const [pairingSubTab, setPairingSubTab] = useState<'incoming' | 'outgoing' | 'self' | 'completed'>('incoming');
  const [pairingIncoming, setPairingIncoming] = useState<any[]>([]);
  const [pairingOutgoing, setPairingOutgoing] = useState<any[]>([]);
  const [pairingSelf, setPairingSelf] = useState<any[]>([]);
  const [pairingReports, setPairingReports] = useState<any[]>([]);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingActionLoading, setPairingActionLoading] = useState<string | null>(null);
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteTargetChart, setDeleteTargetChart] = useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingChartId, setDeletingChartId] = useState<number | null>(null);
  const [chartDeleteMsg, setChartDeleteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteTargetReport, setDeleteTargetReport] = useState<any | null>(null);
  const [showDeleteReportModal, setShowDeleteReportModal] = useState(false);
  const [deletingReportId, setDeletingReportId] = useState<number | null>(null);
  const [reportDeleteMsg, setReportDeleteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteTargetSession, setDeleteTargetSession] = useState<any | null>(null);
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);
  const [sessionDeleteMsg, setSessionDeleteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [shareTarget, setShareTarget] = useState<any | null>(null);

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const [profileRes, reportsRes, chartsRes, sessionsRes] = await Promise.all([
        userApi.getProfile(),
        userApi.getReports(),
        userApi.getCharts(),
        chatApi.getSessions(),
      ]);
      if (profileRes?.data) setUser(profileRes.data);
      if (reportsRes?.data) setReports(Array.isArray(reportsRes.data) ? reportsRes.data : []);
      if (chartsRes?.data) setCharts(Array.isArray(chartsRes.data) ? chartsRes.data : []);
      if (sessionsRes?.data) setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
      // 小六壬历史
      xiaoliurenApi.getHistory(0, 50).then((r: any) => {
        if (r?.data?.records) setXlrRecords(r.data.records);
      }).catch(() => {});
      digitalEnergyApi.getHistory(0, 50).then((r: any) => {
        if (r?.data?.records) setDeRecords(r.data.records);
      }).catch(() => {});
      // 八宅风水历史
      bazhaiApi.getHistory(0, 50).then((r: any) => {
        if (r?.data?.records) setBzRecords(r.data.records);
      }).catch(() => {});
      healthAnalysisApi.getHistory(0, 50).then((r: any) => {
        if (r?.data?.records) setHealthRecords(r.data.records);
      }).catch(() => {});
    } catch (err: any) {
      const message = err?.response?.data?.message || '个人中心数据加载失败，请重试';
      console.error('PROFILE_LOAD_FAILED', {
        code: err?.response?.status || 'UNKNOWN',
        message,
      });
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // Load pairing data when tab switches to pairing
  const loadPairingData = useCallback(async () => {
    setPairingLoading(true);
    try {
      const [inRes, outRes, repRes, selfRes] = await Promise.all([
        pairingApi.getIncomingRequests({ size: 50 }),
        pairingApi.getOutgoingRequests({ size: 50 }),
        pairingApi.getPairingReports({ size: 50 }),
        pairingApi.getSelfPairingRequests({ size: 50 }),
      ]);
      setPairingIncoming(inRes.data.requests || []);
      setPairingOutgoing(outRes.data.requests || []);
      setPairingReports(repRes.data.reports || []);
      setPairingSelf(selfRes.data.requests || []);
    } catch {} finally {
      setPairingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'pairing') {
      loadPairingData();
    }
  }, [tab, loadPairingData]);

  const handlePairingAccept = async (uuid: string) => {
    setPairingActionLoading(uuid);
    try { await pairingApi.acceptRequest(uuid); loadPairingData(); }
    catch (err: any) { alert(err?.response?.data?.message || '操作失败'); }
    finally { setPairingActionLoading(null); }
  };

  const handlePairingReject = async (uuid: string) => {
    setPairingActionLoading(uuid);
    try { await pairingApi.rejectRequest(uuid); loadPairingData(); }
    catch (err: any) { alert(err?.response?.data?.message || '操作失败'); }
    finally { setPairingActionLoading(null); }
  };

  const handlePairingCancel = async (uuid: string) => {
    if (!confirm('确定取消配对请求吗？')) return;
    setPairingActionLoading(uuid);
    try { await pairingApi.cancelRequest(uuid); loadPairingData(); }
    catch (err: any) { alert(err?.response?.data?.message || '操作失败'); }
    finally { setPairingActionLoading(null); }
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeemLoading(true);
    setRedeemMsg(null);
    try {
      const res = await cardKeyApi.redeem(redeemCode.trim());
      const data = res.data;
      setUser((prev: any) => prev ? { ...prev, balance: data.balance } : prev);
      setRedeemMsg({ type: 'success', text: `充值成功！到账 ¥${Number(data.amount).toFixed(2)}` });
      setRedeemCode('');
      setTimeout(() => setShowRedeem(false), 2000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || '兑换失败';
      setRedeemMsg({ type: 'error', text: msg });
    } finally {
      setRedeemLoading(false);
    }
  };

  const openDeleteModal = (chart: any, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setChartDeleteMsg(null);
    setDeleteTargetChart(chart);
    setShowDeleteModal(true);
  };

  const handleDeleteChart = async () => {
    const chartId = Number(deleteTargetChart?.id);
    if (!Number.isFinite(chartId) || chartId <= 0) {
      setChartDeleteMsg({ type: 'error', text: '命盘数据异常，无法删除' });
      setShowDeleteModal(false);
      return;
    }
    setDeletingChartId(chartId);
    try {
      await userApi.deleteChart(chartId);
      setCharts((prev) => prev.filter((chart) => Number(chart.id) !== chartId));
      setChartDeleteMsg({ type: 'success', text: '命盘已删除' });
      setShowDeleteModal(false);
      setDeleteTargetChart(null);
    } catch (err: any) {
      const message = err?.response?.data?.message || '删除失败，请稍后重试';
      setChartDeleteMsg({ type: 'error', text: message });
    } finally {
      setDeletingChartId(null);
    }
  };

  const openDeleteReportModal = (report: any, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setReportDeleteMsg(null);
    setDeleteTargetReport(report);
    setShowDeleteReportModal(true);
  };

  const handleDeleteReport = async () => {
    const reportId = Number(deleteTargetReport?.id);
    if (!Number.isFinite(reportId) || reportId <= 0) {
      setReportDeleteMsg({ type: 'error', text: '报告数据异常，无法删除' });
      setShowDeleteReportModal(false);
      return;
    }
    setDeletingReportId(reportId);
    try {
      await userApi.deleteReport(reportId);
      setReports((prev) => prev.filter((report) => Number(report.id) !== reportId));
      setReportDeleteMsg({ type: 'success', text: '报告已删除' });
      setShowDeleteReportModal(false);
      setDeleteTargetReport(null);
    } catch (err: any) {
      const message = err?.response?.data?.message || '删除失败，请稍后重试';
      setReportDeleteMsg({ type: 'error', text: message });
    } finally {
      setDeletingReportId(null);
    }
  };

  const openDeleteSessionModal = (session: any, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setSessionDeleteMsg(null);
    setDeleteTargetSession(session);
    setShowDeleteSessionModal(true);
  };

  const handleDeleteSession = async () => {
    const sessionId = Number(deleteTargetSession?.id);
    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      setSessionDeleteMsg({ type: 'error', text: '对话数据异常，无法删除' });
      setShowDeleteSessionModal(false);
      return;
    }
    setDeletingSessionId(sessionId);
    try {
      await chatApi.deleteSession(sessionId);
      setSessions((prev) => prev.filter((session) => Number(session.id) !== sessionId));
      setSessionDeleteMsg({ type: 'success', text: '对话已删除' });
      setShowDeleteSessionModal(false);
      setDeleteTargetSession(null);
    } catch (err: any) {
      const message = err?.response?.data?.message || '删除失败，请稍后重试';
      setSessionDeleteMsg({ type: 'error', text: message });
    } finally {
      setDeletingSessionId(null);
    }
  };

  // Unified delete handler for xiaoliuren / digital-energy / bazhai records
  const openDeleteRecordModal = (record: any, type: 'xiaoliuren' | 'digital_energy' | 'bazhai' | 'health', e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setRecordDeleteMsg(null);
    setDeleteTargetRecord(record);
    setDeleteRecordType(type);
    setShowDeleteRecordModal(true);
  };

  const handleDeleteRecord = async () => {
    const recordId = Number(deleteTargetRecord?.id);
    if (!Number.isFinite(recordId) || recordId <= 0 || !deleteRecordType) {
      setRecordDeleteMsg({ type: 'error', text: '记录数据异常，无法删除' });
      setShowDeleteRecordModal(false);
      return;
    }
    setDeletingRecordId(recordId);
    try {
      if (deleteRecordType === 'xiaoliuren') {
        await xiaoliurenApi.delete(recordId);
        setXlrRecords((prev) => prev.filter((r) => Number(r.id) !== recordId));
      } else if (deleteRecordType === 'digital_energy') {
        await digitalEnergyApi.delete(recordId);
        setDeRecords((prev) => prev.filter((r) => Number(r.id) !== recordId));
      } else if (deleteRecordType === 'bazhai') {
        await bazhaiApi.delete(recordId);
        setBzRecords((prev) => prev.filter((r) => Number(r.id) !== recordId));
      } else if (deleteRecordType === 'health') {
        await healthAnalysisApi.delete(recordId);
        setHealthRecords((prev) => prev.filter((r) => Number(r.id) !== recordId));
      }
      setRecordDeleteMsg({ type: 'success', text: '记录已删除' });
      setShowDeleteRecordModal(false);
      setDeleteTargetRecord(null);
      setDeleteRecordType(null);
    } catch (err: any) {
      const message = err?.response?.data?.message || '删除失败，请稍后重试';
      setRecordDeleteMsg({ type: 'error', text: message });
    } finally {
      setDeletingRecordId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-2xl overflow-hidden" style={{ background: 'radial-gradient(ellipse at 30% 20%, #fdf8f4, #f5ebe0)' }}>
          <div className="p-8 flex items-center gap-5">
            <div className="w-20 h-20 rounded-full skeleton-shimmer" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-32 rounded skeleton-shimmer" />
              <div className="h-3 w-48 rounded skeleton-shimmer" />
            </div>
          </div>
        </div>
        <div className="mt-8 flex gap-8 border-b border-ink-100 pb-3">
          <div className="h-4 w-24 rounded skeleton-shimmer" />
          <div className="h-4 w-24 rounded skeleton-shimmer" />
        </div>
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-5 rounded-xl border border-ink-100">
              <div className="w-1 h-12 rounded-full skeleton-shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 rounded skeleton-shimmer" />
                <div className="h-3 w-full rounded skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center rounded-xl bg-white border border-red-100 p-8">
          <p className="text-red-600 font-kai text-lg">个人中心加载失败</p>
          <p className="text-ink-400 text-sm mt-2">{loadError}</p>
          <button className="btn-primary mt-6 text-sm" onClick={loadProfileData}>
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Scholar's Study Header */}
      <div
        className="relative rounded-2xl overflow-hidden animate-fade-in"
        style={{ background: 'radial-gradient(ellipse at 30% 20%, #fdf8f4 0%, #f5ebe0 60%, #ede0d0 100%)' }}
      >
        <div className="absolute top-4 right-4 opacity-[0.04]">
          <div className="taiji-symbol" style={{ width: 96, height: 96 }} />
        </div>

        <div className="relative p-8 flex items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center text-white text-3xl font-kai shadow-lg ring-4 ring-gold-200/40">
              {(user?.nickname || user?.username || '用')[0]}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-ink-800 font-kai truncate">
              {user?.nickname || user?.username || '用户'}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="px-2.5 py-0.5 bg-gold-100/80 text-gold-700 rounded-full text-xs font-medium border border-gold-200/60">
                {VIP_LABELS[user?.vipLevel || 0]}
              </span>
              {user?.createdAt && (
                <span className="text-sm text-ink-400">
                  {new Date(user.createdAt).toLocaleDateString('zh-CN')} 加入
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/';
            }}
            className="shrink-0 flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-ink-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="退出登录"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-[10px] leading-none">退出</span>
          </button>

          <div className="hidden sm:flex gap-6 text-center">
            <div>
              <div className="text-2xl font-bold font-kai text-primary-700">{reports.length}</div>
              <div className="text-xs text-ink-400 mt-0.5">报告</div>
            </div>
            <div className="w-px bg-ink-200/60 self-stretch" />
            <div>
              <div className="text-2xl font-bold font-kai text-primary-700">{charts.length}</div>
              <div className="text-xs text-ink-400 mt-0.5">命盘</div>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Section */}
      <div className="mt-4 rounded-xl bg-white border border-ink-100/80 p-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white text-lg">
              ¥
            </div>
            <div>
              <div className="text-xs text-ink-400">账户余额</div>
              <div className="text-xl font-bold text-ink-800 font-kai">
                ¥{Number(user?.balance ?? 0).toFixed(2)}
              </div>
            </div>
          </div>
          <button
            onClick={() => { setShowRedeem(!showRedeem); setRedeemMsg(null); }}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
          >
            {showRedeem ? '收起' : '卡密充值'}
          </button>
        </div>

        {showRedeem && (
          <div className="mt-4 pt-4 border-t border-ink-100/60 animate-fade-in">
            <div className="flex gap-2">
              <input
                type="text"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="请输入卡密码"
                maxLength={20}
                className="flex-1 px-3 py-2 rounded-lg border border-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-400 font-mono tracking-wider"
                onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
              />
              <button
                onClick={handleRedeem}
                disabled={redeemLoading || !redeemCode.trim()}
                className="px-5 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {redeemLoading ? '兑换中...' : '兑换'}
              </button>
            </div>
            {redeemMsg && (
              <p className={`text-sm mt-2 ${redeemMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                {redeemMsg.text}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="mt-8 flex gap-8 border-b border-ink-100 relative">
        {(['reports', 'charts', 'chats', 'pairing', 'promotion'] as const).map((t) => {
          const labels: Record<string, string> = {
            reports: `我的报告 (${reports.length})`,
            charts: `我的命盘 (${charts.length + xlrRecords.length + deRecords.length})`,
            chats: `我的对话 (${sessions.length})`,
            pairing: '配对中心',
            promotion: '推广中心',
          };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-kai font-medium transition-colors duration-200 relative
                ${tab === t ? 'text-primary-700' : 'text-ink-400 hover:text-ink-600'}`}
            >
              {labels[t]}
              {tab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-gold-500 rounded-full animate-fade-in" />
              )}
            </button>
          );
        })}
        <button
          onClick={() => router.push('/profile/settings')}
          className="ml-auto pb-3 text-sm text-ink-400 hover:text-ink-600 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.066z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          设置
        </button>
      </div>
      {chartDeleteMsg && (
        <div
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            chartDeleteMsg.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}
          role="status"
        >
          {chartDeleteMsg.text}
        </div>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (
        <div className="mt-6 space-y-3">
          {reports.length === 0 ? (
            <div className="text-center py-20 animate-fade-in">
              <div className="taiji-symbol-sm mx-auto opacity-20" />
              <p className="text-ink-600 font-kai mt-5 text-lg">尚无测算报告</p>
              <p className="text-ink-400 text-sm mt-1">排一次命盘，开启命理之旅</p>
              <button className="btn-gold mt-6 text-sm" onClick={() => router.push('/')}>
                开始测算
              </button>
            </div>
          ) : (
            reports.map((report: any, i: number) => (
              <div
                key={report.uuid || report.id}
                className="animate-slide-up group relative flex items-stretch gap-4 p-5 rounded-xl
                           bg-white border border-ink-100/80 hover:border-ink-200 hover:shadow-md
                           transition-all duration-200 cursor-pointer"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => {
                  const url = report.reportType === 'xiaoliuren'
                    ? `/xiaoliuren/report/${report.uuid}`
                    : report.reportType === 'digital_energy'
                    ? `/digital-energy/report/${report.uuid}`
                    : `/report/${report.uuid}`;
                  router.push(url);
                }}
              >
                <div className="w-1 self-stretch rounded-full bg-gradient-to-b from-primary-400/40 to-gold-400/40 shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-ink-800 font-kai text-base truncate">
                      {REPORT_TYPE_LABELS[report.reportType] || report.reportType}
                    </h3>
                    {report.isPaid ? (
                      <span className="px-2 py-0.5 text-[10px] bg-gold-50 text-gold-700 rounded-full border border-gold-200/60 font-medium shrink-0">完整版</span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] bg-ink-50 text-ink-500 rounded-full border border-ink-200/60 shrink-0">免费版</span>
                    )}
                  </div>
                  <p className="text-sm text-ink-400 mt-1 truncate leading-relaxed">
                    {report.aiSummary || '命理分析报告'}
                  </p>
                  <div className="text-xs text-ink-300 mt-1.5 flex items-center gap-2">
                    <span>{new Date(report.createdAt).toLocaleDateString('zh-CN')}</span>
                    {report.viewCount > 0 && <><span className="text-ink-200">·</span><span>浏览 {report.viewCount}</span></>}
                  </div>
                </div>

                <div className="shrink-0 self-center flex flex-col items-end gap-2">
                  <button
                    className="w-9 h-9 rounded-full bg-primary-50/80 text-primary-600
                               flex items-center justify-center text-sm
                               hover:bg-primary-100 hover:shadow-sm transition-all duration-200
                               opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); router.push(`/chat/${report.uuid}`); }}
                    title="咨询顾问"
                  >
                    ☯
                  </button>
                  <button
                    className="w-9 h-9 rounded-full bg-gold-50/80 text-gold-600 border border-gold-100
                               flex items-center justify-center text-sm
                               hover:bg-gold-100 hover:shadow-sm transition-all duration-200
                               opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); setShareTarget(report); }}
                    title="分享报告"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.368-2.684 3 3 0 00-5.368 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                  <button
                    className="w-9 h-9 rounded-full bg-red-50/90 text-red-500 border border-red-100
                               flex items-center justify-center text-sm
                               hover:bg-red-100 hover:text-red-600 transition-all duration-200
                               opacity-70 sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={(e) => openDeleteReportModal(report, e)}
                    title="删除报告"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Charts Tab */}
      {tab === 'charts' && (
        <div className="mt-6">
          {/* Sub-tabs: 八字命盘 | 小六壬 | 数字能量 */}
          <div className="flex gap-1 bg-ink-50/60 rounded-xl p-1 mb-4">
            {(['bazi', 'xiaoliuren', 'digital_energy', 'bazhai', 'health'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setChartsSubTab(st)}
                className={`flex-1 py-2 rounded-lg text-sm font-kai font-medium transition-all ${
                  chartsSubTab === st
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-ink-400 hover:text-ink-600'
                }`}
              >
                {st === 'bazi' ? `☯ 八字 (${charts.length})` : st === 'xiaoliuren' ? `☲ 小六壬 (${xlrRecords.length})` : st === 'digital_energy' ? `📱 数字 (${deRecords.length})` : st === 'bazhai' ? `🏠 八宅 (${bzRecords.length})` : `💚 健康 (${healthRecords.length})`}
              </button>
            ))}
          </div>

          {/* 八字命盘 */}
          {chartsSubTab === 'bazi' && (
            <div className="space-y-3">
              {charts.length === 0 ? (
                <div className="text-center py-20 animate-fade-in">
                  <div className="taiji-symbol-sm mx-auto opacity-20" />
                  <p className="text-ink-600 font-kai mt-5 text-lg">尚无命盘记录</p>
                  <p className="text-ink-400 text-sm mt-1">输入出生信息，排出专属命盘</p>
                  <button className="btn-gold mt-6 text-sm" onClick={() => router.push('/')}>
                    排盘测算
                  </button>
                </div>
              ) : (
                charts.map((chart: any, i: number) => {
                  const latestReport = chart.reports?.[0];
                  const chartId = Number(chart.id);
                  const hasValidChartId = Number.isFinite(chartId) && chartId > 0;
                  return (
                    <div
                      key={chart.uuid || chart.id}
                      className="animate-slide-up group relative flex items-stretch gap-4 p-5 rounded-xl bg-white border border-ink-100/80
                                 hover:border-ink-200 hover:shadow-md transition-all duration-200 cursor-pointer"
                      style={{ animationDelay: `${i * 60}ms` }}
                      onClick={() => {
                        if (!hasValidChartId) return;
                        router.push(`/chart/${chartId}`);
                      }}
                    >
                      <div className="w-1 self-stretch rounded-full bg-gradient-to-b from-primary-400/40 to-gold-400/40 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-ink-800 font-kai">
                              {chart.name || '我的命盘'}
                            </h3>
                            <span className="text-xs text-ink-400">
                              {chart.gender === 1 ? '♂ 乾造' : '♀ 坤造'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {chart.patternName && (
                              <span className="px-2 py-0.5 text-[10px] bg-gold-50 text-gold-700 rounded-full border border-gold-200/60 font-medium">
                                {chart.patternName}
                              </span>
                            )}
                            {chart.reports?.length > 0 && (
                              <span className="px-2 py-0.5 text-[10px] bg-primary-50 text-primary-600 rounded-full border border-primary-200/60 font-medium">
                                {chart.reports.length}份报告
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {[
                            { label: '年', gan: chart.yearGan, zhi: chart.yearZhi },
                            { label: '月', gan: chart.monthGan, zhi: chart.monthZhi },
                            { label: '日', gan: chart.dayGan, zhi: chart.dayZhi },
                            { label: '时', gan: chart.hourGan, zhi: chart.hourZhi },
                          ].map((p) => (
                            <div key={p.label} className="flex-1 text-center py-2 rounded-lg bg-ink-50/60 border border-ink-100/60">
                              <div className="text-[10px] text-ink-300 mb-0.5">{p.label}柱</div>
                              <div className={`text-base font-kai font-bold ${GAN_WUXING_COLOR[p.gan] || 'text-ink-700'}`}>
                                {p.gan || '?'}{p.zhi || '?'}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-ink-300 mt-3 flex items-center gap-2">
                          <span>{new Date(chart.createdAt).toLocaleDateString('zh-CN')}</span>
                          {chart.birthCity && <><span className="text-ink-200">·</span><span>{chart.birthCity}</span></>}
                          {!hasValidChartId && <><span className="text-ink-200">·</span><span className="text-red-500">命盘数据异常</span></>}
                        </div>
                      </div>
                      <div className="shrink-0 self-center flex flex-col items-end gap-2">
                        {latestReport ? (
                          <button
                            className="w-9 h-9 rounded-full bg-primary-50/80 text-primary-600 flex items-center justify-center text-sm
                                       hover:bg-primary-100 hover:shadow-sm transition-all duration-200
                                       opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); if (!latestReport.uuid) return; router.push(`/chat/${latestReport.uuid}`); }}
                            title="AI 对话"
                          >☯</button>
                        ) : (
                          <button
                            className="px-3 py-1.5 rounded-lg bg-gold-50 text-gold-700 text-xs font-medium
                                       border border-gold-200/60 hover:bg-gold-100 hover:shadow-sm transition-all duration-200
                                       opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); if (!hasValidChartId) return; router.push(`/report/generating/${chartId}`); }}
                            title="生成报告"
                          >生成报告</button>
                        )}
                        <button
                          className="w-9 h-9 rounded-full bg-red-50/90 text-red-500 border border-red-100 flex items-center justify-center text-sm
                                     hover:bg-red-100 hover:text-red-600 transition-all duration-200
                                     opacity-70 sm:opacity-0 sm:group-hover:opacity-100"
                          onClick={(e) => openDeleteModal(chart, e)}
                          title="删除命盘"
                        >✕</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 小六壬 */}
          {chartsSubTab === 'xiaoliuren' && (
            <div className="space-y-3">
              {xlrRecords.length === 0 ? (
                <div className="text-center py-20 animate-fade-in">
                  <div className="text-4xl mb-4 opacity-20">☯</div>
                  <p className="text-ink-600 font-kai mt-5 text-lg">尚无小六壬记录</p>
                  <p className="text-ink-400 text-sm mt-1">掐指一算，预知吉凶</p>
                  <button className="btn-gold mt-6 text-sm" onClick={() => router.push('/xiaoliuren')}>
                    开始占卜
                  </button>
                </div>
              ) : (
                xlrRecords.map((rec: any, i: number) => {
                  const isExpanded = xlrExpanded === rec.uuid;
                  const palm = XLR_PALM[rec.resultPosition];
                  return (
                    <div key={rec.uuid || rec.id}>
                      <div
                        className="animate-slide-up group relative flex items-stretch gap-4 p-5 rounded-xl bg-white border border-ink-100/80
                                   hover:border-ink-200 hover:shadow-md transition-all duration-200 cursor-pointer"
                        style={{ animationDelay: `${i * 60}ms` }}
                        onClick={() => {
                          if (rec.reportUuid) {
                            router.push(`/xiaoliuren/report/${rec.reportUuid}`);
                          } else {
                            setXlrExpanded(isExpanded ? null : rec.uuid);
                          }
                        }}
                      >
                        <div className={`w-1 self-stretch rounded-full shrink-0 ${
                          rec.resultName === '大安' ? 'bg-gradient-to-b from-green-400 to-green-500' :
                          rec.resultName === '速喜' ? 'bg-gradient-to-b from-emerald-400 to-emerald-500' :
                          rec.resultName === '小吉' ? 'bg-gradient-to-b from-teal-400 to-teal-500' :
                          rec.resultName === '留连' ? 'bg-gradient-to-b from-orange-400 to-orange-500' :
                          rec.resultName === '赤口' ? 'bg-gradient-to-b from-red-400 to-red-500' :
                          'bg-gradient-to-b from-gray-400 to-gray-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-ink-800 font-kai">{rec.resultName}</h3>
                              <span className={`px-1.5 py-0.5 text-[10px] rounded-full border font-medium ${
                                rec.resultName === '大安' || rec.resultName === '速喜' || rec.resultName === '小吉'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-red-50 text-red-600 border-red-200'
                              }`}>{palm?.luck || ''}</span>
                              {palm && (
                                <span className="text-[10px] text-ink-400">{palm.liushen} · {palm.wuxing}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-ink-400">
                              <span>{rec.inputType === 'time' ? '时间推算' : '随机数推算'}</span>
                              {rec.reportUuid ? (
                                <span className="text-primary-500">· AI已解读</span>
                              ) : (
                                <span className="text-ink-300">· 待解读</span>
                              )}
                            </div>
                          </div>
                          {rec.question && (
                            <p className="text-sm text-ink-500 mb-1">所问：{rec.question}</p>
                          )}
                          <div className="text-xs text-ink-300 flex items-center gap-2 mt-1">
                            <span>{new Date(rec.createdAt).toLocaleDateString('zh-CN')}</span>
                            {!rec.reportUuid && (
                              <span className="text-ink-400">· 点击查看详情</span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 self-center flex items-center gap-1">
                          {rec.reportUuid ? (
                            <button
                              className="w-9 h-9 rounded-full bg-primary-50/80 text-primary-600 flex items-center justify-center text-sm
                                         hover:bg-primary-100 hover:shadow-sm transition-all duration-200
                                         opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                              onClick={(e) => { e.stopPropagation(); router.push(`/chat/${rec.reportUuid}`); }}
                              title="AI 对话"
                            >☯</button>
                          ) : (
                            <button
                              className="px-3 py-1.5 rounded-lg bg-gold-50 text-gold-700 text-xs font-medium
                                         border border-gold-200/60 hover:bg-gold-100 hover:shadow-sm transition-all duration-200
                                         opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                              onClick={(e) => { e.stopPropagation(); router.push('/xiaoliuren'); }}
                              title="AI 解读"
                            >AI解读</button>
                          )}
                          <button className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center
                                         hover:bg-red-100 hover:text-red-600 transition-all duration-200
                                         opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                            onClick={(e) => openDeleteRecordModal(rec, 'xiaoliuren', e)} title="删除">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {isExpanded && !rec.reportUuid && palm && (
                        <div className="mx-2 -mt-1 rounded-b-xl bg-amber-50/60 border border-t-0 border-amber-200/40 px-5 py-4 animate-slide-up">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex gap-2"><span className="text-ink-400 shrink-0">掌诀：</span><span className="font-bold text-ink-700 font-kai">{palm.name}</span></div>
                            <div className="flex gap-2"><span className="text-ink-400 shrink-0">六神：</span><span className="text-ink-600">{palm.liushen}</span></div>
                            <div className="flex gap-2"><span className="text-ink-400 shrink-0">五行：</span><span className="text-ink-600">{palm.wuxing}</span></div>
                            <div className="flex gap-2"><span className="text-ink-400 shrink-0">方位：</span><span className="text-ink-600">{palm.direction}</span></div>
                          </div>
                          <p className="text-sm text-ink-600 mt-3 leading-relaxed font-kai">{palm.text}</p>
                          <button className="mt-3 px-4 py-1.5 rounded-lg bg-gold-100 text-gold-700 text-xs font-medium border border-gold-200 hover:bg-gold-200 transition-colors"
                            onClick={() => router.push('/xiaoliuren')}>
                            去生成AI深度解读 →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 数字能量 */}
          {chartsSubTab === 'digital_energy' && (
            <div className="space-y-3">
              {deRecords.length === 0 ? (
                <div className="text-center py-20 animate-fade-in">
                  <div className="text-4xl mb-4 opacity-20">📱</div>
                  <p className="text-ink-600 font-kai mt-5 text-lg">尚无数字能量记录</p>
                  <p className="text-ink-400 text-sm mt-1">八星磁场，洞察号码能量</p>
                  <button className="btn-gold mt-6 text-sm" onClick={() => router.push('/digital-energy')}>
                    开始测算
                  </button>
                </div>
              ) : (
                deRecords.map((rec: any, i: number) => (
                  <div key={rec.uuid || rec.id}
                    className="animate-slide-up group relative flex items-stretch gap-4 p-5 rounded-xl bg-white border border-ink-100/80
                               hover:border-ink-200 hover:shadow-md transition-all duration-200 cursor-pointer"
                    style={{ animationDelay: `${i * 60}ms` }}
                    onClick={() => {
                      if (rec.reportUuid) { router.push(`/digital-energy/report/${rec.reportUuid}`); }
                      else { router.push('/digital-energy'); }
                    }}>
                    <div className={`w-1 self-stretch rounded-full shrink-0 ${
                      (rec.stats?.luckyPercent || 0) >= 60 ? 'bg-gradient-to-b from-green-400 to-green-500' :
                      (rec.stats?.luckyPercent || 0) >= 40 ? 'bg-gradient-to-b from-amber-400 to-amber-500' :
                      'bg-gradient-to-b from-red-400 to-red-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-ink-800 font-kai text-base tracking-widest">{rec.phone}</h3>
                          {rec.stats && (
                            <span className={`px-1.5 py-0.5 text-[10px] rounded-full border font-medium ${
                              rec.stats.luckyPercent >= 60 ? 'bg-green-50 text-green-700 border-green-200' :
                              rec.stats.luckyPercent >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-red-50 text-red-600 border-red-200'}`}>
                              吉{rec.stats.luckyPercent}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-ink-400">
                          {rec.stats?.dominantStar && <span>主星：{rec.stats.dominantStar}</span>}
                          {rec.reportUuid ? <span className="text-primary-500">· AI已解读</span> : <span className="text-ink-300">· 待解读</span>}
                        </div>
                      </div>
                      <div className="text-xs text-ink-300 flex items-center gap-2 mt-1">
                        <span>{new Date(rec.createdAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                    <div className="shrink-0 self-center flex items-center gap-1">
                      {rec.reportUuid ? (
                        <button className="w-9 h-9 rounded-full bg-primary-50/80 text-primary-600 flex items-center justify-center text-sm
                                   hover:bg-primary-100 hover:shadow-sm transition-all duration-200
                                   opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); router.push(`/chat/${rec.reportUuid}`); }} title="AI 对话">☯</button>
                      ) : (
                        <button className="px-3 py-1.5 rounded-lg bg-gold-50 text-gold-700 text-xs font-medium
                                   border border-gold-200/60 hover:bg-gold-100 hover:shadow-sm transition-all duration-200
                                   opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); router.push('/digital-energy'); }} title="AI 解读">AI解读</button>
                      )}
                      <button className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center
                                       hover:bg-red-100 hover:text-red-600 transition-all duration-200
                                       opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                        onClick={(e) => openDeleteRecordModal(rec, 'digital_energy', e)} title="删除">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 八宅风水 */}
          {chartsSubTab === 'bazhai' && (
            <div className="space-y-3">
              {bzRecords.length === 0 ? (
                <div className="text-center py-20 animate-fade-in">
                  <div className="text-4xl mb-4 opacity-20">🏠</div>
                  <p className="text-ink-600 font-kai mt-5 text-lg">尚无八宅风水记录</p>
                  <p className="text-ink-400 text-sm mt-1">大游年歌诀，命卦定吉凶</p>
                  <button className="btn-gold mt-6 text-sm" onClick={() => router.push('/bazhai')}>
                    开始测算
                  </button>
                </div>
              ) : (
                bzRecords.map((rec: any, i: number) => {
                  const TRIGRAM_MAP: Record<string, string> = {'坎':'☵','坤':'☷','震':'☳','巽':'☴','乾':'☰','兑':'☱','艮':'☶','离':'☲'};
                  return (
                  <div key={rec.uuid || rec.id}
                    className="animate-slide-up group relative flex items-stretch gap-4 p-5 rounded-xl bg-white border border-ink-100/80
                               hover:border-ink-200 hover:shadow-md transition-all duration-200 cursor-pointer"
                    style={{ animationDelay: `${i * 60}ms` }}
                    onClick={() => {
                      if (rec.reportUuid) { router.push(`/bazhai/report/${rec.reportUuid}`); }
                      else { router.push('/bazhai'); }
                    }}>
                    <div className={`w-1 self-stretch rounded-full shrink-0 ${
                      rec.group === 'east' ? 'bg-gradient-to-b from-emerald-400 to-emerald-500' :
                      'bg-gradient-to-b from-amber-400 to-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{TRIGRAM_MAP[rec.trigram] || '?'}</span>
                          <h3 className="font-bold text-ink-800 font-kai text-base">
                            命卦 {rec.kuaNumber}{rec.trigram} · {rec.group === 'east' ? '东四命' : '西四命'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-ink-400">
                          <span>{rec.birthYear}年 · {rec.gender === 1 ? '男' : '女'}</span>
                          {rec.reportUuid ? <span className="text-primary-500">· AI已解读</span> : <span className="text-ink-300">· 待解读</span>}
                        </div>
                      </div>
                      <div className="text-xs text-ink-300 flex items-center gap-2 mt-1">
                        <span>{new Date(rec.createdAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                    <div className="shrink-0 self-center flex items-center gap-1">
                      {rec.reportUuid ? (
                        <button className="w-9 h-9 rounded-full bg-primary-50/80 text-primary-600 flex items-center justify-center text-sm
                                       hover:bg-primary-100 hover:shadow-sm transition-all duration-200
                                       opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); router.push(`/chat/${rec.reportUuid}`); }} title="AI 对话">☯</button>
                      ) : (
                        <button className="px-3 py-1.5 rounded-lg bg-gold-50 text-gold-700 text-xs font-medium
                                       border border-gold-200/60 hover:bg-gold-100 hover:shadow-sm transition-all duration-200
                                       opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); router.push('/bazhai'); }} title="AI 解读">AI解读</button>
                      )}
                      <button className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center
                                       hover:bg-red-100 hover:text-red-600 transition-all duration-200
                                       opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                        onClick={(e) => openDeleteRecordModal(rec, 'bazhai', e)} title="删除">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>);
                })
              )}
            </div>
          )}

          {/* 五运六气健康 */}
          {chartsSubTab === 'health' && (
            <div className="space-y-3">
              {healthRecords.length === 0 ? (
                <div className="text-center py-20 animate-fade-in">
                  <div className="text-4xl mb-4 opacity-20">💚</div>
                  <p className="text-ink-600 font-kai mt-5 text-lg">尚无健康分析记录</p>
                  <p className="text-ink-400 text-sm mt-1">五运六气，天人相应的养生智慧</p>
                  <button className="btn-gold mt-6 text-sm" onClick={() => router.push('/health')}>开始分析</button>
                </div>
              ) : (
                healthRecords.map((rec: any, i: number) => (
                  <div key={rec.uuid || rec.id}
                    className="animate-slide-up group relative flex items-stretch gap-4 p-5 rounded-xl bg-white border border-ink-100/80 hover:border-ink-200 hover:shadow-md transition-all duration-200 cursor-pointer"
                    style={{ animationDelay: `${i * 60}ms` }}
                    onClick={() => { if (rec.reportUuid) router.push(`/health/report/${rec.reportUuid}`); else router.push('/health'); }}>
                    <div className="w-1 self-stretch rounded-full shrink-0 bg-gradient-to-b from-green-400 to-green-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🌿</span>
                          <h3 className="font-bold text-ink-800 font-kai text-base">{rec.yearYun} · {rec.sitian}司天</h3>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-ink-400">
                          <span>{rec.targetDate}</span>
                          {rec.reportUuid ? <span className="text-green-500">· AI已解读</span> : <span className="text-ink-300">· 待解读</span>}
                        </div>
                      </div>
                      <div className="text-xs text-ink-300">{new Date(rec.createdAt).toLocaleDateString('zh-CN')}</div>
                    </div>
                    <div className="shrink-0 self-center flex items-center gap-1">
                      {rec.reportUuid ? (
                        <button className="w-9 h-9 rounded-full bg-green-50/80 text-green-600 flex items-center justify-center text-sm hover:bg-green-100 transition-all opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); router.push(`/chat/${rec.reportUuid}`); }} title="AI 对话">☯</button>
                      ) : (
                        <button className="px-3 py-1.5 rounded-lg bg-gold-50 text-gold-700 text-xs font-medium border border-gold-200/60 hover:bg-gold-100 transition-all opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); router.push('/health'); }} title="AI 解读">AI解读</button>
                      )}
                      <button className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                        onClick={(e) => openDeleteRecordModal(rec, 'health', e)} title="删除">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Chats Tab - split into two sections */}
      {tab === 'chats' && (() => {
        const aiSessions = sessions.filter((s: any) => s.report?.reportType !== 'pairing');
        const pairingSessions = sessions.filter((s: any) => s.report?.reportType === 'pairing');
        const totalEmpty = sessions.length === 0;

        const renderSessionCard = (session: any, i: number, isPairing: boolean) => {
          const reportUuid = session.report?.uuid;
          const isSessionNavigable = Boolean(reportUuid);
          const pairingRequestUuid = session.pairingRequestUuid;
          const chatUrl = isPairing && pairingRequestUuid
            ? `/pairing/${pairingRequestUuid}/chat`
            : `/chat/${reportUuid}`;

          return (
            <div
              key={session.uuid || session.id}
              className="animate-slide-up group flex items-center gap-4 p-4 rounded-xl
                         bg-white border border-ink-100/80 hover:border-ink-200 hover:shadow-md
                         transition-all duration-200 cursor-pointer"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => {
                if (!isSessionNavigable) return;
                router.push(chatUrl);
              }}
            >
              {isPairing ? (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-amber-400
                                flex items-center justify-center text-white shrink-0 shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0 4 4 0 000 5.656l1.414 1.414m2.828-2.828l1.414-1.414a4 4 0 000-5.656 4 4 0 00-5.656 0" />
                  </svg>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500
                                flex items-center justify-center text-white shrink-0 shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-ink-800 truncate">
                  {session.title || (isPairing ? '配对对话' : '测算顾问对话')}
                </h3>
                <p className="text-xs text-ink-400 mt-0.5 truncate">
                  {isPairing
                    ? '八字命理配对 · 双方实时交流'
                    : (session.report?.aiSummary || 'AI 命理分析对话')}
                </p>
                <div className="text-[11px] text-ink-300 mt-1 flex items-center gap-2">
                  {session.lastMessageAt && (
                    <span>{new Date(session.lastMessageAt).toLocaleDateString('zh-CN', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}</span>
                  )}
                  {session.messageCount > 0 && (
                    <><span className="text-ink-200">·</span><span>{session.messageCount} 条消息</span></>
                  )}
                </div>
              </div>

              <div className="shrink-0 self-center flex items-center gap-1">
                <svg className="w-4 h-4 text-ink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <button
                  className="w-7 h-7 rounded-full bg-red-50/90 text-red-400 border border-red-100
                             flex items-center justify-center text-[10px]
                             hover:bg-red-100 hover:text-red-500 transition-all duration-200
                             opacity-0 group-hover:opacity-100"
                  onClick={(e) => openDeleteSessionModal(session, e)}
                  title="删除对话"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        };

        if (totalEmpty) {
          return (
            <div className="mt-6 text-center py-20 animate-fade-in">
              <div className="text-5xl opacity-20 mb-4">☯</div>
              <p className="text-ink-600 font-kai mt-5 text-lg">尚无对话记录</p>
              <p className="text-ink-400 text-sm mt-1">生成报告后即可与 AI 顾问对话</p>
              <button className="btn-gold mt-6 text-sm" onClick={() => router.push('/')}>
                开始测算
              </button>
            </div>
          );
        }

        return (
          <div className="mt-6">
            {/* Mobile: Tab switcher */}
            <div className="flex md:hidden bg-ink-50 rounded-xl p-1 mb-4">
              <button
                onClick={() => setChatsSubTab('ai')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  chatsSubTab === 'ai'
                    ? 'bg-white text-ink-800 shadow-sm'
                    : 'text-ink-500'
                }`}
              >
                AI 测算顾问
                {aiSessions.length > 0 && (
                  <span className="ml-1.5 text-[11px] text-ink-400">({aiSessions.length})</span>
                )}
              </button>
              <button
                onClick={() => setChatsSubTab('pairing')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  chatsSubTab === 'pairing'
                    ? 'bg-white text-ink-800 shadow-sm'
                    : 'text-ink-500'
                }`}
              >
                八字配对
                {pairingSessions.length > 0 && (
                  <span className="ml-1.5 text-[11px] text-ink-400">({pairingSessions.length})</span>
                )}
              </button>
            </div>

            {/* Content: Two columns on desktop, single column tab-switched on mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Column 1: AI Consultant */}
              <div className={chatsSubTab === 'ai' ? '' : 'hidden md:block'}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-ink-800">AI 测算顾问</h3>
                  <span className="text-[11px] text-ink-400 bg-ink-50 px-2 py-0.5 rounded-full">
                    {aiSessions.length}
                  </span>
                </div>

                {aiSessions.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-xl border border-dashed border-ink-100">
                    <p className="text-sm text-ink-400">暂无 AI 顾问对话</p>
                    <p className="text-xs text-ink-300 mt-0.5">生成命理报告后即可与 AI 顾问对话</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {aiSessions.map((s: any, i: number) => renderSessionCard(s, i, false))}
                  </div>
                )}
              </div>

              {/* Column 2: Pairing */}
              <div className={chatsSubTab === 'pairing' ? '' : 'hidden md:block'}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-6 h-6 rounded-md bg-rose-100 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0 4 4 0 000 5.656l1.414 1.414m2.828-2.828l1.414-1.414a4 4 0 000-5.656 4 4 0 00-5.656 0" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-ink-800">八字配对对话</h3>
                  <span className="text-[11px] text-ink-400 bg-ink-50 px-2 py-0.5 rounded-full">
                    {pairingSessions.length}
                  </span>
                </div>

                {pairingSessions.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-xl border border-dashed border-ink-100">
                    <p className="text-sm text-ink-400">暂无配对对话</p>
                    <p className="text-xs text-ink-300 mt-0.5">去朋友圈与他人配对分析，完成后即可对话</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pairingSessions.map((s: any, i: number) => renderSessionCard(s, i, true))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pairing Tab */}
      {tab === 'pairing' && (
        <div className="mt-6">
          {/* Sub-tabs */}
          <div className="flex gap-1 bg-ink-50 rounded-xl p-1 mb-4">
            {([
              { key: 'incoming' as const, label: '收到的请求', badge: pairingIncoming.filter(r => r.status === 0).length },
              { key: 'outgoing' as const, label: '发出的请求' },
              { key: 'self' as const, label: '自选配对', badge: pairingSelf.length },
              { key: 'completed' as const, label: '配对报告', badge: pairingReports.length },
            ]).map((st) => (
              <button
                key={st.key}
                onClick={() => setPairingSubTab(st.key)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                  ${pairingSubTab === st.key
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-ink-400 hover:text-ink-600'
                  }`}
              >
                {st.label}
                {st.badge ? (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                    {st.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {pairingLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-xl p-4 border border-ink-100 animate-pulse">
                  <div className="flex gap-3"><div className="w-10 h-10 rounded-full bg-ink-100" /><div className="flex-1 space-y-2"><div className="h-4 w-24 bg-ink-100 rounded" /><div className="h-3 w-40 bg-ink-100 rounded" /></div></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {pairingSubTab === 'incoming' && (
                pairingIncoming.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-xl border border-dashed border-ink-100">
                    <p className="text-sm text-ink-400">暂无收到的配对请求</p>
                    <p className="text-xs text-ink-300 mt-1">去朋友圈发现更多朋友吧</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pairingIncoming.map((r: any) => (
                      <PairingRequestCard
                        key={r.uuid}
                        uuid={r.uuid}
                        pairingType={r.pairingType}
                        status={r.status}
                        message={r.message}
                        otherUser={r.initiator}
                        isIncoming
                        createdAt={r.createdAt}
                        onView={(uuid) => router.push(`/pairing/${uuid}`)}
                        onAccept={handlePairingAccept}
                        onReject={handlePairingReject}
                      />
                    ))}
                  </div>
                )
              )}

              {pairingSubTab === 'outgoing' && (
                pairingOutgoing.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-xl border border-dashed border-ink-100">
                    <p className="text-sm text-ink-400">暂无发出的配对请求</p>
                    <p className="text-xs text-ink-300 mt-1">去朋友圈与他人配对分析吧</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pairingOutgoing.map((r: any) => (
                      <PairingRequestCard
                        key={r.uuid}
                        uuid={r.uuid}
                        pairingType={r.pairingType}
                        status={r.status}
                        message={r.message}
                        otherUser={r.receiver}
                        isIncoming={false}
                        createdAt={r.createdAt}
                        onView={(uuid) => router.push(`/pairing/${uuid}`)}
                        onCancel={handlePairingCancel}
                      />
                    ))}
                  </div>
                )
              )}

              {pairingSubTab === 'self' && (
                <>
                  <div className="mb-3">
                    <button
                      onClick={() => router.push('/pairing/self/new')}
                      className="w-full py-2.5 bg-gradient-to-r from-primary-500 to-amber-500
                        text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2
                        hover:from-primary-600 hover:to-amber-600 transition-all shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      新建自选配对
                    </button>
                  </div>
                  {pairingSelf.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-dashed border-ink-100">
                      <p className="text-sm text-ink-400">暂无自选配对</p>
                      <p className="text-xs text-ink-300 mt-1">选择自己的两个命盘进行配对分析</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pairingSelf.map((r: any) => (
                        <div
                          key={r.uuid}
                          onClick={() => router.push(`/pairing/${r.uuid}`)}
                          className="bg-white rounded-xl p-4 border border-ink-100 hover:border-ink-200 hover:shadow-sm
                            cursor-pointer transition-all flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-amber-400
                            flex items-center justify-center text-white shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M13.828 10.172a4 4 0 00-5.656 0 4 4 0 000 5.656l1.414 1.414m2.828-2.828l1.414-1.414a4 4 0 000-5.656 4 4 0 00-5.656 0" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink-700">
                              {TYPE_LABELS[r.pairingType] || r.pairingType}
                            </p>
                            <p className="text-xs text-ink-400 mt-0.5">
                              {r.chartA?.name || `${r.chartA?.dayGan || ''}日主`} vs {r.chartB?.name || `${r.chartB?.dayGan || ''}日主`}
                            </p>
                          </div>
                          <PairingStatusBadge status={r.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {pairingSubTab === 'completed' && (
                pairingReports.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-xl border border-dashed border-ink-100">
                    <p className="text-sm text-ink-400">暂无配对报告</p>
                    <p className="text-xs text-ink-300 mt-1">完成配对后报告将显示在这里</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pairingReports.map((r: any) => (
                      <div
                        key={r.requestUuid}
                        onClick={() => router.push(`/pairing/${r.requestUuid}`)}
                        className="bg-white rounded-xl p-4 border border-ink-100 hover:border-ink-200 hover:shadow-sm
                          cursor-pointer transition-all flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-amber-400
                          flex items-center justify-center text-white shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0 4 4 0 000 5.656l1.414 1.414m2.828-2.828l1.414-1.414a4 4 0 000-5.656 4 4 0 00-5.656 0" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-ink-800">
                              {r.initiator?.nickname || r.initiator?.username} & {r.receiver?.nickname || r.receiver?.username}
                            </span>
                            <PairingStatusBadge status={5} />
                          </div>
                          {r.report?.summary && (
                            <p className="text-xs text-ink-400 mt-0.5 line-clamp-1">{r.report.summary}</p>
                          )}
                        </div>
                        <svg className="w-4 h-4 text-ink-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}

      {/* Promotion Tab */}
      {tab === 'promotion' && <PromotionTab />}

      {showDeleteModal && deleteTargetChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            className="absolute inset-0 bg-black/35"
            onClick={() => {
              if (deletingChartId) return;
              setShowDeleteModal(false);
              setDeleteTargetChart(null);
            }}
            aria-label="关闭删除确认弹窗"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-ink-100 shadow-xl p-6 animate-fade-in">
            <h3 className="text-xl font-bold text-ink-800 font-kai">删除命盘</h3>
            <p className="text-sm text-ink-500 mt-3 leading-relaxed">
              确认删除
              <span className="text-ink-700 font-medium">「{deleteTargetChart.name || '我的命盘'}」</span>
              ？删除后该命盘将不再显示在个人中心。
            </p>
            <p className="text-xs text-ink-400 mt-2">
              若已生成报告或对话，历史内容会保留，但命盘列表将隐藏此记录。
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-50 transition-colors disabled:opacity-50"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTargetChart(null);
                }}
                disabled={Boolean(deletingChartId)}
              >
                取消
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                onClick={handleDeleteChart}
                disabled={Boolean(deletingChartId)}
              >
                {deletingChartId ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteReportModal && deleteTargetReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            className="absolute inset-0 bg-black/35"
            onClick={() => {
              if (deletingReportId) return;
              setShowDeleteReportModal(false);
              setDeleteTargetReport(null);
            }}
            aria-label="关闭删除确认弹窗"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-ink-100 shadow-xl p-6 animate-fade-in">
            <h3 className="text-xl font-bold text-ink-800 font-kai">删除报告</h3>
            <p className="text-sm text-ink-500 mt-3 leading-relaxed">
              确认删除报告
              <span className="text-ink-700 font-medium">「{REPORT_TYPE_LABELS[deleteTargetReport.reportType] || deleteTargetReport.reportType}」</span>
              ？删除后该报告将不再显示在个人中心。
            </p>
            <p className="text-xs text-ink-400 mt-2">
              若已生成对话，历史对话内容会保留，但报告列表将隐藏此记录。
            </p>
            {reportDeleteMsg && (
              <p className={`text-sm mt-3 ${reportDeleteMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                {reportDeleteMsg.text}
              </p>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-50 transition-colors disabled:opacity-50"
                onClick={() => {
                  setShowDeleteReportModal(false);
                  setDeleteTargetReport(null);
                }}
                disabled={Boolean(deletingReportId)}
              >
                取消
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                onClick={handleDeleteReport}
                disabled={Boolean(deletingReportId)}
              >
                {deletingReportId ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteSessionModal && deleteTargetSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            className="absolute inset-0 bg-black/35"
            onClick={() => {
              if (deletingSessionId) return;
              setShowDeleteSessionModal(false);
              setDeleteTargetSession(null);
            }}
            aria-label="关闭删除确认弹窗"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-ink-100 shadow-xl p-6 animate-fade-in">
            <h3 className="text-xl font-bold text-ink-800 font-kai">删除对话</h3>
            <p className="text-sm text-ink-500 mt-3 leading-relaxed">
              确认删除对话
              <span className="text-ink-700 font-medium">「{deleteTargetSession.title || '测算顾问对话'}」</span>
              ？删除后该对话将不再显示在个人中心。
            </p>
            <p className="text-xs text-ink-400 mt-2">
              对话历史记录将永久删除，无法恢复。
            </p>
            {sessionDeleteMsg && (
              <p className={`text-sm mt-3 ${sessionDeleteMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                {sessionDeleteMsg.text}
              </p>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-50 transition-colors disabled:opacity-50"
                onClick={() => {
                  setShowDeleteSessionModal(false);
                  setDeleteTargetSession(null);
                }}
                disabled={Boolean(deletingSessionId)}
              >
                取消
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                onClick={handleDeleteSession}
                disabled={Boolean(deletingSessionId)}
              >
                {deletingSessionId ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Record Modal (xiaoliuren / digital-energy / bazhai) */}
      {showDeleteRecordModal && deleteTargetRecord && deleteRecordType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-ink-100 animate-scale-up">
            <h3 className="text-lg font-bold text-ink-800 font-kai text-center">
              删除
              {deleteRecordType === 'xiaoliuren' ? '小六壬' : deleteRecordType === 'digital_energy' ? '数字能量' : deleteRecordType === 'bazhai' ? '八宅风水' : '健康分析'}
              记录
            </h3>
            <p className="mt-3 text-sm text-ink-500 text-center leading-relaxed">
              {deleteRecordType === 'xiaoliuren' && '占卜记录及关联的AI报告将永久删除，无法恢复。'}
              {deleteRecordType === 'digital_energy' && '测算记录及关联的AI报告将永久删除，无法恢复。'}
              {deleteRecordType === 'bazhai' && '八宅记录及关联的AI报告将永久删除，无法恢复。'}
              {deleteRecordType === 'health' && '健康分析记录及关联的AI报告将永久删除，无法恢复。'}
            </p>
            {recordDeleteMsg && (
              <p className={`text-sm mt-3 text-center ${recordDeleteMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                {recordDeleteMsg.text}
              </p>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-50 transition-colors disabled:opacity-50"
                onClick={() => { setShowDeleteRecordModal(false); setDeleteTargetRecord(null); setDeleteRecordType(null); }}
                disabled={Boolean(deletingRecordId)}
              >
                取消
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                onClick={handleDeleteRecord}
                disabled={Boolean(deletingRecordId)}
              >
                {deletingRecordId ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {shareTarget && (
        <ShareModal
          reportUuid={shareTarget.uuid}
          reportTitle={REPORT_TYPE_LABELS[shareTarget.reportType] || shareTarget.reportType}
          reportType={shareTarget.reportType}
          overallScore={undefined}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}
