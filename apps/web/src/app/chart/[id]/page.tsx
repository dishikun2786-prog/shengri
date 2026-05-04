'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ChartLayout from '@/components/chart/ChartLayout';
import type { ChartResponse, PillarData } from '@/lib/api';
import { baziApi } from '@/lib/api';
import { REPORT_TYPE_LABELS } from '@/lib/constants';

const EMPTY_PILLAR: PillarData = {
  gan: '',
  zhi: '',
  gan_wuxing: '',
  zhi_wuxing: '',
  nayin: '',
  hidden_gan: [],
  chang_sheng: '',
};

const normalizeChart = (raw: any): (ChartResponse & { reports?: any[] }) => {
  if (!raw || typeof raw !== 'object') {
    return {} as ChartResponse & { reports?: any[] };
  }
  const buildPillar = (
    snake: any,
    gan: any,
    zhi: any,
    hidden: any,
    nayin: any,
    changSheng: any,
  ): PillarData => {
    if (snake && typeof snake === 'object') {
      return {
        ...EMPTY_PILLAR,
        ...snake,
        hidden_gan: Array.isArray(snake.hidden_gan) ? snake.hidden_gan : [],
      };
    }
    return {
      ...EMPTY_PILLAR,
      gan: gan ?? '',
      zhi: zhi ?? '',
      hidden_gan: Array.isArray(hidden) ? hidden : [],
      nayin: nayin ?? '',
      chang_sheng: changSheng ?? '',
    };
  };

  return {
    ...raw,
    year_pillar: buildPillar(raw.year_pillar, raw.yearGan, raw.yearZhi, raw.yearHidden, raw.yearNayin, raw.changSheng?.year),
    month_pillar: buildPillar(raw.month_pillar, raw.monthGan, raw.monthZhi, raw.monthHidden, raw.monthNayin, raw.changSheng?.month),
    day_pillar: buildPillar(raw.day_pillar, raw.dayGan, raw.dayZhi, raw.dayHidden, raw.dayNayin, raw.changSheng?.day),
    hour_pillar: buildPillar(raw.hour_pillar, raw.hourGan, raw.hourZhi, raw.hourHidden, raw.hourNayin, raw.changSheng?.hour),
    day_master: raw.day_master ?? raw.dayGan ?? '',
    day_master_wuxing: raw.day_master_wuxing ?? '',
    day_master_strength: Number(raw.day_master_strength ?? raw.dayMasterStrength ?? 0),
    strength_level: raw.strength_level ?? raw.strengthLevel ?? '',
    wuxing_counts: raw.wuxing_counts ?? raw.wuxingCounts ?? {},
    wuxing_score: raw.wuxing_score ?? raw.wuxingScore ?? {},
    ten_gods: Array.isArray(raw.ten_gods)
      ? raw.ten_gods
      : Array.isArray(raw.tenGodsMap)
        ? raw.tenGodsMap
        : [],
    shensha_list: Array.isArray(raw.shensha_list) ? raw.shensha_list : (Array.isArray(raw.shenshaList) ? raw.shenshaList : []),
    kong_wang: Array.isArray(raw.kong_wang) ? raw.kong_wang : (Array.isArray(raw.kongWang) ? raw.kongWang : []),
    chang_sheng: raw.chang_sheng ?? raw.changSheng ?? {},
    tai_yuan: raw.tai_yuan ?? raw.taiYuan ?? '',
    ming_gong: raw.ming_gong ?? raw.mingGong ?? '',
    shen_gong: raw.shen_gong ?? raw.shenGong ?? '',
    relations: Array.isArray(raw.relations) ? raw.relations : [],
    pattern_type: raw.pattern_type ?? raw.patternType ?? '',
    pattern_name: raw.pattern_name ?? raw.patternName ?? '',
    pattern_score: Number(raw.pattern_score ?? raw.patternScore ?? 0),
    yong_shen: raw.yong_shen ?? raw.yongShen ?? '',
    xi_shen: raw.xi_shen ?? raw.xiShen ?? '',
    ji_shen: raw.ji_shen ?? raw.jiShen ?? '',
    chou_shen: raw.chou_shen ?? raw.chouShen ?? '',
    tiaohuo_need: raw.tiaohuo_need ?? raw.tiaohuoNeed ?? '',
    dayun_direction: Number(raw.dayun_direction ?? raw.dayunDirection ?? 1),
    dayun_start_age: Number(raw.dayun_start_age ?? raw.dayunStartAge ?? 0),
    dayun_list: Array.isArray(raw.dayun_list) ? raw.dayun_list : (Array.isArray(raw.dayunList) ? raw.dayunList : []),
    liunian_list: Array.isArray(raw.liunian_list) ? raw.liunian_list : (Array.isArray(raw.liunianList) ? raw.liunianList : []),
    jieqi_info: raw.jieqi_info ?? raw.jieqiInfo ?? '',
    lunar_date: raw.lunar_date ?? raw.lunarDate ?? '',
    lunar_input: raw.lunar_input ?? raw.lunarInput ?? undefined,
  };
};

