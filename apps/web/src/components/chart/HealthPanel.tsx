'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChartResponse, WuYunliuqiAiResult } from '@/lib/api';
import { healthApi } from '@/lib/api';

interface HealthPanelProps {
  chart: ChartResponse;
  selectedYear: number | null;
  selectedMonth: number | null;
  selectedDay: number | null;
  liunianInfo?: { gan: string; zhi: string } | null;
  liuyueInfo?: { gan: string; zhi: string; month: number } | null;
  liuriInfo?: { gan: string; zhi: string; day: number } | null;
}

const LIUQI_NAMES: Record<string, { color: string; desc: string }> = {
  厥阴风木: { color: '#4CAF50', desc: '风木之气' },
  少阴君火: { color: '#F44336', desc: '君火之气' },
  少阳相火: { color: '#FF9800', desc: '相火之气' },
  太阴湿土: { color: '#795548', desc: '湿土之气' },
  阳明燥金: { color: '#9E9E9E', desc: '燥金之气' },
  太阳寒水: { color: '#2196F3', desc: '寒水之气' },
};

const LIUQI_ICONS: Record<string, string> = {
  厥阴风木: '🌿',
  少阴君火: '🔥',
  少阳相火: '☀️',
  太阴湿土: '🌱',
  阳明燥金: '⚪',
  太阳寒水: '❄️',
};

const WUXING_ICONS: Record<string, string> = {
  木: '🪵',
  火: '🔥',
  土: '🌍',
  金: '⚪',
  水: '💧',
};

const WUXING_COLORS: Record<string, string> = {
  木: '#4CAF50',
  火: '#F44336',
  土: '#FF9800',
  金: '#9E9E9E',
  水: '#2196F3',
};

const WUXING_NAMES: Record<string, string> = {
  木: '木行',
  火: '火行',
  土: '土行',
  金: '金行',
  水: '水行',
};

