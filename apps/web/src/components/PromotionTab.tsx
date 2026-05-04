'use client';

import { useEffect, useState, useCallback } from 'react';
import { promotionApi } from '@/lib/api';
import { DISTRIBUTOR_LEVELS, COMMISSION_STATUS, PROMOTION_TIPS } from '@/lib/promotion-templates';
import { PLATFORM_STATS } from '@/lib/constants';
import PosterGenerator from './PosterGenerator';

interface DashboardData {
  isDistributor: boolean;
  level?: number;
  totalEarnings?: number;
  pendingAmount?: number;
  withdrawnAmount?: number;
  totalOrders?: number;
  totalTeamSize?: number;
  commissionRate?: number | null;
  recentCommissions?: CommissionRecord[];
  referralLink: string;
}

interface CommissionRecord {
  id: number;
  buyerNickname: string;
  commissionLevel: number;
  commissionRate: number;
  commissionAmount: number;
  orderAmount: number;
  status: number;
  createdAt: string;
}

interface LeaderboardEntry {
  id: number;
  totalEarnings: number;
}

export default function PromotionTab() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const [earningsPage, setEarningsPage] = useState(1);
  const [earnings, setEarnings] = useState<{ records: CommissionRecord[]; total: number } | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [team, setTeam] = useState<any[] | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [miniTab, setMiniTab] = useState<'earnings' | 'team' | 'leaderboard'>('earnings');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showPoster, setShowPoster] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await promotionApi.getDashboard();
      setDashboard(data);
      // Generate QR code for referral link
      try {
        const QRCode = (await import('qrcode')).default || (await import('qrcode'));
        const url = await QRCode.toDataURL(data.referralLink, {
          width: 180,
          margin: 2,
          color: { dark: '#6d2a1c', light: '#ffffff' },
        });
        setQrDataUrl(url);
      } catch {
        setQrDataUrl(
          `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data.referralLink)}`,
        );
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || '加载失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleApply = async () => {
    setApplying(true);
    try {
      await promotionApi.apply();
      await loadDashboard();
    } catch (err: any) {
      setError(err?.response?.data?.message || '申请失败，请重试');
    } finally {
      setApplying(false);
    }
  };

  const handleCopyLink = async () => {
    if (!dashboard?.referralLink) return;
    try {
      await navigator.clipboard.writeText(dashboard.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = dashboard.referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const loadEarnings = async (page: number = 1) => {
    setEarningsLoading(true);
    try {
      const { data } = await promotionApi.getEarnings(page, 20);
      setEarnings(data);
      setEarningsPage(page);
    } catch { /* noop */ }
    finally { setEarningsLoading(false); }
  };

  const loadTeam = async () => {
    setTeamLoading(true);
    try {
      const { data } = await promotionApi.getTeam();
      setTeam(data.teamMembers || []);
    } catch { /* noop */ }
    finally { setTeamLoading(false); }
  };

  const loadLeaderboard = async () => {
    try {
      const { data } = await promotionApi.getLeaderboard();
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch { /* noop */ }
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    setWithdrawMsg(null);
    try {
      const { data } = await promotionApi.withdraw();
      setWithdrawMsg({
        type: 'success',
        text: `提现申请已提交，等待管理员审核`,
      });
      await loadDashboard();
    } catch (err: any) {
      setWithdrawMsg({
        type: 'error',
        text: err?.response?.data?.message || '提现失败，请重试',
      });
    } finally {
      setWithdrawing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4">
              <div className="h-3 w-16 rounded skeleton-shimmer mb-2" />
              <div className="h-6 w-24 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
        <div className="card p-6 space-y-3">
          <div className="h-4 w-32 rounded skeleton-shimmer" />
          <div className="h-10 w-full rounded skeleton-shimmer" />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !dashboard) {
    return (
      <div className="mt-6 text-center py-16">
        <p className="text-ink-600 font-kai text-lg mb-2">推广中心加载失败</p>
        <p className="text-ink-400 text-sm mb-4">{error}</p>
        <button className="btn-outline text-sm" onClick={loadDashboard}>重试</button>
      </div>
    );
  }

  // Not applied yet state
  if (!dashboard?.isDistributor) {
    return (
      <div className="mt-6 space-y-5">
        {/* Hero */}
        <div className="card text-center bg-gradient-to-br from-primary-50 via-gold-50 to-primary-50 border-primary-200 py-8">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-xl font-bold font-kai text-primary-700 mb-2">推广中心</h2>
          <p className="text-ink-500 text-sm mb-1 max-w-xs mx-auto leading-relaxed">
            分享专属链接，好友注册后消费，你即可获得佣金奖励
          </p>
          <p className="text-xs text-gold-600 font-medium mb-6">
            已有 {PLATFORM_STATS.totalUsers} 用户加入平台
          </p>
          <button
            className="btn-gold px-8 py-2.5 text-sm disabled:opacity-50"
            onClick={handleApply}
            disabled={applying}
          >
            {applying ? '申请中...' : '成为推广员，开始赚钱'}
          </button>
          {error && (
            <p className="text-red-500 text-xs mt-3">{error}</p>
          )}
        </div>

        {/* Referral link preview */}
        <div className="card">
          <p className="text-sm font-medium text-ink-700 mb-2 font-kai">你的专属推广链接</p>
          <div className="flex gap-2">
            <input
              type="text" readOnly
              value={dashboard?.referralLink ?? ''}
              className="flex-1 bg-ink-50 rounded-lg px-3 py-2 text-xs text-ink-600 border border-ink-100 focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                copied ? 'bg-green-50 text-green-600 border border-green-200' : 'btn-outline'
              }`}
            >
              {copied ? '已复制' : '复制链接'}
            </button>
          </div>
          <p className="text-xs text-ink-400 mt-3">
            申请成为推广员后即可开始赚取佣金
          </p>
        </div>

        {/* How it works */}
        <div className="card">
          <h3 className="text-sm font-bold font-kai text-ink-700 mb-3">推广流程</h3>
          <div className="flex items-center gap-3 text-xs text-ink-500">
            <span className="px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 font-medium">1. 分享链接</span>
            <span className="text-ink-300">→</span>
            <span className="px-3 py-1.5 rounded-full bg-gold-50 text-gold-700 font-medium">2. 好友注册</span>
            <span className="text-ink-300">→</span>
            <span className="px-3 py-1.5 rounded-full bg-green-50 text-green-700 font-medium">3. 好友消费</span>
            <span className="text-ink-300">→</span>
            <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 font-medium">4. 获得佣金</span>
          </div>
        </div>

        {/* Promotion tips */}
        {PROMOTION_TIPS.map((tip, i) => (
          <div key={i} className="card">
            <h3 className="text-sm font-bold font-kai text-ink-700 mb-1">{tip.title}</h3>
            <p className="text-xs text-ink-500 leading-relaxed">{tip.content}</p>
          </div>
        ))}
      </div>
    );
  }

  // Active distributor dashboard
  const level = DISTRIBUTOR_LEVELS[dashboard.level || 1];
  const statCards = [
    { label: '累计收益', value: `¥${(dashboard.totalEarnings || 0).toFixed(2)}` },
    { label: '待结算', value: `¥${(dashboard.pendingAmount || 0).toFixed(2)}` },
    { label: '团队成员', value: `${dashboard.totalTeamSize || 0} 人` },
    { label: '推广订单', value: `${dashboard.totalOrders || 0} 单` },
  ];

  return (
    <div className="mt-6 space-y-5">
      {/* Level badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold font-kai text-ink-800">推广中心</span>
          <span className={`px-2 py-0.5 text-[10px] rounded-full border font-medium ${
            dashboard.level === 3 ? 'bg-blue-50 text-blue-700 border-blue-200'
              : dashboard.level === 2 ? 'bg-gold-50 text-gold-700 border-gold-200'
              : 'bg-ink-50 text-ink-600 border-ink-200'
          }`}>
            {level.name}
          </span>
        </div>
        {withdrawMsg && (
          <p className={`text-xs ${withdrawMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {withdrawMsg.text}
          </p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="card p-4 bg-white">
            <p className="text-xs text-ink-400 mb-1">{card.label}</p>
            <p className="text-lg font-bold font-kai text-primary-700">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Share tools */}
      <div className="card">
        <h3 className="text-sm font-bold font-kai text-ink-700 mb-3">推广工具</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text" readOnly
            value={dashboard.referralLink}
            className="flex-1 bg-ink-50 rounded-lg px-3 py-2 text-xs text-ink-600 border border-ink-100 focus:outline-none"
          />
          <button
            onClick={handleCopyLink}
            className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              copied ? 'bg-green-50 text-green-600 border border-green-200' : 'btn-outline'
            }`}
          >
            {copied ? '已复制' : '复制链接'}
          </button>
        </div>
        {qrDataUrl && (
          <div className="flex flex-col items-center">
            <div className="bg-white border border-ink-100 rounded-xl p-2 mb-1">
              <img src={qrDataUrl} alt="推广二维码" className="w-36 h-36" width={144} height={144} />
            </div>
            <p className="text-xs text-ink-400 mb-2">扫一扫或长按识别，分享给微信好友</p>
            <button
              className="btn-outline text-xs px-4 py-2"
              onClick={() => setShowPoster(true)}
            >
              生成推广海报
            </button>
          </div>
        )}
        {showPoster && (
          <PosterGenerator
            referralLink={dashboard.referralLink}
            onClose={() => setShowPoster(false)}
          />
        )}
      </div>

      {/* Earnings + Team + Leaderboard tabs */}
      <div className="flex gap-6 border-b border-ink-100">
        {(['earnings', 'team', 'leaderboard'] as const).map((t) => {
          const labels = { earnings: '收益记录', team: '我的团队', leaderboard: '排行榜' };
          return (
            <button
              key={t}
              onClick={() => {
                setMiniTab(t);
                if (t === 'earnings') loadEarnings();
                else if (t === 'team') loadTeam();
                else if (t === 'leaderboard') loadLeaderboard();
              }}
              className={`pb-2 text-xs font-medium transition-colors ${
                miniTab === t ? 'text-primary-700 border-b-2 border-primary-500' : 'text-ink-400 hover:text-ink-600'
              }`}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* Earnings content */}
      {miniTab === 'earnings' && (
        <div className="space-y-2">
          {earningsLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-4">
                  <div className="h-3 w-48 rounded skeleton-shimmer mb-2" />
                  <div className="h-3 w-32 rounded skeleton-shimmer" />
                </div>
              ))}
            </div>
          )}
          {!earningsLoading && (!earnings || earnings.records.length === 0) && (
            <div className="text-center py-10">
              <p className="text-ink-400 text-sm">还没有收益记录</p>
              <p className="text-ink-300 text-xs mt-1">快去分享推广链接吧！</p>
            </div>
          )}
          {earnings?.records.map((rec) => (
            <div key={rec.id} className="card flex items-center justify-between p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink-700 truncate">{rec.buyerNickname}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full border ${COMMISSION_STATUS[rec.status]?.color || ''}`}>
                    {COMMISSION_STATUS[rec.status]?.label || '未知'}
                  </span>
                </div>
                <p className="text-xs text-ink-400 mt-0.5">
                  订单 ¥{rec.orderAmount} · 佣金率 {(rec.commissionRate * 100).toFixed(0)}% · {rec.commissionLevel === 1 ? '一级' : '二级'}
                </p>
              </div>
              <span className="text-sm font-bold font-kai text-gold-700 shrink-0 ml-3">
                +¥{rec.commissionAmount.toFixed(2)}
              </span>
            </div>
          ))}
          {earnings && earnings.total > 20 && (
            <button
              className="btn-outline text-xs w-full py-2"
              onClick={() => loadEarnings(earningsPage + 1)}
              disabled={earningsLoading}
            >
              加载更多
            </button>
          )}
        </div>
      )}

      {/* Team content */}
      {miniTab === 'team' && (
        <div className="space-y-2">
          {teamLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-4">
                  <div className="h-3 w-32 rounded skeleton-shimmer" />
                </div>
              ))}
            </div>
          )}
          {!teamLoading && (!team || team.length === 0) && (
            <div className="text-center py-10">
              <p className="text-ink-400 text-sm">还没有团队成员</p>
              <p className="text-ink-300 text-xs mt-1">分享推广链接，邀请好友加入！</p>
            </div>
          )}
          {team?.map((member) => (
            <div key={member.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-ink-700">{member.nickname}</p>
                <p className="text-xs text-ink-400 mt-0.5">
                  {new Date(member.joinedAt).toLocaleDateString('zh-CN')} 加入
                  {member.orderCount > 0 && <> · {member.orderCount} 单</>}
                  {member.totalSpent > 0 && <> · 消费 ¥{Number(member.totalSpent).toFixed(0)}</>}
                </p>
              </div>
              {member.orderCount > 0 ? (
                <span className="text-xs text-gold-600 font-medium">已消费</span>
              ) : (
                <span className="text-xs text-ink-400">未消费</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard content */}
      {miniTab === 'leaderboard' && (
        <div className="space-y-2 mt-2">
          {leaderboard.length === 0 && (
            <div className="text-center py-10">
              <p className="text-ink-400 text-sm">排行榜暂无数据</p>
              <p className="text-ink-300 text-xs mt-1">努力推广，争取上榜！</p>
            </div>
          )}
          {leaderboard.slice(0, 10).map((entry, i) => (
            <div key={entry.id} className="flex items-center gap-3 px-4 py-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i === 0 ? 'bg-yellow-400 text-white'
                  : i === 1 ? 'bg-gray-300 text-white'
                  : i === 2 ? 'bg-amber-600 text-white'
                  : 'bg-ink-50 text-ink-500'
              }`}>
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-ink-600">推广员{String(entry.id).padStart(4, '0')}</span>
              <span className="text-sm font-bold font-kai text-gold-700">
                ¥{Number(entry.totalEarnings || 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Withdrawal */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold font-kai text-ink-700 mb-0.5">佣金提现</h3>
            <p className="text-xs text-ink-400">可提现余额：¥{(dashboard.pendingAmount || 0).toFixed(2)}</p>
          </div>
          <button
            className="btn-gold text-xs px-4 py-2 disabled:opacity-50"
            onClick={handleWithdraw}
            disabled={withdrawing || (dashboard.pendingAmount || 0) <= 0}
          >
            {withdrawing ? '提交中...' : '申请提现'}
          </button>
        </div>
        <p className="text-xs text-ink-400 mt-3">
          已提现：¥{(dashboard.withdrawnAmount || 0).toFixed(2)} · 提现后佣金转入账户余额，可用于购买报告或卡密提现
        </p>
      </div>

      {/* Promotion tips */}
      <details className="card cursor-pointer">
        <summary className="text-sm font-bold font-kai text-ink-700">推广攻略与等级说明</summary>
        <div className="mt-3 space-y-3">
          {/* Levels */}
          <div>
            <p className="text-xs font-medium text-ink-600 mb-1.5">推广员等级</p>
            {([1, 2, 3] as const).map((l) => {
              const lv = DISTRIBUTOR_LEVELS[l];
              return (
                <div key={l} className="flex items-center justify-between py-1.5 border-b border-ink-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      l === 3 ? 'bg-blue-500' : l === 2 ? 'bg-gold-500' : 'bg-ink-400'
                    }`} />
                    <span className="text-xs text-ink-700">{lv.name}</span>
                  </div>
                  <span className="text-xs text-ink-400">{lv.rate}</span>
                </div>
              );
            })}
          </div>
          {/* Tips */}
          {PROMOTION_TIPS.map((tip, i) => (
            <div key={i}>
              <p className="text-xs font-medium text-ink-600 mb-1">{tip.title}</p>
              <p className="text-xs text-ink-400 leading-relaxed">{tip.content}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
