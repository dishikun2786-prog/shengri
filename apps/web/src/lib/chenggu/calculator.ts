import type { ChengguResult } from './types';
import {
  YEAR_BONE,
  MONTH_BONE,
  DAY_BONE,
  HOUR_BONE,
  MALE_INTERPRETATION,
  FEMALE_INTERPRETATION,
} from './constants';

const LUNAR_MONTH_MAP: Record<string, number> = {
  '正': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6,
  '七': 7, '八': 8, '九': 9, '十': 10, '冬': 11, '腊': 12,
};

const LUNAR_DAY_PREFIX_MAP: Record<string, number> = {
  '初': 0, '十': 10, '廿': 20, '二十': 20,
};

const LUNAR_DAY_DIGIT: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
};

/** Month pillar earthly branch → lunar month number (1=寅…12=丑) */
const ZHI_TO_MONTH: Record<string, number> = {
  '寅': 1, '卯': 2, '辰': 3, '巳': 4, '午': 5, '未': 6,
  '申': 7, '酉': 8, '戌': 9, '亥': 10, '子': 11, '丑': 12,
};

function parseLunarMonthDay(lunarDate: string): { month: number; day: number } | null {
  const yearMatch = lunarDate.match(/年(.+)/);
  if (!yearMatch) return null;

  const rest = yearMatch[1];

  let afterLeap = rest;
  if (rest.startsWith('闰')) {
    afterLeap = rest.slice(1);
  }

  const monthEndIdx = afterLeap.indexOf('月');
  if (monthEndIdx === -1) return null;

  const monthStr = afterLeap.slice(0, monthEndIdx);
  const dayStr = afterLeap.slice(monthEndIdx + 1);

  const month = LUNAR_MONTH_MAP[monthStr];
  if (month == null) return null;

  const day = parseLunarDay(dayStr);
  if (day == null) return null;

  return { month, day };
}

function parseLunarDay(dayStr: string): number | null {
  if (!dayStr) return null;

  if (dayStr === '二十') return 20;
  if (dayStr === '三十') return 30;

  for (const [prefix, base] of Object.entries(LUNAR_DAY_PREFIX_MAP)) {
    if (dayStr.startsWith(prefix)) {
      const suffix = dayStr.slice(prefix.length);
      if (suffix === '') {
        if (prefix === '初') return 10;
        return null;
      }
      const digit = LUNAR_DAY_DIGIT[suffix];
      if (digit != null) {
        return base + digit;
      }
    }
  }

  return null;
}

function findInterpretation(totalScore: number, gender: number): string {
  const map = gender === 2 ? FEMALE_INTERPRETATION : MALE_INTERPRETATION;
  const rounded = Math.round(totalScore * 10) / 10;
  const entry = map[rounded];
  if (entry) return entry;

  const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
  let closest = keys[0];
  let minDiff = Math.abs(rounded - closest);
  for (const k of keys) {
    const diff = Math.abs(rounded - k);
    if (diff < minDiff) {
      minDiff = diff;
      closest = k;
    }
  }
  if (minDiff <= 0.1) return map[closest];

  return '暂无对应批注';
}

interface ChartLike {
  year_pillar?: { gan?: string; zhi?: string } | null;
  month_pillar?: { gan?: string; zhi?: string } | null;
  hour_pillar?: { gan?: string; zhi?: string } | null;
  lunar_date?: string | null;
  lunar_input?: { year: number; month: number; day: number; isLeapMonth: boolean } | null;
  gender?: number | null;
  // Flat API fields (fallback when pillar objects are missing)
  yearGan?: string;
  yearZhi?: string;
  monthGan?: string;
  monthZhi?: string;
  hourGan?: string;
  hourZhi?: string;
}

export function calcChenggu(chart: ChartLike): ChengguResult | null {
  const yearGan = chart.year_pillar?.gan ?? (chart as any).yearGan ?? '';
  const yearZhi = chart.year_pillar?.zhi ?? (chart as any).yearZhi ?? '';
  const yearGanZhi = yearGan + yearZhi;

  const hourZhi = chart.hour_pillar?.zhi ?? (chart as any).hourZhi ?? '';

  // 1) Parse lunar month/day from lunar_date string (primary source)
  let monthLunar = 0;
  let dayLunar = 0;

  if (chart.lunar_date) {
    const parsed = parseLunarMonthDay(chart.lunar_date);
    if (parsed) {
      monthLunar = parsed.month;
      dayLunar = parsed.day;
    }
  }

  // 2) Fallback to lunar_input (user entered lunar date)
  if ((monthLunar === 0 || dayLunar === 0) && chart.lunar_input) {
    if (monthLunar === 0) monthLunar = chart.lunar_input.month;
    if (dayLunar === 0) dayLunar = chart.lunar_input.day;
  }

  // 3) Derive lunar month from month pillar's earthly branch
  if (monthLunar === 0) {
    const mz = chart.month_pillar?.zhi ?? (chart as any).monthZhi ?? '';
    const m = ZHI_TO_MONTH[mz];
    if (m) monthLunar = m;
  }

  if (!yearGanZhi || monthLunar === 0 || dayLunar === 0 || !hourZhi) {
    return null;
  }

  const yearScore = YEAR_BONE[yearGanZhi];
  const monthScore = MONTH_BONE[monthLunar];
  const dayScore = DAY_BONE[dayLunar];
  const hourScore = HOUR_BONE[hourZhi];

  if (yearScore == null || monthScore == null || dayScore == null || hourScore == null) {
    return null;
  }

  const totalScore = Math.round((yearScore + monthScore + dayScore + hourScore) * 10) / 10;
  const totalLiang = Math.floor(totalScore);
  const totalQian = Math.round((totalScore - totalLiang) * 10);

  return {
    yearScore,
    monthScore,
    dayScore,
    hourScore,
    totalScore,
    totalLiang,
    totalQian,
    interpretation: findInterpretation(totalScore, chart.gender ?? 1),
    yearGanZhi,
    monthLunar,
    dayLunar,
    hourZhi,
  };
}
