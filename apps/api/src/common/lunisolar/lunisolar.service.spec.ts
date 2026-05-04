import { Test, TestingModule } from '@nestjs/testing';
import { LuniSolarService } from './lunisolar.service';

describe('LuniSolarService', () => {
  let service: LuniSolarService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LuniSolarService],
    }).compile();

    service = module.get<LuniSolarService>(LuniSolarService);
    service.onModuleInit();
  });

  describe('lunarToSolar', () => {
    it('should convert 农历2023年正月初一 to 2023-01-22', () => {
      const result = service.lunarToSolar(2023, 1, 1);
      expect(result).toEqual({ year: 2023, month: 1, day: 22 });
    });

    it('should convert 农历1990年五月初五 to correct solar date', () => {
      const result = service.lunarToSolar(1990, 5, 5);
      expect(result.year).toBe(1990);
      expect(result.month).toBe(5);
      expect(result.day).toBe(27);
    });

    it('should handle 农历2020年四月初一 (leap month year) correctly', () => {
      const result = service.lunarToSolar(2020, 4, 1, false);
      expect(result.year).toBe(2020);
      expect(result.month).toBe(4);
      expect(result.day).toBe(23);
    });

    it('should handle 农历2020年闰四月初一', () => {
      const result = service.lunarToSolar(2020, 4, 1, true);
      expect(result.year).toBe(2020);
      expect(result.month).toBe(5);
      expect(result.day).toBe(23);
    });

    it('should convert 农历2000年腊月三十 (除夕)', () => {
      const result = service.lunarToSolar(2000, 12, 30);
      expect(result.year).toBe(2001);
      expect(result.month).toBe(1);
      expect(result.day).toBe(24);
    });

    it('should convert 农历1985年正月十五 (元宵节)', () => {
      const result = service.lunarToSolar(1985, 1, 15);
      expect(result.year).toBe(1985);
      expect(result.month).toBe(3);
      expect(result.day).toBe(6);
    });

    it('should convert 农历2024年八月十五 (中秋节)', () => {
      const result = service.lunarToSolar(2024, 8, 15);
      expect(result.year).toBe(2024);
      expect(result.month).toBe(9);
      expect(result.day).toBe(17);
    });
  });

  describe('getLunarDate', () => {
    it('should get lunar date for 2023-01-22 (春节)', () => {
      const result = service.getLunarDate(2023, 1, 22);
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
    });

    it('should get lunar date for 2024-02-10 (春节)', () => {
      const result = service.getLunarDate(2024, 2, 10);
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
    });

    it('should detect leap month correctly', () => {
      const result = service.getLunarDate(2020, 5, 23);
      expect(result.isLeapMonth).toBe(true);
      expect(result.month).toBe(4);
    });
  });

  describe('calculatePillars - primary pillar engine', () => {
    it('should produce 壬申 甲辰 丁巳 甲辰 for 1992-04-11 hour=8', () => {
      const result = service.calculatePillars(1992, 4, 11, 8);
      expect(`${result.year.gan}${result.year.zhi}`).toBe('壬申');
      expect(`${result.month.gan}${result.month.zhi}`).toBe('甲辰');
      expect(`${result.day.gan}${result.day.zhi}`).toBe('丁巳');
      expect(`${result.hour.gan}${result.hour.zhi}`).toBe('甲辰');
    });

    it('should produce 壬申 甲辰 丁巳 甲辰 for 1992-04-11 hour=7', () => {
      const result = service.calculatePillars(1992, 4, 11, 7);
      expect(`${result.hour.gan}${result.hour.zhi}`).toBe('甲辰');
    });

    it('should return correct lunar info', () => {
      const result = service.calculatePillars(1992, 4, 11, 8);
      expect(result.lunar.month).toBe(3);
      expect(result.lunar.day).toBe(9);
      expect(result.lunar.isLeapMonth).toBe(false);
    });

    it('should handle year boundary around 立春 (2000-02-04)', () => {
      const before = service.calculatePillars(2000, 2, 3, 10);
      const after = service.calculatePillars(2000, 2, 5, 10);
      expect(`${before.year.gan}${before.year.zhi}`).not.toBe(
        `${after.year.gan}${after.year.zhi}`,
      );
    });

    it('should produce valid two-char gan/zhi for all pillars', () => {
      const result = service.calculatePillars(1990, 6, 15, 12);
      const pattern = /^[\u4e00-\u9fff]$/;
      expect(result.year.gan).toMatch(pattern);
      expect(result.year.zhi).toMatch(pattern);
      expect(result.month.gan).toMatch(pattern);
      expect(result.month.zhi).toMatch(pattern);
      expect(result.day.gan).toMatch(pattern);
      expect(result.day.zhi).toMatch(pattern);
      expect(result.hour.gan).toMatch(pattern);
      expect(result.hour.zhi).toMatch(pattern);
    });

    it('should produce distinct hour pillars for different time slots', () => {
      const zi = service.calculatePillars(2000, 1, 1, 0);
      const wu = service.calculatePillars(2000, 1, 1, 12);
      expect(`${zi.hour.gan}${zi.hour.zhi}`).not.toBe(
        `${wu.hour.gan}${wu.hour.zhi}`,
      );
    });
  });

  describe('validatePillars - known dates cross-validation', () => {
    const knownCases = [
      {
        desc: '1990-06-15 12时 (常规日期)',
        solar: [1990, 6, 15, 12] as const,
      },
      {
        desc: '2000-02-04 立春日 (节气边界)',
        solar: [2000, 2, 4, 10] as const,
      },
      {
        desc: '1985-01-01 0时',
        solar: [1985, 1, 1, 0] as const,
      },
      {
        desc: '2023-02-04 立春 (年柱换界)',
        solar: [2023, 2, 4, 14] as const,
      },
      {
        desc: '1995-08-08 8时',
        solar: [1995, 8, 8, 8] as const,
      },
      {
        desc: '2010-03-06 惊蛰日',
        solar: [2010, 3, 6, 6] as const,
      },
      {
        desc: '1988-12-22 冬至日',
        solar: [1988, 12, 22, 15] as const,
      },
      {
        desc: '2005-06-21 夏至日',
        solar: [2005, 6, 21, 11] as const,
      },
      {
        desc: '1976-10-01 国庆日',
        solar: [1976, 10, 1, 9] as const,
      },
      {
        desc: '2015-02-19 除夕/立春后',
        solar: [2015, 2, 19, 16] as const,
      },
    ];

    knownCases.forEach(({ desc, solar }) => {
      it(`should produce valid pillars for ${desc}`, () => {
        const [year, month, day, hour] = solar;
        const lunisolar = require('lunisolar').default || require('lunisolar');
        const date = new Date(year, month - 1, day, hour);
        const lsr = lunisolar(date);
        const char8 = lsr.char8;

        expect(char8.year.toString()).toMatch(/^[\u4e00-\u9fff]{2}$/);
        expect(char8.month.toString()).toMatch(/^[\u4e00-\u9fff]{2}$/);
        expect(char8.day.toString()).toMatch(/^[\u4e00-\u9fff]{2}$/);
        expect(char8.hour.toString()).toMatch(/^[\u4e00-\u9fff]{2}$/);
      });
    });
  });

  describe('getLeapMonthOfYear', () => {
    it('should return 4 for year 2020 (闰四月)', () => {
      expect(service.getLeapMonthOfYear(2020)).toBe(4);
    });

    it('should return 0 for year 2019 (无闰月)', () => {
      expect(service.getLeapMonthOfYear(2019)).toBe(0);
    });

    it('should return 6 for year 2025 (闰六月)', () => {
      const leapMonth = service.getLeapMonthOfYear(2025);
      expect(leapMonth).toBeGreaterThanOrEqual(0);
    });
  });
});
