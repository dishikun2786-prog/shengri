'use client';

import type { ChartResponse } from '@/lib/api';
import { wxColor } from './wuxing-utils';

type LiunianItem = ChartResponse['liunian_list'][number];

const TAI_SUI_STYLES: Record<string, string> = {
  '值太岁': 'bg-red-500/20 text-red-400 ring-red-500/30',
  '冲太岁': 'bg-orange-500/20 text-orange-400 ring-orange-500/30',
  '刑太岁': 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/30',
  '合太岁': 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30',
  '害太岁': 'bg-amber-500/20 text-amber-400 ring-amber-500/30',
  '破太岁': 'bg-rose-500/20 text-rose-400 ring-rose-500/30',
};

interface LiunianGridProps {
  liunianList: LiunianItem[];
  selectedYear: number | null;
  onSelectYear: (year: number) => void;
  loading?: boolean;
  alert?: string | null;
}

export default function LiunianGrid({
  liunianList,
  selectedYear,
  onSelectYear,
  loading = false,
  alert = null,
}: LiunianGridProps) {
  return (
    <div>
      {alert && (
        <p
          className="mb-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
          role="alert"
        >
          {alert}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {loading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 border border-ink-100 bg-ink-50 animate-pulse"
              >
                <div className="h-3 w-8 bg-ink-200 rounded" />
                <div className="h-5 w-10 bg-ink-200 rounded" />
                <div className="h-3 w-6 bg-ink-200 rounded" />
                <div className="h-2 w-8 bg-ink-200 rounded" />
              </div>
            ))
          : liunianList.length === 0
            ? (
              <div className="col-span-full text-center py-4 text-sm text-ink-400">
                该大运暂无流年数据
              </div>
            )
            : liunianList.map((item) => {
          const active = selectedYear === item.year;
          const taiSuiStyle = item.tai_sui ? TAI_SUI_STYLES[item.tai_sui] : null;

          return (
            <button
              key={item.year}
              onClick={() => onSelectYear(item.year)}
              className={`
                flex flex-col items-center gap-1 rounded-lg px-2 py-2.5
                transition-all duration-200 border
                ${active
                  ? 'border-gold-400 bg-gold-50 shadow-md shadow-gold-400/10'
                  : 'border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50'}
              `}
            >
              <span className="text-xs text-ink-400">{item.year}</span>
              <span className="font-kai text-lg leading-none">
                <span className={wxColor(item.gan)}>{item.gan}</span>
                <span className={wxColor(item.zhi)}>{item.zhi}</span>
              </span>
              <span className="text-[11px] text-ink-500">{item.ten_god_gan}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-ink-400">{item.chang_sheng}</span>
                {item.tai_sui && taiSuiStyle && (
                  <span
                    className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium ring-1 ${taiSuiStyle}`}
                  >
                    {item.tai_sui}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
