'use client';

import { boneToChinese } from '@/lib/chenggu';
import { wxColor } from './wuxing-utils';

interface ChengguResult {
  yearScore: number;
  monthScore: number;
  dayScore: number;
  hourScore: number;
  totalScore: number;
  totalLiang: number;
  totalQian: number;
  interpretation: string;
  yearGanZhi: string;
  monthLunar: number;
  dayLunar: number;
  hourZhi: string;
}

interface ChengguCardProps {
  result: ChengguResult | null;
  gender: number;
}

const LUNAR_MONTH_NAMES = [
  '', '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月',
];

const LUNAR_DAY_PREFIX = [
  '', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

function lunarMonthName(m: number): string {
  return LUNAR_MONTH_NAMES[m] || `${m}月`;
}

function lunarDayName(d: number): string {
  return LUNAR_DAY_PREFIX[d] || `${d}日`;
}

function scoreToDisplay(score: number): string {
  const liang = Math.floor(score);
  const qian = Math.round((score - liang) * 10);
  if (qian === 0) return `${liang}.0两`;
  return `${liang}.${qian}两`;
}

interface BoneRowProps {
  label: string;
  detail: string;
  score: number;
  ganZhi?: string;
}

function BoneRow({ label, detail, score, ganZhi }: BoneRowProps) {
  return (
    <div className="flex items-center justify-between py-2 px-1 group/bone transition-colors duration-300">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[11px] md:text-xs text-chart-muted font-kai w-8 shrink-0 tracking-wide">
          {label}
        </span>
        <span className="text-xs md:text-sm text-chart-text/80 font-kai tracking-wider truncate">
          {detail}
        </span>
      </div>
      <span className="text-xs md:text-sm text-chart-text/60 font-kai tabular-nums shrink-0 ml-3">
        {scoreToDisplay(score)}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl bg-chart-surface border border-chart-border/60 px-5 py-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-2xl opacity-30">🦴</span>
        <h3 className="font-kai text-base text-chart-text/70">袁天罡称骨</h3>
        <p className="text-xs text-chart-muted/70 leading-relaxed max-w-sm">
          称骨算命需要农历出生日期信息。当前命盘缺少农历数据，无法计算骨重。
        </p>
      </div>
    </div>
  );
}

export default function ChengguCard({ result, gender }: ChengguCardProps) {
  if (!result) {
    return <EmptyState />;
  }

  const genderLabel = gender === 2 ? '坤造' : '乾造';
  const chineseBone = boneToChinese(result.totalScore);

  const yearGan = result.yearGanZhi[0];
  const yearZhi = result.yearGanZhi[1];

  return (
    <div className="rounded-xl bg-chart-surface border border-chart-border/70 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-1">
        <div className="flex items-center gap-2.5">
          <span className="text-lg opacity-50" aria-hidden>🦴</span>
          <h3 className="font-kai text-base md:text-lg text-chart-text tracking-wider">
            袁天罡称骨
          </h3>
        </div>
        <span
          className={[
            'font-display text-sm md:text-base tracking-widest px-3 py-0.5 rounded-full border',
            gender === 2
              ? 'text-red-400/80 border-red-400/20 bg-red-400/5'
              : 'text-blue-400/80 border-blue-400/20 bg-blue-400/5',
          ].join(' ')}
        >
          {genderLabel}
        </span>
      </div>

      {/* Subtitle */}
      <p className="px-5 pb-1 text-[10px] text-chart-muted/60 font-kai tracking-wide">
        唐·袁天罡 称骨歌诀
      </p>

      {/* Bone weight breakdown */}
      <div className="px-4 py-2 space-y-0 divide-y divide-chart-border/30">
        <BoneRow
          label="年柱"
          detail={result.yearGanZhi}
          score={result.yearScore}
        />
        <BoneRow
          label="农历月"
          detail={lunarMonthName(result.monthLunar)}
          score={result.monthScore}
        />
        <BoneRow
          label="农历日"
          detail={lunarDayName(result.dayLunar)}
          score={result.dayScore}
        />
        <BoneRow
          label="时辰"
          detail={`${result.hourZhi}时`}
          score={result.hourScore}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-chart-accent/40 to-transparent" />
        <span className="text-[10px] text-chart-muted/50 font-kai tracking-widest shrink-0">
          总 骨 重
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-chart-accent/40 to-transparent" />
      </div>

      {/* Total bone weight */}
      <div className="flex flex-col items-center px-5 pb-1">
        <span className="font-display text-3xl md:text-4xl text-chart-accent tracking-[0.15em] leading-tight">
          {chineseBone}
        </span>
        <span className="text-sm text-chart-muted/70 font-kai mt-0.5 tracking-wide">
          {result.totalScore.toFixed(1)}两
        </span>
      </div>

      {/* Decorative separator */}
      <div className="px-5 pt-3 pb-4">
        <div className="rounded-lg bg-chart-bg/60 border border-chart-border/40 px-4 py-3 relative overflow-hidden">
          {/* Subtle grain texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 50%, rgba(212,168,75,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(212,168,75,0.2) 0%, transparent 40%)',
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-chart-accent/60" />
              <span className="text-[10px] text-chart-accent/70 font-kai tracking-widest">
                称骨批注
              </span>
            </div>
            <p className="font-kai text-sm md:text-base text-chart-text/90 leading-relaxed tracking-wide">
              {result.interpretation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
