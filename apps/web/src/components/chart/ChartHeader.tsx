'use client';

import { type ChartResponse } from '@/lib/api';

interface ChartHeaderProps {
  chart: ChartResponse;
}

export default function ChartHeader({ chart }: ChartHeaderProps) {
  const genderLabel = chart.gender === 2 ? '坤造' : '乾造';
  const correctionSign = chart.time_correction_min >= 0 ? '+' : '';

  const formatSolarDatetime = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const day = d.getDate();
      const h = d.getHours().toString().padStart(2, '0');
      const min = d.getMinutes().toString().padStart(2, '0');
      return `${y}年${m}月${day}日 ${h}:${min}`;
    } catch {
      return iso;
    }
  };

  const formatTrueSolarTime = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const h = d.getHours().toString().padStart(2, '0');
      const min = d.getMinutes().toString().padStart(2, '0');
      const sec = d.getSeconds().toString().padStart(2, '0');
      return `${h}:${min}:${sec}`;
    } catch {
      return iso;
    }
  };

  return (
    <header className="rounded-xl bg-chart-surface border border-chart-border px-4 py-3 md:px-6 md:py-4">
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="font-display text-xl md:text-2xl text-chart-accent tracking-wider">
          {genderLabel}
        </h2>
        {chart.day_master && (
          <span className="text-chart-text text-sm">
            日主{' '}
            <span className="font-display text-base md:text-lg">{chart.day_master}</span>
            {chart.strength_level && (
              <span className="text-chart-muted ml-1.5 text-xs">
                ({chart.strength_level})
              </span>
            )}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm leading-relaxed">
        {chart.solar_datetime && (
          <div className="flex gap-2">
            <dt className="text-chart-muted shrink-0">公历</dt>
            <dd className="text-chart-text">{formatSolarDatetime(chart.solar_datetime)}</dd>
          </div>
        )}

        {chart.lunar_date && (
          <div className="flex gap-2">
            <dt className="text-chart-muted shrink-0">农历</dt>
            <dd className="text-chart-text">{chart.lunar_date}</dd>
          </div>
        )}

        {chart.true_solar_time && (
          <div className="flex gap-2">
            <dt className="text-chart-muted shrink-0">真太阳时</dt>
            <dd className="text-chart-text">
              {formatTrueSolarTime(chart.true_solar_time)}
              <span className="text-chart-muted ml-1">
                ({correctionSign}{chart.time_correction_min.toFixed(1)}分)
              </span>
            </dd>
          </div>
        )}

        {chart.jieqi_info && (
          <div className="flex gap-2">
            <dt className="text-chart-muted shrink-0">节气</dt>
            <dd className="text-chart-text">{chart.jieqi_info}</dd>
          </div>
        )}

        {chart.lunar_input && (
          <div className="flex gap-2 sm:col-span-2">
            <dt className="text-chart-muted shrink-0">农历输入</dt>
            <dd className="text-chart-text">
              {chart.lunar_input.year}年
              {chart.lunar_input.isLeapMonth && '闰'}
              {chart.lunar_input.month}月
              {chart.lunar_input.day}日
            </dd>
          </div>
        )}
      </dl>
    </header>
  );
}
