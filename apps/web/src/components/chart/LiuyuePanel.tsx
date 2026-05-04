'use client';

import type { LiuYueData } from '@/lib/api';
import { wxColor } from './wuxing-utils';

interface LiuyuePanelProps {
  liuyueData: LiuYueData[];
  loading: boolean;
  selectedMonth: number | null;
  onSelectMonth: (month: number) => void;
}

function SkeletonCard() {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2 py-3 animate-pulse">
      <div className="h-3 w-6 rounded bg-ink-200" />
      <div className="h-5 w-8 rounded bg-ink-200" />
      <div className="h-3 w-10 rounded bg-ink-200" />
      <div className="h-2.5 w-12 rounded bg-ink-100" />
    </div>
  );
}

export default function LiuyuePanel({
  liuyueData,
  loading,
  selectedMonth,
  onSelectMonth,
}: LiuyuePanelProps) {
  return (
    <div>
      {loading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 12 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {liuyueData.map((m) => {
            const active = selectedMonth === m.month;
            return (
              <button
                key={`${m.month}-${m.is_leap_month ? 'leap' : 'normal'}`}
                onClick={() => onSelectMonth(m.month)}
                className={`
                  flex flex-col items-center gap-1 rounded-lg px-2 py-2.5
                  transition-all duration-200 border relative
                  ${active
                    ? 'border-gold-400 bg-gold-50 shadow-md shadow-gold-400/10'
                    : 'border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50'}
                `}
              >
                {m.is_leap_month && (
                  <span className="absolute top-1 right-1 text-[9px] text-orange-500 font-medium">闰</span>
                )}
                <span className="text-xs text-ink-400">
                  {m.lunar_month}月
                </span>
                <span className="font-kai text-lg leading-none">
                  <span className={wxColor(m.gan)}>{m.gan}</span>
                  <span className={wxColor(m.zhi)}>{m.zhi}</span>
                </span>
                {m.nayin && <span className="text-[11px] text-ink-500">{m.nayin}</span>}
                <span className="text-[10px] text-ink-400">{m.jieqi_name}</span>
                <span className="text-[10px] text-ink-400">
                  {m.solar_month_start?.slice(5) || '--'}~{m.solar_month_end?.slice(5) || '--'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
