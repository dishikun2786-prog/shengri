'use client';

import { useMemo } from 'react';
import type { LiuRiData } from '@/lib/api';
import { wxColor } from './wuxing-utils';

interface LiuriCalendarProps {
  liuriData: LiuRiData[];
  loading: boolean;
  selectedDay?: number | null;
  onSelectDay?: (day: number) => void;
}

function SkeletonCell() {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded border border-ink-200 p-1.5 animate-pulse">
      <div className="h-3 w-4 rounded bg-ink-200" />
      <div className="h-3 w-6 rounded bg-ink-100" />
      <div className="h-2.5 w-8 rounded bg-ink-100" />
    </div>
  );
}

export default function LiuriCalendar({ liuriData, loading, selectedDay, onSelectDay }: LiuriCalendarProps) {
  const liuriStats = useMemo(() => {
    let emptyCells = 0;
    for (const d of liuriData) {
      if (!(d.lunar_date || d.lunar_day)) {
        emptyCells += 1;
      }
    }
    return { emptyCells, renderedCells: liuriData.length - emptyCells, total: liuriData.length };
  }, [liuriData]);

  const filledCells = liuriData.map((d) => {
    const displayLunar = d.lunar_date || d.lunar_day;
    const stableKey = d.basis_date || d.solar_date || `${d.day}-${d.gan}${d.zhi}`;
    const lunarDayNumber = d.lunar_day_number ?? d.day;
    return { displayLunar, stableKey, lunarDayNumber, d };
  });
  const paddedCells = [...filledCells];
  while (paddedCells.length < 36) {
    paddedCells.push({
      displayLunar: '',
      stableKey: `empty-${paddedCells.length}`,
      lunarDayNumber: 0,
      d: null as unknown as LiuRiData,
    });
  }

  return (
    <div>
      {!loading && process.env.NODE_ENV !== 'production' && (
        <div className="mb-2 text-[10px] text-ink-400">
          render: {liuriStats.renderedCells}/{liuriStats.total}, empty: {liuriStats.emptyCells}
        </div>
      )}
      <div className="grid grid-cols-6 gap-1">
        {loading ? (
          Array.from({ length: 36 }, (_, i) => <SkeletonCell key={i} />)
        ) : paddedCells.map(({ displayLunar, stableKey, lunarDayNumber, d }) => {
          if (!displayLunar || !d) {
            return (
              <div
                key={stableKey}
                className="rounded border border-ink-100 bg-ink-50/30 p-1 min-h-[62px]"
              />
            );
          }
          const isChuYi = lunarDayNumber === 1;
          const isChuBa = lunarDayNumber === 8;
          const isShiWu = lunarDayNumber === 15;
          const isNianSan = lunarDayNumber === 23;
          const isFestivalDay = isChuYi || isShiWu || isChuBa || isNianSan;
          return (
            <div
              key={stableKey}
              className={`
                flex flex-col items-center gap-0.5 rounded border p-1 transition-colors cursor-pointer
                ${isFestivalDay ? 'bg-gold-50 border-gold-200' : 'bg-white border-ink-200'}
                ${selectedDay === d.day ? 'ring-2 ring-amber-400 ring-offset-1' : ''}
                hover:border-amber-300 hover:bg-amber-50
              `}
              onClick={() => onSelectDay?.(d.day)}
            >
              <span className="text-[10px] text-ink-300">{d.day}</span>
              <span className={`text-[11px] ${isFestivalDay ? 'text-gold-700 font-semibold' : 'text-ink-700'}`}>
                {lunarDayNumber}
              </span>
              <span className={`text-[10px] ${isFestivalDay ? 'text-gold-700' : 'text-ink-700'}`}>
                {displayLunar}
              </span>
              <span className="font-kai text-xs leading-none">
                <span className={wxColor(d.gan)}>{d.gan}</span>
                <span className={wxColor(d.zhi)}>{d.zhi}</span>
              </span>
              <span className="text-[9px] text-ink-400">
                {isChuYi
                  ? '朔日'
                  : isShiWu
                    ? '望日'
                    : isChuBa
                      ? '上弦'
                      : isNianSan
                        ? '下弦'
                        : '阴历流日'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
