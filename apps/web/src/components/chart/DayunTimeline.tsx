'use client';

import { useRef, useEffect } from 'react';
import type { ChartResponse } from '@/lib/api';
import { wxColor } from './wuxing-utils';

type DayunItem = ChartResponse['dayun_list'][number];

interface DayunTimelineProps {
  dayunList: DayunItem[];
  dayunDirection: number;
  dayunStartAge: number;
  currentYear: number;
  selectedDayun?: DayunItem | null;
  onSelectDayun: (dayun: DayunItem) => void;
}

export default function DayunTimeline({
  dayunList,
  dayunDirection,
  dayunStartAge,
  currentYear,
  selectedDayun,
  onSelectDayun,
}: DayunTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const currentDayun = dayunList.find(
    (d) => currentYear >= d.start_year && currentYear <= d.end_year,
  );

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentDayun?.index]);

  const isSelected = (d: DayunItem) =>
    selectedDayun ? selectedDayun.index === d.index : currentDayun?.index === d.index;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-ink-400">
        <span className="text-xs">
          {dayunDirection === 1 ? '顺行' : '逆行'}，起运 {dayunStartAge} 岁
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
      >
        {dayunList.map((d) => {
          const active = isSelected(d);
          const isCurrent = currentDayun?.index === d.index;
          return (
            <button
              key={d.index}
              ref={isCurrent ? activeRef : undefined}
              onClick={() => onSelectDayun(d)}
              className={`
                flex-shrink-0 flex flex-col items-center gap-1 rounded-lg px-3 py-2
                transition-all duration-200 border
                ${active
                  ? 'border-gold-400 bg-gold-50 shadow-md shadow-gold-400/10'
                  : 'border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50'}
                ${isCurrent && !active ? 'ring-1 ring-gold-400/30' : ''}
              `}
            >
              <span className="text-[10px] text-ink-400">
                {d.start_age}–{d.end_age}岁
              </span>
              <span className="font-kai text-xl leading-none tracking-wide">
                <span className={wxColor(d.gan)}>{d.gan}</span>
                <span className={wxColor(d.zhi)}>{d.zhi}</span>
              </span>
              <span className="text-xs text-ink-500">{d.ten_god_gan}</span>
              <span className="text-[10px] text-ink-400">{d.nayin}</span>
              <span className="text-[10px] text-ink-300">
                {d.start_year}–{d.end_year}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
