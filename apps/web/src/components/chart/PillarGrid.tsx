'use client';

import { type ChartResponse, type PillarData } from '@/lib/api';

const GAN_WUXING: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火',
  戊: '土', 己: '土', 庚: '金', 辛: '金',
  壬: '水', 癸: '水',
};

const ZHI_WUXING: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木',
  辰: '土', 巳: '火', 午: '火', 未: '土',
  申: '金', 酉: '金', 戌: '土', 亥: '水',
};

const WUXING_CLASS: Record<string, string> = {
  木: 'text-wx-wood',
  火: 'text-wx-fire',
  土: 'text-wx-earth',
  金: 'text-wx-metal',
  水: 'text-wx-water',
};

function wxCls(wuxing: string): string {
  return WUXING_CLASS[wuxing] ?? 'text-chart-text';
}

function ganCls(gan: string): string {
  return wxCls(GAN_WUXING[gan] ?? '');
}

function zhiCls(zhi: string): string {
  return wxCls(ZHI_WUXING[zhi] ?? '');
}

type PillarMeta = {
  key: string;
  label: string;
  data: PillarData;
  ganPos: string;
  isDayPillar: boolean;
};

interface PillarGridProps {
  chart: ChartResponse;
}

const EMPTY_PILLAR: PillarData = {
  gan: '',
  zhi: '',
  gan_wuxing: '',
  zhi_wuxing: '',
  nayin: '',
  hidden_gan: [],
  chang_sheng: '',
};

export default function PillarGrid({ chart }: PillarGridProps) {
  const pillars: PillarMeta[] = [
    { key: 'year', label: '年柱', data: chart.year_pillar ?? EMPTY_PILLAR, ganPos: 'year_gan', isDayPillar: false },
    { key: 'month', label: '月柱', data: chart.month_pillar ?? EMPTY_PILLAR, ganPos: 'month_gan', isDayPillar: false },
    { key: 'day', label: '日柱', data: chart.day_pillar ?? EMPTY_PILLAR, ganPos: 'day_gan', isDayPillar: true },
    { key: 'hour', label: '时柱', data: chart.hour_pillar ?? EMPTY_PILLAR, ganPos: 'hour_gan', isDayPillar: false },
  ];

  const tenGods = Array.isArray(chart.ten_gods) ? chart.ten_gods : [];
  const tenGodByPos = new Map(
    tenGods.map((e) => [e.position, e.ten_god]),
  );

  const hiddenTenGod = new Map(
    tenGods
      .filter((e) => e.position.includes('hidden'))
      .map((e) => [e.gan, e.ten_god]),
  );

  const kongWangSet = new Set(Array.isArray(chart.kong_wang) ? chart.kong_wang : []);

  const maxHidden = Math.max(...pillars.map((p) => (Array.isArray(p.data.hidden_gan) ? p.data.hidden_gan.length : 0)), 1);

  const extras = [
    { label: '胎元', value: chart.tai_yuan },
    { label: '命宫', value: chart.ming_gong },
    { label: '身宫', value: chart.shen_gong },
  ].filter((e) => e.value);

  return (
    <div className="rounded-xl bg-chart-bg p-3 md:p-5 space-y-4">
      <div className="grid grid-cols-4">
        {pillars.map((p, idx) => {
          const tenGod = p.isDayPillar
            ? '日主'
            : (tenGodByPos.get(p.ganPos) ?? '');
          const changSheng =
            p.data.chang_sheng || chart.chang_sheng?.[p.key] || '';

          return (
            <div
              key={p.key}
              className={[
                'flex flex-col items-center py-3 px-1 md:px-4 space-y-1.5',
                p.isDayPillar ? 'bg-chart-surface/40 rounded-lg' : '',
                idx > 0 ? 'border-l border-chart-border/50' : '',
              ].join(' ')}
            >
              <span className="text-[10px] md:text-xs tracking-widest text-chart-muted">
                {p.label}
              </span>

              <span
                className={`text-xs md:text-sm ${
                  p.isDayPillar
                    ? 'text-chart-accent font-semibold'
                    : 'text-chart-text/70'
                }`}
              >
                {tenGod || '\u00A0'}
              </span>

              <span
                className={`font-display text-2xl md:text-3xl leading-none ${
                  p.data.gan_wuxing
                    ? wxCls(p.data.gan_wuxing)
                    : ganCls(p.data.gan)
                }${p.isDayPillar ? ' drop-shadow-[0_0_6px_rgba(255,255,255,0.25)]' : ''}`}
              >
                {p.data.gan}
              </span>

              <div className="w-6 md:w-10 h-px bg-chart-border" />

              <span
                className={`font-display text-2xl md:text-3xl leading-none ${
                  p.data.zhi_wuxing
                    ? wxCls(p.data.zhi_wuxing)
                    : zhiCls(p.data.zhi)
                }${p.isDayPillar ? ' drop-shadow-[0_0_6px_rgba(255,255,255,0.25)]' : ''}`}
              >
                {p.data.zhi}
              </span>

              {/* Fixed-height region so columns stay aligned regardless of hidden gan count */}
              <div
                className="flex flex-col items-center pt-1 space-y-0.5"
                style={{ minHeight: `${maxHidden * 1.25 + 0.25}rem` }}
              >
                {(Array.isArray(p.data.hidden_gan) ? p.data.hidden_gan : []).map((g, gi) => (
                  <span
                    key={gi}
                    className="text-[11px] md:text-xs leading-tight whitespace-nowrap"
                  >
                    <span className={ganCls(g)}>{g}</span>
                    <span className="text-chart-muted/70 ml-0.5">
                      {hiddenTenGod.get(g) ?? ''}
                    </span>
                  </span>
                ))}
              </div>

              {p.data.nayin && (
                <span className="text-[9px] md:text-[11px] text-chart-muted/60 leading-tight">
                  {p.data.nayin}
                </span>
              )}

              {changSheng && (
                <span className="text-[9px] md:text-[11px] text-chart-muted leading-tight">
                  {changSheng}
                </span>
              )}

              {kongWangSet.has(p.data.zhi) && (
                <span className="text-[10px] md:text-xs text-red-400/80 font-medium">
                  空
                </span>
              )}
            </div>
          );
        })}
      </div>

      {extras.length > 0 && (
        <div className="flex justify-center gap-2 md:gap-3 pt-3 border-t border-chart-border/40">
          {extras.map((e) => {
            const gan = e.value[0] ?? '';
            const zhi = e.value[1] ?? '';
            return (
              <div
                key={e.label}
                className="flex flex-col items-center rounded-lg bg-chart-surface border border-chart-border/60 px-3 md:px-4 py-1.5 md:py-2"
              >
                <span className="text-[9px] md:text-[10px] text-chart-muted">
                  {e.label}
                </span>
                <div className="flex gap-0.5 font-display text-sm md:text-base">
                  <span className={ganCls(gan)}>{gan}</span>
                  <span className={zhiCls(zhi)}>{zhi}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