export default function HealthPanel({
  chart,
  selectedYear,
  selectedMonth,
  selectedDay,
  liunianInfo,
  liuyueInfo,
  liuriInfo,
}: HealthPanelProps) {
  const [aiResult, setAiResult] = useState<WuYunliuqiAiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const loadRef = useRef<string | null>(null);

  const baziJson = JSON.stringify({
    yearPillar: `${chart.year_pillar.gan}${chart.year_pillar.zhi}`,
    monthPillar: `${chart.month_pillar.gan}${chart.month_pillar.zhi}`,
    dayPillar: `${chart.day_pillar.gan}${chart.day_pillar.zhi}`,
    hourPillar: `${chart.hour_pillar.gan}${chart.hour_pillar.zhi}`,
    dayMaster: chart.day_master,
    dayMasterWuxing: chart.day_master_wuxing,
    wuxingCounts: chart.wuxing_counts,
  });

  // 根据选择层级确定目标日期
  const getTargetDate = useCallback(() => {
    if (!selectedYear) return null;
    const month = selectedMonth || 1;
    const day = selectedDay || 1;
    return `${selectedYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }, [selectedYear, selectedMonth, selectedDay]);

  // 构建当前日期的缓存key（用于检测日期是否变化）
  const getCurrentCacheKey = useCallback(() => {
    const targetDate = getTargetDate();
    if (!targetDate || !liunianInfo) return null;
    return `${targetDate}-${liunianInfo?.gan || ''}-${liuyueInfo?.gan || ''}-${liuriInfo?.gan || ''}`;
  }, [getTargetDate, liunianInfo, liuyueInfo, liuriInfo]);

  // 页面加载或选择变化时，检查缓存状态
  useEffect(() => {
    // 日期变化时，先重置所有状态
    const currentKey = getCurrentCacheKey();
    if (!currentKey) return;

    // 只有当日期真正变化时才重置状态
    if (loadRef.current !== currentKey) {
      setAiResult(null);
      setHasGenerated(false);
      setError(null);
      loadRef.current = currentKey;
    }

    const checkCache = async () => {
      const targetDate = getTargetDate();
      if (!targetDate || !liunianInfo) return;

      try {
        // 调用缓存状态检查接口
        const res = await healthApi.getWuYunCacheStatus(
          targetDate,
          liunianInfo?.gan,
          liunianInfo?.zhi,
          liuyueInfo?.gan,
          liuyueInfo?.zhi,
          liuriInfo?.gan,
          liuriInfo?.zhi,
          `${chart.year_pillar.gan}${chart.year_pillar.zhi}`,
        );

        if (res.data?.cached) {
          // 有缓存，直接生成（后端会从缓存返回）
          generateWithAi();
        }
        // 如果没缓存，hasGenerated 保持 false，显示生成按钮
      } catch (e) {
        // 忽略缓存检查错误
        console.log('缓存检查失败', e);
      }
    };

    checkCache();
  }, [selectedYear, selectedMonth, selectedDay]);

  // Helper function to get user from localStorage
const getLocalUser = (): { id?: number } | null => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// 调用 AI 生成五运六气分析（fire-and-forget + 轮询，绕过 Cloudflare 100s 超时）
  const generateWithAi = useCallback(async () => {
    const targetDate = getTargetDate();
    if (!targetDate) return;

    // 生成唯一标识避免重复请求
    const cacheKey = `${targetDate}-${liunianInfo?.gan || ''}-${liuyueInfo?.gan || ''}-${liuriInfo?.gan || ''}`;
    if (loadRef.current === cacheKey && loading) return;
    loadRef.current = cacheKey;

    // 从 localStorage 获取 userId（用于 Mem0 记忆查询）
    const localUser = getLocalUser();
    const effectiveUserId = localUser?.id ? String(localUser.id) : undefined;

    setLoading(true);
    setError(null);

    const doCall = async () => {
      // 根据选择的层级调用不同的 AI 接口
      if (selectedDay && liunianInfo && liuyueInfo && liuriInfo) {
        return healthApi.generateComprehensiveWuYunWithAi(
          targetDate,
          { gan: liunianInfo.gan, zhi: liunianInfo.zhi, year: selectedYear! },
          { gan: liuyueInfo.gan, zhi: liuyueInfo.zhi, month: selectedMonth! },
          { gan: liuriInfo.gan, zhi: liuriInfo.zhi, day: selectedDay },
          baziJson,
          undefined,
          effectiveUserId,
        );
      } else if (selectedDay && liuyueInfo) {
        return healthApi.generateLiuRiWuYunWithAi(
          targetDate, liuriInfo!.gan, liuriInfo!.zhi, selectedDay, baziJson,
        );
      } else if (selectedMonth && liunianInfo) {
        return healthApi.generateLiuYueWuYunWithAi(
          targetDate, liuyueInfo!.gan, liuyueInfo!.zhi, selectedMonth!, baziJson,
        );
      } else if (selectedYear && liunianInfo) {
        return healthApi.generateLiuNianWuYunWithAi(
          targetDate, liunianInfo.gan, liunianInfo.zhi, selectedYear!, baziJson,
        );
      }
      return healthApi.generateWuYunWithAi(
        targetDate, baziJson,
        liunianInfo?.gan, liunianInfo?.zhi,
        liuyueInfo?.gan, liuyueInfo?.zhi,
        liuriInfo?.gan, liuriInfo?.zhi,
      );
    };

    // 首次请求；若 Cloudflare 超时则自动轮询（后端异步处理并缓存到 Redis）
    const attemptOrPoll = async () => {
      try {
        const res = await doCall();
        setAiResult(res.data);
        setHasGenerated(true);
        setLoading(false);
      } catch (e: any) {
        const status = e?.response?.status;
        // Cloudflare Tunnel 100s timeout → 524; also treat 500/502/503/504 and network errors
        // as transient — backend continues processing and caches to Redis
        const isTimeout =
          status >= 500 || status === 0 ||
          e?.code === 'ECONNABORTED' || e?.code === 'ERR_NETWORK' ||
          e?.code === 'ERR_CANCELED';
        if (!isTimeout) {
          console.error('AI 五运六气生成失败:', e);
          setError(e?.response?.data?.message || e?.message || '生成失败，请稍后重试');
          setLoading(false);
          return;
        }
        // Cloudflare 100s 超时 — 后端继续处理并缓存，前端轮询
        let attempts = 0;
        const maxAttempts = 60; // 3 minutes
        const interval = setInterval(async () => {
          attempts++;
          try {
            const res = await doCall();
            if (res?.data) {
              clearInterval(interval);
              setAiResult(res.data);
              setHasGenerated(true);
              setLoading(false);
            }
          } catch {
            // Still generating
          }
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            setError('生成超时，报告可能已完成，请在个人中心查看');
            setLoading(false);
          }
        }, 3000);
      }
    };

    attemptOrPoll();
  }, [getTargetDate, selectedYear, selectedMonth, selectedDay, liunianInfo, liuyueInfo, liuriInfo, baziJson]);

  // 判断是否需要手动触发（未生成时）
  const needsManualTrigger = !hasGenerated && !loading && !error;

  // 构建标题
  const getTitleText = () => {
    const parts: string[] = [];
    if (liunianInfo) {
      parts.push(`${liunianInfo.gan}${liunianInfo.zhi}年`);
    }
    if (selectedMonth) {
      parts.push(`流月 ${selectedMonth}月`);
    }
    if (selectedDay) {
      parts.push(`流日 ${selectedDay}日`);
    }
    return parts.join(' ');
  };

  // 未选择流年时
  if (!selectedYear || !liunianInfo) {
    return (
      <div className="text-center py-6 text-gray-400 font-kai text-sm">
        选择流年查看健康养生建议
      </div>
    );
  }

  // 手动触发按钮界面（未生成状态）
  if (needsManualTrigger) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-green-700 font-kai flex items-center gap-2">
          <span>🫁</span> 健康养生
          <span className="text-xs font-normal text-gray-500">{getTitleText()}</span>
        </h3>
        <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
          <div className="text-center space-y-3">
            <div className="text-3xl">✨</div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-green-800 font-kai">点击下方按钮</p>
              <p className="text-xs text-green-600 font-kai">生成详细五运六气与健康养生分析</p>
            </div>
            <button
              onClick={generateWithAi}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg text-sm font-kai font-bold shadow-md transition-all flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              生成详细分析
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 加载中状态
  if (loading && !aiResult) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-green-700 font-kai flex items-center gap-2">
          <span>🫁</span> 健康养生
          <span className="text-xs font-normal text-gray-500">{getTitleText()}</span>
        </h3>
        <div className="animate-pulse space-y-2">
          <div className="h-20 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg" />
          <div className="h-16 bg-gray-100 rounded-lg" />
          <div className="h-16 bg-gray-100 rounded-lg" />
        </div>
        <div className="text-center py-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full text-xs text-green-600 font-kai">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            AI 分析中...
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error && !aiResult) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-green-700 font-kai flex items-center gap-2">
          <span>🫁</span> 健康养生
          <span className="text-xs font-normal text-gray-500">{getTitleText()}</span>
        </h3>
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-600 font-kai text-center">{error}</p>
          <button
            onClick={generateWithAi}
            className="mt-2 w-full px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs font-kai transition-colors"
          >
            重新生成
          </button>
        </div>
      </div>
    );
  }

  const sc = aiResult?.structuredContent;
  const yunqi = sc?.yunqiAnalysis;
  const healthSuggestions = sc?.healthSuggestions;
  const warnings = sc?.warnings;
  const organCare = sc?.organCare;
  const liunianGuidance = sc?.liunianGuidance;
  const liuyueGuidance = sc?.liuyueGuidance;
  const liuriGuidance = sc?.liuriGuidance;
  const constitution = sc?.constitution;

  return (
    <div className="space-y-3">
      {/* 标题 */}
      <h3 className="text-sm font-bold text-green-700 font-kai flex items-center gap-2">
        <span>🫁</span> 健康养生
        <span className="text-xs font-normal text-gray-500">{getTitleText()}</span>
      </h3>

      {/* 先天体质卡片 — 出生年五运六气 */}
      {constitution && (
        <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 shadow-sm">
          <div className="text-[10px] text-amber-600 font-kai mb-1">先天体质 · 出生年运气</div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-amber-800 font-kai">
              {constitution.type}
            </span>
          </div>
          {constitution.description && (
            <p className="text-[10px] text-amber-700 mt-1 leading-relaxed">{constitution.description}</p>
          )}
          {constitution.strengths && constitution.strengths.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {constitution.strengths.map((s: string, i: number) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-kai">{s}</span>
              ))}
            </div>
          )}
          {constitution.weaknesses && constitution.weaknesses.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {constitution.weaknesses.map((w: string, i: number) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-kai">{w}</span>
              ))}
            </div>
          )}
          {constitution.lifetimeCare && (
            <p className="text-[10px] text-amber-700 mt-1.5 italic font-kai">{constitution.lifetimeCare}</p>
          )}
        </div>
      )}

      {/* 年运概览卡片 */}
      {yunqi && (
        <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 shadow-sm">
          <div className="text-[10px] text-purple-600 font-kai mb-1">年运概览</div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-purple-800 font-kai">
              {yunqi.yearYun || liunianInfo.gan + liunianInfo.zhi}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              yunqi.yearYunType === '太过' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {yunqi.yearYunType || '未知'}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-[10px] text-purple-600">
            <span>司天：{yunqi.sitian || '未知'}</span>
            <span>在泉：{yunqi.zaiquan || '未知'}</span>
          </div>
        </div>
      )}

      {/* 主运客气双卡片 */}
      {yunqi && (
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg border-2 border-green-200 bg-green-50">
            <div className="text-[10px] text-green-600 font-kai">主运</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="text-xl font-bold"
                style={{ color: yunqi.mainYun ? LIUQI_NAMES[yunqi.mainYun]?.color : '#666' }}
              >
                {yunqi.mainYun ? LIUQI_ICONS[yunqi.mainYun] : '⚪'}
              </span>
              <div>
                <div className="text-sm font-bold text-green-800 font-kai">
                  {yunqi.mainYun || '未知'}
                </div>
              </div>
            </div>
          </div>
          <div className="p-2 rounded-lg border-2 border-amber-200 bg-amber-50">
            <div className="text-[10px] text-amber-600 font-kai">客气</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="text-xl font-bold"
                style={{ color: yunqi.keQi ? LIUQI_NAMES[yunqi.keQi]?.color : '#666' }}
              >
                {yunqi.keQi ? LIUQI_ICONS[yunqi.keQi] : '⚪'}
              </span>
              <div>
                <div className="text-sm font-bold text-amber-800 font-kai">{yunqi.keQi || '未知'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 流年/流月/流日养生指导 */}
      {(liunianGuidance || liuyueGuidance || liuriGuidance) && (
        <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
          <div className="text-[10px] text-blue-600 font-kai font-bold mb-1">
            {selectedDay ? '流日养生指导' : selectedMonth ? '流月养生指导' : '流年养生指导'}
          </div>
          {liunianGuidance && (
            <p className="text-xs text-blue-800 font-kai leading-relaxed">
              {liunianGuidance.analysis || liunianGuidance.healthFocus || ''}
            </p>
          )}
          {liuyueGuidance && (
            <p className="text-xs text-cyan-700 font-kai mt-1 leading-relaxed">
              {liuyueGuidance.analysis || liuyueGuidance.healthFocus || ''}
            </p>
          )}
          {liuriGuidance && (
            <p className="text-xs text-teal-700 font-kai mt-1 leading-relaxed">
              {liuriGuidance.analysis || liuriGuidance.healthFocus || ''}
            </p>
          )}
        </div>
      )}

      {/* AI 生成的养生建议 - 饮食 */}
      {healthSuggestions?.diet && healthSuggestions.diet.length > 0 && (
        <div className="p-2 rounded-lg bg-orange-50/50 border border-orange-100">
          <div className="text-[10px] text-orange-600 font-kai font-bold flex items-center gap-1 mb-1">
            <span>🍽️</span> 饮食建议
          </div>
          <ul className="space-y-1">
            {healthSuggestions.diet.slice(0, 3).map((item, i) => (
              <li key={i} className="text-xs text-orange-800 font-kai flex items-start gap-1">
                <span className="text-orange-400 mt-0.5">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI 生成的养生建议 - 起居 */}
      {healthSuggestions?.lifestyle && healthSuggestions.lifestyle.length > 0 && (
        <div className="p-2 rounded-lg bg-indigo-50/50 border border-indigo-100">
          <div className="text-[10px] text-indigo-600 font-kai font-bold flex items-center gap-1 mb-1">
            <span>🏠</span> 起居建议
          </div>
          <ul className="space-y-1">
            {healthSuggestions.lifestyle.slice(0, 3).map((item, i) => (
              <li key={i} className="text-xs text-indigo-800 font-kai flex items-start gap-1">
                <span className="text-indigo-400 mt-0.5">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI 生成的养生建议 - 情志 */}
      {healthSuggestions?.emotions && healthSuggestions.emotions.length > 0 && (
        <div className="p-2 rounded-lg bg-pink-50/50 border border-pink-100">
          <div className="text-[10px] text-pink-600 font-kai font-bold flex items-center gap-1 mb-1">
            <span>🧘</span> 情志调摄
          </div>
          <ul className="space-y-1">
            {healthSuggestions.emotions.slice(0, 3).map((item, i) => (
              <li key={i} className="text-xs text-pink-800 font-kai flex items-start gap-1">
                <span className="text-pink-400 mt-0.5">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI 生成的养生建议 - 运动 */}
      {healthSuggestions?.exercises && healthSuggestions.exercises.length > 0 && (
        <div className="p-2 rounded-lg bg-cyan-50/50 border border-cyan-100">
          <div className="text-[10px] text-cyan-600 font-kai font-bold flex items-center gap-1 mb-1">
            <span>🏃</span> 运动建议
          </div>
          <ul className="space-y-1">
            {healthSuggestions.exercises.slice(0, 3).map((item, i) => (
              <li key={i} className="text-xs text-cyan-800 font-kai flex items-start gap-1">
                <span className="text-cyan-400 mt-0.5">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 脏腑调养建议 */}
      {organCare && organCare.length > 0 && (
        <div className="p-2 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
          <div className="text-[10px] text-green-600 font-kai font-bold mb-1.5">脏腑调养重点</div>
          <div className="grid grid-cols-2 gap-1.5">
            {organCare.slice(0, 4).map((org, i) => (
              <div key={i} className="p-1.5 bg-white/60 rounded">
                <div className="flex items-center gap-1">
                  <span
                    className="text-sm"
                    style={{ color: WUXING_COLORS[org.wuxing || '木'] || '#9E9E9E' }}
                  >
                    {WUXING_ICONS[org.wuxing || '木'] || '⚪'}
                  </span>
                  <span className="text-xs font-bold text-green-800 font-kai">{org.organ}</span>
                </div>
                {org.suggestions && org.suggestions.length > 0 && (
                  <p className="text-[10px] text-green-600 font-kai mt-0.5 line-clamp-2">
                    {org.suggestions[0]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 健康预警 */}
      {warnings && warnings.length > 0 && (
        <div className="p-2 rounded-lg bg-red-50/50 border border-red-100">
          <div className="text-[10px] text-red-600 font-kai font-bold mb-1.5">健康预警</div>
          <div className="space-y-1">
            {warnings.slice(0, 3).map((w, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className={`text-[10px] px-1 rounded shrink-0 ${
                  w.severity === '高' ? 'bg-red-200 text-red-700' :
                  w.severity === '中' ? 'bg-amber-200 text-amber-700' :
                  'bg-blue-200 text-blue-700'
                }`}>
                  {w.severity || '中'}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-red-800 font-kai font-bold">{w.type}</span>
                  <p className="text-[10px] text-red-600 font-kai truncate">{w.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 重新生成按钮 */}
      <button
        onClick={generateWithAi}
        disabled={loading}
        className="w-full py-2 px-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg text-xs font-kai font-bold shadow-sm transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            AI 分析中...
          </>
        ) : (
          <>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重新生成
          </>
        )}
      </button>

      {/* Token 使用信息 */}
      {aiResult?.tokenUsed && (
        <div className="text-[10px] text-gray-400 font-kai text-center">
          消耗 tokens: {aiResult.tokenUsed}
        </div>
      )}
    </div>
  );
}
