import { Injectable, HttpException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { LuniSolarService } from '../../common/lunisolar/lunisolar.service';
import { CreateChartDto } from './bazi.dto';

@Injectable()
export class BaziService {
  private calendarUrl: string;
  private readonly logger = new Logger(BaziService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private config: ConfigService,
    private luniSolar: LuniSolarService,
  ) {
    this.calendarUrl = this.config.get('CALENDAR_ENGINE_URL', 'http://localhost:8100');
  }

  /** 命盘排盘结果中的公历日期（@db.Date），与排盘结果一致；农历输入时不能再用 dto 的年月日。 */
  private static solarDateForDb(chartData: { solar_datetime?: string }, dto: CreateChartDto): Date {
    const iso = chartData?.solar_datetime;
    if (iso && typeof iso === 'string') {
      const t = new Date(iso);
      if (!Number.isNaN(t.getTime())) {
        return new Date(t.getFullYear(), t.getMonth(), t.getDate());
      }
    }
    return new Date(dto.year, dto.month - 1, dto.day);
  }

  async createChart(dto: CreateChartDto, userId?: number) {
    let solarYear = dto.year;
    let solarMonth = dto.month;
    let solarDay = dto.day;
    let lunarInput: { year: number; month: number; day: number; isLeapMonth: boolean } | undefined;

    if (dto.calendar_type === 'lunar') {
      const converted = this.luniSolar.lunarToSolar(
        dto.year, dto.month, dto.day, dto.is_leap_month || false,
      );
      lunarInput = {
        year: dto.year, month: dto.month, day: dto.day,
        isLeapMonth: dto.is_leap_month || false,
      };
      solarYear = converted.year;
      solarMonth = converted.month;
      solarDay = converted.day;
      this.logger.log(
        `农历转换: 农历${dto.year}-${dto.month}-${dto.day}${dto.is_leap_month ? '(闰)' : ''} → 公历${solarYear}-${solarMonth}-${solarDay}`,
      );
    }

    const cacheKey = `chart:${solarYear}:${solarMonth}:${solarDay}:${dto.hour}:${dto.minute}:${dto.gender}:${dto.city || ''}:${dto.midnight_rule || 'early'}`;
    let cached: any = null;
    try {
      cached = await this.redis.getJson<any>(cacheKey);
    } catch (e) {
      this.logger.warn(
        `Redis 不可用，跳过命盘缓存读取: ${e instanceof Error ? e.message : e}`,
      );
    }
    if (cached) {
      const result = lunarInput ? { ...cached, lunar_input: lunarInput } : cached;
      if (userId) {
        return this.saveChart(result, dto, userId);
      }
      return result;
    }

    try {
      const pillars = this.luniSolar.calculatePillars(
        solarYear, solarMonth, solarDay, dto.hour,
      );

      const response = await axios.post(`${this.calendarUrl}/api/v1/bazi/chart`, {
        year: solarYear,
        month: solarMonth,
        day: solarDay,
        hour: dto.hour,
        minute: dto.minute,
        gender: dto.gender,
        city: dto.city,
        longitude: dto.longitude,
        latitude: dto.latitude,
        midnight_rule: dto.midnight_rule || 'early',
        timezone: dto.timezone,
        pillars: {
          year_gan: pillars.year.gan,
          year_zhi: pillars.year.zhi,
          month_gan: pillars.month.gan,
          month_zhi: pillars.month.zhi,
          day_gan: pillars.day.gan,
          day_zhi: pillars.day.zhi,
          hour_gan: pillars.hour.gan,
          hour_zhi: pillars.hour.zhi,
        },
        lunar_info: {
          lunar_month: pillars.lunar.month,
          lunar_day: pillars.lunar.day,
          is_leap: pillars.lunar.isLeapMonth,
        },
      });

      const chartData = response.data;

      if (lunarInput) {
        chartData.lunar_input = lunarInput;
      }

      try {
        await this.redis.setJson(cacheKey, chartData, 3600);
      } catch (e) {
        this.logger.warn(
          `Redis 不可用，跳过命盘缓存写入: ${e instanceof Error ? e.message : e}`,
        );
      }

      if (userId) {
        return this.saveChart(chartData, dto, userId);
      }
      return chartData;
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { status?: number; data?: { detail?: unknown } } };
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.join(', ') : detail ?? err.message;
      throw new HttpException(
        `排盘服务异常: ${msg || String(error)}`,
        err.response?.status || 500,
      );
    }
  }

  private async saveChart(chartData: any, dto: CreateChartDto, userId: number) {
    try {
      const saved = await this.prisma.baziChart.create({
        data: {
        userId,
        name: dto.name,
        relation: dto.relation || 'self',
        gender: dto.gender,
        solarDate: BaziService.solarDateForDb(chartData, dto),
        solarTime: `${dto.hour}:${dto.minute}`,
        birthCity: dto.city,
        longitude: chartData.longitude,
        latitude: chartData.latitude,
        trueSolarTime: chartData.true_solar_time ? new Date(chartData.true_solar_time) : null,
        timeCorrectionMin: chartData.time_correction_min,
        yearGan: chartData.year_pillar.gan,
        yearZhi: chartData.year_pillar.zhi,
        monthGan: chartData.month_pillar.gan,
        monthZhi: chartData.month_pillar.zhi,
        dayGan: chartData.day_pillar.gan,
        dayZhi: chartData.day_pillar.zhi,
        hourGan: chartData.hour_pillar?.gan,
        hourZhi: chartData.hour_pillar?.zhi,
        yearHidden: chartData.year_pillar.hidden_gan,
        monthHidden: chartData.month_pillar.hidden_gan,
        dayHidden: chartData.day_pillar.hidden_gan,
        hourHidden: chartData.hour_pillar?.hidden_gan,
        tenGodsMap: chartData.ten_gods,
        yearNayin: chartData.year_pillar.nayin,
        monthNayin: chartData.month_pillar.nayin,
        dayNayin: chartData.day_pillar.nayin,
        hourNayin: chartData.hour_pillar?.nayin,
        wuxingCounts: chartData.wuxing_counts,
        wuxingScore: chartData.wuxing_score,
        dayMasterStrength: chartData.day_master_strength,
        strengthLevel: chartData.strength_level,
        shenshaList: chartData.shensha_list,
        patternType: chartData.pattern_type || null,
        patternName: chartData.pattern_name || null,
        patternScore: chartData.pattern_score || null,
        yongShen: chartData.yong_shen || null,
        xiShen: chartData.xi_shen || null,
        jiShen: chartData.ji_shen || null,
        tiaohuoNeed: chartData.tiaohuo_need || null,
        dayunDirection: chartData.dayun_direction,
        dayunStartAge: chartData.dayun_start_age,
        dayunList: chartData.dayun_list,
        liunianList: chartData.liunian_list,
        kongWang: chartData.kong_wang,
        changSheng: chartData.chang_sheng,
        taiYuan: chartData.tai_yuan || null,
        mingGong: chartData.ming_gong || null,
        shenGong: chartData.shen_gong || null,
        relations: chartData.relations,
        jieqiInfo: chartData.jieqi_info || null,
        lunarDate: chartData.lunar_date || null,
        algorithmVersion: chartData.algorithm_version,
        engineVersion: chartData.engine_version,
        midnightRule: dto.midnight_rule || chartData.midnight_rule || null,
        isPrimary: dto.relation === 'self',
        },
      });
      return { ...chartData, id: saved.id, uuid: saved.uuid };
    } catch (e) {
      this.logger.error(
        `BaziChart 落库失败: ${e instanceof Error ? e.message : e}`,
        e instanceof Error ? e.stack : undefined,
      );
      const prismaMsg = e instanceof Error ? e.message : String(e);
      throw new HttpException(
        `命盘保存失败: ${prismaMsg}`,
        500,
      );
    }
  }

  async getChart(id: number, userId?: number) {
    const chart = userId
      ? await this.prisma.baziChart.findFirst({
          where: { id, userId },
          include: {
            reports: {
              select: { id: true, uuid: true, reportType: true, isPaid: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        })
      : await this.prisma.baziChart.findUnique({
          where: { id },
          include: {
            reports: {
              select: { id: true, uuid: true, reportType: true, isPaid: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        });

    if (!chart) {
      throw new NotFoundException('命盘不存在');
    }

    // Backfill lunar_date for existing charts that don't have it stored
    if (!chart.lunarDate && chart.solarDate && chart.hourZhi) {
      try {
        const solarDate = new Date(chart.solarDate);
        const hour = parseInt(chart.solarTime?.split(':')[0] ?? '0', 10);
        const lunar = this.luniSolar.getLunarDate(
          solarDate.getFullYear(),
          solarDate.getMonth() + 1,
          solarDate.getDate(),
        );
        const prefix = lunar.isLeapMonth ? '闰' : '';
        const lunarDate = `${lunar.yearName}年${prefix}${lunar.monthName}月${lunar.dayName}`;

        // Persist the backfilled value
        await this.prisma.baziChart.update({
          where: { id: chart.id },
          data: { lunarDate },
        });

        return { ...chart, lunarDate };
      } catch (e) {
        this.logger.warn(
          `Failed to backfill lunarDate for chart ${chart.id}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }

    return chart;
  }

  async getChartByUuid(uuid: string) {
    return this.prisma.baziChart.findUnique({ where: { uuid } });
  }

  async getCities() {
    try {
      const response = await axios.get(`${this.calendarUrl}/api/v1/bazi/cities`);
      return response.data;
    } catch {
      return { cities: [], total: 0, tree: [] };
    }
  }

  async searchCities(q: string, limit = 10) {
    try {
      const response = await axios.get(`${this.calendarUrl}/api/v1/bazi/cities/search`, {
        params: { q, limit },
      });
      return response.data;
    } catch {
      return { results: [], total: 0 };
    }
  }

  async getLiuyue(year: number, dayMaster?: string) {
    try {
      const response = await axios.get(`${this.calendarUrl}/api/v1/bazi/liuyue`, {
        params: { year, ...(dayMaster ? { day_master: dayMaster } : {}) },
      });
      return response.data;
    } catch (error) {
      return [];
    }
  }

  async getLiuri(
    year: number,
    month: number,
    dayMaster?: string,
    options?: {
      day_boundary_mode?: 'gregorian_midnight' | 'zi_hour';
      use_true_solar_time?: boolean;
      reference_hour?: number;
      reference_minute?: number;
      longitude?: number;
      timezone_offset?: number;
    },
  ) {
    const params = { year, month, ...(dayMaster ? { day_master: dayMaster } : {}), ...options };
    try {
      const response = await axios.get(`${this.calendarUrl}/api/v1/bazi/liuri`, {
        params,
      });
      return response.data;
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { status?: number; data?: unknown } };
      this.logger.warn(
        `getLiuri upstream failed params=${JSON.stringify(params)} status=${err.response?.status ?? 'NA'} detail=${JSON.stringify(err.response?.data ?? err.message ?? error)}`,
      );
      return [];
    }
  }

  async getLiunian(
    dayMaster: string,
    yearZhi: string,
    startYear: number,
    count: number = 10,
  ) {
    try {
      const response = await axios.get(`${this.calendarUrl}/api/v1/bazi/liunian`, {
        params: { day_master: dayMaster, year_zhi: yearZhi, start_year: startYear, count },
      });
      return response.data;
    } catch (error) {
      return [];
    }
  }
}