export default function ChartDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [chart, setChart] = useState<(ChartResponse & { reports?: any[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = params?.id;
    if (!id) return;

    const idNum = Number(id);
    if (isNaN(idNum)) {
      setError('无效的命盘 ID');
      setLoading(false);
      return;
    }

    baziApi.getChart(idNum)
      .then((res) => {
        if (res.data) {
          setChart(normalizeChart(res.data));
        } else {
          setError('未找到命盘数据');
        }
      })
      .catch(() => {
        setError('加载命盘数据失败');
      })
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-ink-100 rounded w-1/3" />
          <div className="h-64 bg-ink-100 rounded" />
          <div className="h-48 bg-ink-100 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <p className="text-red-500 text-lg mb-4">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="text-primary-600 hover:text-primary-700 underline"
        >
          返回首页
        </button>
      </div>
    );
  }

  if (!chart) return null;

  const reports: any[] = chart.reports || [];
  const paidReport = reports.find((r: any) => r.isPaid);
  const freeReport = reports.find((r: any) => !r.isPaid);
  const latestReport = reports[0];
  const canOpenLatestChat = Boolean(latestReport?.uuid);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ChartLayout chart={chart} />

      {reports.length > 0 && (
        <div className="mt-8 max-w-2xl mx-auto">
          <h3 className="text-lg font-bold font-kai text-primary-700 mb-4 text-center">已有分析报告</h3>
          <div className="space-y-3">
            {reports.map((report: any) => (
              <div
                key={report.uuid || report.id}
                className="group flex items-center gap-4 p-4 rounded-xl bg-white border border-ink-100/80
                           hover:border-ink-200 hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => router.push(`/report/${report.uuid}`)}
              >
                <div className="w-1 self-stretch rounded-full bg-gradient-to-b from-primary-400/40 to-gold-400/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-700 font-kai">
                      {REPORT_TYPE_LABELS[report.reportType] || report.reportType}
                    </span>
                    {report.isPaid ? (
                      <span className="px-2 py-0.5 text-[10px] bg-gold-50 text-gold-700 rounded-full border border-gold-200/60 font-medium">完整版</span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] bg-ink-50 text-ink-500 rounded-full border border-ink-200/60">免费版</span>
                    )}
                  </div>
                  <div className="text-xs text-ink-300 mt-1">
                    {new Date(report.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
                <button
                  className="shrink-0 w-9 h-9 rounded-full bg-primary-50/80 text-primary-600
                             flex items-center justify-center text-sm
                             hover:bg-primary-100 hover:shadow-sm transition-all duration-200
                             opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); router.push(`/chat/${report.uuid}`); }}
                  title="AI 对话"
                >
                  ☯
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 flex flex-wrap justify-center gap-4">
        {latestReport && (
          <button
            onClick={() => {
              if (!canOpenLatestChat) return;
              router.push(`/chat/${latestReport.uuid}`);
            }}
            className="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-kai text-lg shadow-lg hover:shadow-xl transition-all hover:from-primary-600 hover:to-primary-700"
          >
            AI 命理对话
          </button>
        )}
        {(!paidReport) && (
          <a
            href={`/report/generating/${params?.id}${freeReport ? '?type=wealth&paid=1' : ''}`}
            className="inline-block px-8 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-lg font-kai text-lg shadow-lg hover:shadow-xl transition-all hover:from-gold-600 hover:to-gold-700"
          >
            {freeReport ? '升级付费报告' : '生成专业命理报告'}
          </a>
        )}
        {paidReport && !freeReport && (
          <button
            onClick={() => router.push(`/report/${paidReport.uuid}`)}
            className="px-8 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-lg font-kai text-lg shadow-lg hover:shadow-xl transition-all hover:from-gold-600 hover:to-gold-700"
          >
            查看完整报告
          </button>
        )}
      </div>
    </div>
  );
}
