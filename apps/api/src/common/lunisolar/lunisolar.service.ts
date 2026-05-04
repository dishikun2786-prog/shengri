import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as lunisolarModule from 'lunisolar';
import * as char8exModule from '@lunisolar/plugin-char8ex';
import * as takesoundModule from '@lunisolar/plugin-takesound';

const lunisolar = (lunisolarModule as any).default || lunisolarModule;
const char8ex = (char8exModule as any).default || char8exModule;
const takesound = (takesoundModule as any).default || takesoundModule;

export interface LunarToSolarResult {
  year: number;
  month: number;
  day: number;
}

export interface PillarData {
  gan: string;
  zhi: string;
}

export interface CalculatedPillars {
  year: PillarData;
  month: PillarData;
  day: PillarData;
  hour: PillarData;
  lunar: {
    year: number;
    month: number;
    day: number;
    isLeapMonth: boolean;
    yearName: string;
    monthName: string;
    dayName: string;
  };
}

export interface PillarValidation {
  match: boolean;
  pythonPillars: string;
  lunisolarPillars: string;
  details?: string;
}

export interface LunarDateInfo {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
  monthName: string;
  dayName: string;
  yearName: string;
}

@Injectable()
export class LuniSolarService implements OnModuleInit {
  private readonly logger = new Logger(LuniSolarService.name);

  onModuleInit() {
    try {
      const c8fn = typeof char8ex === 'function' ? char8ex : char8ex?.default;
      const tsfn = typeof takesound === 'function' ? takesound : takesound?.default;
      if (typeof c8fn === 'function') lunisolar.extend(c8fn);
      if (typeof tsfn === 'function') lunisolar.extend(tsfn);
      this.logger.log('lunisolar plugins loaded (char8ex, takesound)');
    } catch (e) {
      this.logger.warn(`lunisolar plugin loading failed (non-critical): ${e.message}`);
    }
  }

  lunarToSolar(
    year: number,
    month: number,
    day: number,
    isLeapMonth = false,
  ): LunarToSolarResult {
    const lunar = lunisolar.fromLunar({
      year,
      month,
      day,
      isLeapMonth,
    });

    const solarDate = lunar.toDate();

    // Normalize to China timezone to avoid host timezone drift.
    const chinaDate = new Date(solarDate.getTime() + 8 * 60 * 60 * 1000);
    return {
      year: chinaDate.getUTCFullYear(),
      month: chinaDate.getUTCMonth() + 1,
      day: chinaDate.getUTCDate(),
    };
  }

  getLunarDate(
    year: number,
    month: number,
    day: number,
  ): LunarDateInfo {
    const date = new Date(year, month - 1, day);
    const lsr = lunisolar(date);
    const lunar = lsr.lunar;

    return {
      year: lunar.year,
      month: lunar.month > 100 ? lunar.month - 100 : lunar.month,
      day: lunar.day,
      isLeapMonth: lunar.isLeapMonth,
      monthName: lunar.getMonthName(),
      dayName: lunar.getDayName(),
      yearName: lunar.getYearName(),
    };
  }

  /**
   * 使用 lunisolar.js 计算四柱（年柱、月柱、日柱、时柱）。
   * 这是四柱计算的唯一权威来源。
   */
  calculatePillars(
    solarYear: number,
    solarMonth: number,
    solarDay: number,
    hour: number,
  ): CalculatedPillars {
    const date = new Date(solarYear, solarMonth - 1, solarDay, hour);
    const lsr = lunisolar(date);
    const char8 = lsr.char8;
    const lunar = lsr.lunar;

    const yearSB = char8.year;
    const monthSB = char8.month;
    const daySB = char8.day;
    const hourSB = char8.hour;

    return {
      year: { gan: yearSB.stem.toString(), zhi: yearSB.branch.toString() },
      month: { gan: monthSB.stem.toString(), zhi: monthSB.branch.toString() },
      day: { gan: daySB.stem.toString(), zhi: daySB.branch.toString() },
      hour: { gan: hourSB.stem.toString(), zhi: hourSB.branch.toString() },
      lunar: {
        year: lunar.year,
        month: lunar.month,
        day: lunar.day,
        isLeapMonth: lunar.isLeapMonth,
        yearName: lunar.getYearName(),
        monthName: lunar.getMonthName(),
        dayName: lunar.getDayName(),
      },
    };
  }

