'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ChartResponse, LiuYueData, LiuRiData } from '@/lib/api';
import { baziApi } from '@/lib/api';
import { calcChenggu } from '@/lib/chenggu';
import ChartHeader from './ChartHeader';
import PillarGrid from './PillarGrid';
import ChengguCard from './ChengguCard';
import DayunTimeline from './DayunTimeline';
import LiunianGrid from './LiunianGrid';
import LiuyuePanel from './LiuyuePanel';
import LiuriCalendar from './LiuriCalendar';
import ShenshaPanel from './ShenshaPanel';
import WuxingChart from './WuxingChart';
import PatternCard from './PatternCard';
import RelationsDisplay from './RelationsDisplay';
import HealthPanel from './HealthPanel';
import TcmGuideCard from './TcmGuideCard';

interface ChartLayoutProps {
  chart: ChartResponse;
}

type DayunItem = ChartResponse['dayun_list'][number];

export default function ChartLayout({ chart }: ChartLayoutProps) {
  const currentYear = new Date().getFullYear();

  const [selectedDayun, setSelectedDayun] = useState<DayunItem | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [liuyueData, setLiuyueData] = useState<LiuYueData[]>([]);
  const [liuriData, setLiuriData] = useState<LiuRiData[]>([]);
  const [liuyueLoading, setLiuyueLoading] = useState(false);
  const [liuriLoading, setLiuriLoading] = useState(false);
  const [liuyueAlert, setLiuyueAlert] = useState<string | null>(null);
  const [liuriAlert, setLiuriAlert] = useState<string | null>(null);
  const [filteredLiunian, setFilteredLiunian] = useState(chart.liunian_list);
  const [liunianCache, setLiunianCache] = useState<Map<number, ChartResponse['liunian_list']>>(new Map());
  const [liunianLoading, setLiunianLoading] = useState(false);
  const [liunianAlert, setLiunianAlert] = useState<string | null>(null);

  // 当前流年信息
  const chengguResult = useMemo(() => calcChenggu(chart), [chart]);

  const currentLiunian = filteredLiunian.find((ln) => ln.year === selectedYear);
  const selectedLiuyue = liuyueData.find((m) => m.month === selectedMonth) ?? null;
  const liuriFirst = liuriData[0];
  const liuriLast = liuriData[liuriData.length - 1];
  const fallbackLunarMonth = liuriFirst?.lunar_date?.split('月')[0] || '';
  const fallbackSolarStart = (liuriFirst?.basis_date || liuriFirst?.solar_date || '').slice(5);
  const fallbackSolarEnd = (liuriLast?.basis_date || liuriLast?.solar_date || '').slice(5);
  const liuriRangeText = selectedLiuyue
    ? `农历${selectedLiuyue.lunar_month || fallbackLunarMonth || '-'}月 · 公历${
        selectedLiuyue.solar_month_start
          ? selectedLiuyue.solar_month_start.slice(5)
          : (fallbackSolarStart || '--')
      }~${
        selectedLiuyue.solar_month_end
          ? selectedLiuyue.solar_month_end.slice(5)
          : (fallbackSolarEnd || '--')
      }`
    : (liuriData.length > 0
      ? `农历${fallbackLunarMonth || '-'}月 · 公历${fallbackSolarStart || '--'}~${fallbackSolarEnd || '--'}`
      : '');

  // Filter liunian by selected dayun (from cache or fallback)
  useEffect(() => {
    if (selectedDayun && liunianCache.has(selectedDayun.index)) {
      setFilteredLiunian(liunianCache.get(selectedDayun.index)!);
    } else if (selectedDayun) {
      setFilteredLiunian([]);
    } else {
      setFilteredLiunian(chart.liunian_list);
    }
  }, [selectedDayun, liunianCache, chart.liunian_list]);

  // Preload liunian for all dayun cycles on mount
  useEffect(() => {
    if (!chart.dayun_list?.length) return;
    const minYear = Math.min(...chart.dayun_list.map((d) => d.start_year));
    const maxYear = Math.max(...chart.dayun_list.map((d) => d.end_year));
    const totalYears = maxYear - minYear + 1;

    setLiunianLoading(true);
    setLiunianAlert(null);
    baziApi
      .getLiunian(chart.day_master, chart.year_pillar.zhi, minYear, totalYears)
      .then((res) => {
        const allLiunian = res.data ?? [];
        const cache = new Map<number, ChartResponse['liunian_list']>();
        chart.dayun_list.forEach((d) => {
          cache.set(
            d.index,
            allLiunian.filter((ln) => ln.year >= d.start_year && ln.year <= d.end_year),
          );
        });
        setLiunianCache(cache);
      })
      .catch(() => {
        setLiunianAlert('流年数据加载失败，使用默认数据');
      })
      .finally(() => setLiunianLoading(false));
  }, [chart.dayun_list, chart.day_master, chart.year_pillar?.zhi]);

  const loadLiuyue = useCallback(async (year: number) => {
    setLiuyueLoading(true);
    setLiuyueAlert(null);
    try {
      const res = await baziApi.getLiuyue(year, chart.day_master);
      const data = (res.data ?? []).sort((a, b) => (a.solar_month_index ?? a.month) - (b.solar_month_index ?? b.month));
      setLiuyueData(data);
      if (data.length === 0) {
        setLiuyueAlert(
          '未获取到流月数据。请确认已启动历法服务（calendar-engine :8100），且 API 的 CALENDAR_ENGINE_URL 指向正确。',
        );
      }
    } catch {
      setLiuyueData([]);
      setLiuyueAlert('流月加载失败。请检查 Nest API（:3000）已启动，且本页经 Next 将 /api 代理到 API；若已直连请核对 NEXT_PUBLIC_API_URL。');
    } finally {
      setLiuyueLoading(false);
    }
  }, [chart.day_master]);

  const loadLiuri = useCallback(async (year: number, month: number) => {
    setLiuriLoading(true);
    setLiuriAlert(null);
    try {
      const selected = liuyueData.find((m) => m.month === month);
      const start = selected?.solar_month_start;
      const end = selected?.solar_month_end;

      if (!start || !end) {
        const res = await baziApi.getLiuri(year, month, chart.day_master);
        const data = res.data ?? [];
        setLiuriData(data);
        if (data.length === 0) {
          setLiuriAlert('未获取到流日数据。请确认历法服务（:8100）与 API 可访问。');
        }
        return;
      }

      const startDate = new Date(start);
      const endDate = new Date(end);
      const monthsToQuery = new Set<string>();
      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        monthsToQuery.add(`${cursor.getFullYear()}-${cursor.getMonth() + 1}`);
        // Move to next month - use setMonth to avoid day overflow issues
        cursor.setMonth(cursor.getMonth() + 1, 1);
      }

      const responses = await Promise.all(
        Array.from(monthsToQuery).map((ym) => {
          const [y, m] = ym.split('-').map(Number);
          return baziApi.getLiuri(y, m, chart.day_master);
        }),
      );
      const merged = responses.flatMap((r) => r.data ?? []);
      let missingDate = 0;
      let invalidDate = 0;
      let outOfRange = 0;
      const filtered = merged
        .filter((d) => {
          const dateStr = d.basis_date || d.solar_date;
          if (!dateStr) {
            missingDate += 1;
            return false;
          }
          const t = new Date(dateStr);
          if (Number.isNaN(t.getTime())) {
            invalidDate += 1;
            return false;
          }
          const inRange = t >= startDate && t <= endDate;
          if (!inRange) {
            outOfRange += 1;
          }
          return inRange;
        })
        .sort((a, b) => {
          const da = new Date(a.basis_date || a.solar_date || '');
          const db = new Date(b.basis_date || b.solar_date || '');
          return da.getTime() - db.getTime();
        });

      setLiuriData(filtered);
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[liuri-debug]', {
          selectedMonth: month,
          start,
          end,
          monthsToQuery: Array.from(monthsToQuery),
          merged: merged.length,
          filtered: filtered.length,
          filteredOut: { missingDate, invalidDate, outOfRange },
        });
      }
      if (filtered.length === 0) {
        setLiuriAlert(
          '未获取到流日数据。请确认历法服务（:8100）与 API 可访问。',
        );
      }
    } catch {
      setLiuriData([]);
      setLiuriAlert('流日加载失败。请检查 API 与历法服务是否可用。');
    } finally {
      setLiuriLoading(false);
    }
  }, [chart.day_master, liuyueData]);

  useEffect(() => {
    if (selectedYear) {
      loadLiuyue(selectedYear);
      setSelectedMonth(null);
      setLiuriData([]);
    }
  }, [selectedYear, loadLiuyue]);

  useEffect(() => {
    if (selectedYear && selectedMonth) {
      loadLiuri(selectedYear, selectedMonth);
    }
  }, [selectedYear, selectedMonth, loadLiuri]);

  useEffect(() => {
    if (!selectedYear || liuyueLoading || liuyueData.length === 0) {
      return;
    }
    setSelectedMonth((m) => (m === null ? liuyueData[0].month : m));
  }, [selectedYear, liuyueLoading, liuyueData]);

  const handleSelectDayun = useCallback(async (dayun: DayunItem) => {
    setSelectedDayun(dayun);

    let liunianForDayun = liunianCache.get(dayun.index);

    if (!liunianForDayun) {
      // Cache miss — fetch on demand
      setLiunianLoading(true);
      setLiunianAlert(null);
      try {
        const res = await baziApi.getLiunian(
          chart.day_master,
          chart.year_pillar.zhi,
          dayun.start_year,
          dayun.end_year - dayun.start_year + 1,
        );
        liunianForDayun = res.data ?? [];
        setLiunianCache((prev) => new Map(prev).set(dayun.index, liunianForDayun!));
      } catch {
        setLiunianAlert('流年加载失败');
        setSelectedYear(null);
        setSelectedMonth(null);
        setLiuyueData([]);
        setLiuriData([]);
        setLiuyueAlert(null);
        setLiuriAlert(null);
        return;
      } finally {
        setLiunianLoading(false);
      }
    }

    const firstInRange = liunianForDayun[0];
    setSelectedYear(firstInRange ? firstInRange.year : null);
    setSelectedMonth(null);
    setLiuyueData([]);
    setLiuriData([]);
    setLiuyueAlert(null);
    setLiuriAlert(null);
  }, [liunianCache, chart.day_master, chart.year_pillar?.zhi]);

  return (
    <div className="space-y-6">
      <ChartHeader chart={chart} />

      <PillarGrid chart={chart} />

      <ChengguCard result={chengguResult} gender={chart.gender ?? 1} />

      <TcmGuideCard
        hasDayun={!!selectedDayun}
        hasLiunian={!!selectedYear}
        hasLiuyue={!!selectedMonth}
        hasLiuri={!!selectedDay}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <h2 className="text-lg font-bold text-ink-800 mb-3 font-kai">大运</h2>
            <DayunTimeline
              dayunList={chart.dayun_list}
              dayunDirection={chart.dayun_direction}
              dayunStartAge={chart.dayun_start_age}
              currentYear={currentYear}
              selectedDayun={selectedDayun}
              onSelectDayun={handleSelectDayun}
            />
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink-800 mb-3 font-kai">
              流年
              {selectedDayun && (
                <span className="text-sm font-normal text-ink-500 ml-2">
                  {selectedDayun.start_year}–{selectedDayun.end_year}
                </span>
              )}
            </h2>
            <LiunianGrid
              liunianList={filteredLiunian}
              selectedYear={selectedYear}
              onSelectYear={setSelectedYear}
              loading={liunianLoading}
              alert={liunianAlert}
            />
          </section>

          {selectedYear && (
            <section>
              <h2 className="text-lg font-bold text-ink-800 mb-3 font-kai">
                流月 · {selectedYear}年
              </h2>
              {liuyueAlert && (
                <p
                  className="mb-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                  role="alert"
                >
                  {liuyueAlert}
                </p>
              )}
              <LiuyuePanel
                liuyueData={liuyueData}
                loading={liuyueLoading}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
              />
            </section>
          )}

          {selectedYear && selectedMonth && (
            <section>
              <h2 className="text-lg font-bold text-ink-800 mb-3 font-kai">
                流日
                {liuriRangeText && (
                  <span className="text-sm font-normal text-ink-500 ml-2">
                    {liuriRangeText}
                    {selectedLiuyue?.is_leap_month && (
                      <span className="ml-2 inline-flex items-center rounded-full border border-gold-300 bg-gold-50 px-1.5 py-0.5 text-[10px] text-gold-700 align-middle">
                        闰月
                      </span>
                    )}
                  </span>
                )}
              </h2>
              {liuriAlert && (
                <p
                  className="mb-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                  role="alert"
                >
                  {liuriAlert}
                </p>
              )}
              <LiuriCalendar
                liuriData={liuriData}
                loading={liuriLoading}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
            </section>
          )}
        </div>

        <div className="space-y-6">
          {/* 健康养生面板 - 流年选中时显示 */}
          {selectedYear && (
            <section className="card border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <HealthPanel
                chart={chart}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                selectedDay={selectedDay}
                liunianInfo={currentLiunian ? { gan: currentLiunian.gan, zhi: currentLiunian.zhi } : null}
                liuyueInfo={selectedLiuyue ? { gan: selectedLiuyue.gan, zhi: selectedLiuyue.zhi, month: selectedLiuyue.month } : null}
                liuriInfo={selectedDay && liuriData.length > 0
                  ? (() => {
                      const selectedLiuri = liuriData.find(d => d.day === selectedDay);
                      return selectedLiuri ? { gan: selectedLiuri.gan, zhi: selectedLiuri.zhi, day: selectedLiuri.day } : null;
                    })()
                  : null}
              />
            </section>
          )}

          <section className="card">
            <h3 className="text-base font-bold text-ink-700 mb-3 font-kai">五行力量</h3>
            <WuxingChart
              wuxingScore={chart.wuxing_score}
              wuxingCounts={chart.wuxing_counts}
              dayMaster={chart.day_master}
              dayMasterWuxing={chart.day_master_wuxing}
              strength={chart.day_master_strength}
              strengthLevel={chart.strength_level}
            />
          </section>

          <section className="card">
            <h3 className="text-base font-bold text-ink-700 mb-3 font-kai">格局用神</h3>
            <PatternCard
              patternName={chart.pattern_name}
              patternType={chart.pattern_type}
              patternScore={chart.pattern_score}
              yongShen={chart.yong_shen}
              xiShen={chart.xi_shen}
              jiShen={chart.ji_shen}
              chouShen={chart.chou_shen}
              tiaohuoNeed={chart.tiaohuo_need}
            />
          </section>

          <section className="card">
            <h3 className="text-base font-bold text-ink-700 mb-3 font-kai">神煞</h3>
            <ShenshaPanel shenshaList={chart.shensha_list} />
          </section>

          {chart.relations.length > 0 && (
            <section className="card">
              <h3 className="text-base font-bold text-ink-700 mb-3 font-kai">干支关系</h3>
              <RelationsDisplay relations={chart.relations} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