  /**
   * 校验 Python 引擎的四柱结果与 lunisolar.js 的计算是否一致。
   *
   * 局限性说明：
   * - lunisolar.js 使用原始钟表时间计算，不做真太阳时(TST)校正
   * - Python 引擎在有明确出生城市时会做 TST 校正（经度修正 + 均时差）
   * - 因此在有城市的场景下，时柱可能因 TST 偏移而不一致，属于合理分歧
   * - 无城市时 Python 引擎不做 TST，两者结果应一致
   */
  validatePillars(
    solarYear: number,
    solarMonth: number,
    solarDay: number,
    hour: number,
    pythonResult: {
      year_pillar?: { gan?: string; zhi?: string };
      month_pillar?: { gan?: string; zhi?: string };
      day_pillar?: { gan?: string; zhi?: string };
      hour_pillar?: { gan?: string; zhi?: string };
    },
  ): PillarValidation {
    try {
      const date = new Date(solarYear, solarMonth - 1, solarDay, hour);
      const lsr = lunisolar(date);
      const char8 = lsr.char8;

      const lsYear = char8.year.toString();
      const lsMonth = char8.month.toString();
      const lsDay = char8.day.toString();
      const lsHour = char8.hour.toString();

      const pyYear = `${pythonResult.year_pillar?.gan || ''}${pythonResult.year_pillar?.zhi || ''}`;
      const pyMonth = `${pythonResult.month_pillar?.gan || ''}${pythonResult.month_pillar?.zhi || ''}`;
      const pyDay = `${pythonResult.day_pillar?.gan || ''}${pythonResult.day_pillar?.zhi || ''}`;
      const pyHour = `${pythonResult.hour_pillar?.gan || ''}${pythonResult.hour_pillar?.zhi || ''}`;

      const lunisolarPillars = `${lsYear} ${lsMonth} ${lsDay} ${lsHour}`;
      const pythonPillars = `${pyYear} ${pyMonth} ${pyDay} ${pyHour}`;

      const match = lunisolarPillars === pythonPillars;

      if (!match) {
        const diffs: string[] = [];
        if (lsYear !== pyYear) diffs.push(`年柱: lunisolar=${lsYear} python=${pyYear}`);
        if (lsMonth !== pyMonth) diffs.push(`月柱: lunisolar=${lsMonth} python=${pyMonth}`);
        if (lsDay !== pyDay) diffs.push(`日柱: lunisolar=${lsDay} python=${pyDay}`);
        if (lsHour !== pyHour) diffs.push(`时柱: lunisolar=${lsHour} python=${pyHour}`);

        this.logger.debug(
          `四柱校验差异（可能因 TST 校正）[${solarYear}-${solarMonth}-${solarDay} ${hour}时] ` +
          `python: ${pythonPillars} | lunisolar: ${lunisolarPillars} | ` +
          `差异: ${diffs.join('; ')}`,
        );

        return {
          match: false,
          pythonPillars,
          lunisolarPillars,
          details: diffs.join('; '),
        };
      }

      return { match: true, pythonPillars, lunisolarPillars };
    } catch (error) {
      this.logger.error(`四柱校验异常: ${error.message}`);
      return {
        match: false,
        pythonPillars: 'N/A',
        lunisolarPillars: 'error',
        details: error.message,
      };
    }
  }

  getLeapMonthOfYear(year: number): number {
    try {
      const date = new Date(year, 5, 15);
      const lsr = lunisolar(date);
      return lsr.lunar.leapMonth;
    } catch {
      return 0;
    }
  }
}
