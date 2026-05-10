import { Controller, Get, Query, HttpException, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { WuyunliuqiService } from './wuyunliuqi.service';
import { RedisService } from '../../common/redis/redis.service';

@ApiTags('健康养生')
@Controller('health')
export class HealthController {
  private calendarUrl: string;
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private config: ConfigService,
    private wuyunliuqiService: WuyunliuqiService,
    private redisService: RedisService,
  ) {
    this.calendarUrl = this.config.get('CALENDAR_ENGINE_URL', 'http://localhost:8100');
  }

  /**
   * 检查五运六气缓存状态
   */
  @Get('wuyun/cache/status')
  @ApiOperation({ summary: '检查五运六气缓存状态' })
  async getCacheStatus(
    @Query('target_date') targetDate: string,
    @Query('liunian_gan') liunianGan?: string,
    @Query('liunian_zhi') liunianZhi?: string,
    @Query('liuyue_gan') liuyueGan?: string,
    @Query('liuyue_zhi') liuyueZhi?: string,
    @Query('liuri_gan') liuriGan?: string,
    @Query('liuri_zhi') liuriZhi?: string,
    @Query('birth_year_pillar') birthYearPillar?: string,
  ) {
    const liunian = liunianGan && liunianZhi ? `${liunianGan}${liunianZhi}` : '';
    const liuyue = liuyueGan && liuyueZhi ? `${liuyueGan}${liuyueZhi}` : '';
    const liuri = liuriGan && liuriZhi ? `${liuriGan}${liuriZhi}` : '';
    const cacheKey = `wuyun:cache:${targetDate}:${birthYearPillar || ''}:${liunian}:${liuyue}:${liuri}`;
    const cached = await this.redisService.getJson(cacheKey);
    return { cached: !!cached, cacheKey };
  }

  /**
   * AI 生成五运六气详解和养生建议
   */
  @Post('wuyun/ai')
  @ApiOperation({ summary: 'AI 生成五运六气详解和养生建议' })
  async generateWuyunWithAi(
    @Body() options: {
      target_date: string;
      user_id?: string;
      bazi_json?: string;
      liunian_gan?: string;
      liunian_zhi?: string;
      liuyue_gan?: string;
      liuyue_zhi?: string;
      liuri_gan?: string;
      liuri_zhi?: string;
      is_paid?: boolean;
    },
  ) {
    try {
      const baziData = options.bazi_json ? JSON.parse(options.bazi_json) : undefined;

      return await this.wuyunliuqiService.generateWuyunliuqiWithAi({
        targetDate: options.target_date,
        userId: options.user_id,
        baziData,
        liunianData: options.liunian_gan && options.liunian_zhi
          ? { gan: options.liunian_gan, zhi: options.liunian_zhi, year: new Date(options.target_date).getFullYear() }
          : undefined,
        liuyueData: options.liuyue_gan && options.liuyue_zhi
          ? { gan: options.liuyue_gan, zhi: options.liuyue_zhi, month: new Date(options.target_date).getMonth() + 1 }
          : undefined,
        liuriData: options.liuri_gan && options.liuri_zhi
          ? { gan: options.liuri_gan, zhi: options.liuri_zhi, day: new Date(options.target_date).getDate() }
          : undefined,
        isPaid: options.is_paid,
      });
    } catch (error: any) {
      const status = error.status || error.statusCode || 500;
      const message = error.message || 'AI 五运六气生成失败';
      this.logger.error(`AI五运六气生成失败: status=${status} ${message}`);
      throw new HttpException(message, status);
    }
  }

  /**
   * AI 生成流年五运六气分析（对接八字流年接口）
   */
  @Post('wuyun/ai/liunian')
  @ApiOperation({ summary: 'AI 生成流年五运六气分析' })
  async generateLiuNianWithAi(
    @Body() options: {
      target_date: string;
      liunian_gan: string;
      liunian_zhi: string;
      year: number;
      bazi_json?: string;
      is_paid?: boolean;
    },
  ) {
    try {
      const baziData = options.bazi_json ? JSON.parse(options.bazi_json) : undefined;

      return await this.wuyunliuqiService.generateLiuNianAnalysis(
        options.target_date,
        options.liunian_gan,
        options.liunian_zhi,
        options.year,
        baziData,
        options.is_paid,
      );
    } catch (error: any) {
      throw new HttpException(
        error.message || 'AI 流年五运六气生成失败',
        error.status || 500
      );
    }
  }

  /**
   * AI 生成流月五运六气分析（对接八字流月接口）
   */
  @Post('wuyun/ai/liuyue')
  @ApiOperation({ summary: 'AI 生成流月五运六气分析' })
  async generateLiuYueWithAi(
    @Body() options: {
      target_date: string;
      liuyue_gan: string;
      liuyue_zhi: string;
      month: number;
      bazi_json?: string;
      is_paid?: boolean;
    },
  ) {
    try {
      const baziData = options.bazi_json ? JSON.parse(options.bazi_json) : undefined;

      return await this.wuyunliuqiService.generateLiuYueAnalysis(
        options.target_date,
        options.liuyue_gan,
        options.liuyue_zhi,
        options.month,
        baziData,
        options.is_paid,
      );
    } catch (error: any) {
      throw new HttpException(
        error.message || 'AI 流月五运六气生成失败',
        error.status || 500
      );
    }
  }

  /**
   * AI 生成流日五运六气分析（对接八字流日接口）
   */
  @Post('wuyun/ai/liuri')
  @ApiOperation({ summary: 'AI 生成流日五运六气分析' })
  async generateLiuRiWithAi(
    @Body() options: {
      target_date: string;
      liuri_gan: string;
      liuri_zhi: string;
      day: number;
      bazi_json?: string;
      is_paid?: boolean;
    },
  ) {
    try {
      const baziData = options.bazi_json ? JSON.parse(options.bazi_json) : undefined;

      return await this.wuyunliuqiService.generateLiuRiAnalysis(
        options.target_date,
        options.liuri_gan,
        options.liuri_zhi,
        options.day,
        baziData,
        options.is_paid,
      );
    } catch (error: any) {
      throw new HttpException(
        error.message || 'AI 流日五运六气生成失败',
        error.status || 500
      );
    }
  }

  /**
   * AI 综合生成流年流月流日五运六气分析
   */
  @Post('wuyun/ai/comprehensive')
  @ApiOperation({ summary: 'AI 综合生成流年流月流日五运六气分析' })
  async generateComprehensiveWithAi(
    @Body() options: {
      target_date: string;
      user_id?: string;
      liunian: { gan: string; zhi: string; year: number };
      liuyue: { gan: string; zhi: string; month: number };
      liuri: { gan: string; zhi: string; day: number };
      bazi_json?: string;
      is_paid?: boolean;
    },
  ) {
    try {
      const baziData = options.bazi_json ? JSON.parse(options.bazi_json) : undefined;

      return await this.wuyunliuqiService.generateComprehensiveAnalysis(
        options.target_date,
        options.liunian,
        options.liuyue,
        options.liuri,
        baziData,
        options.is_paid,
        options.user_id,
      );
    } catch (error: any) {
      const status = error.status || error.statusCode || 500;
      const message = error.message || 'AI 综合五运六气生成失败';
      this.logger.error(
        `AI综合五运六气生成失败: status=${status} message=${message}` +
        ` stack=${error.stack?.slice(0, 500) || 'N/A'}`,
      );
      throw new HttpException(message, status);
    }
  }

  @Get('wuyun/daily')
  @ApiOperation({ summary: '获取当日五运六气详解' })
  @ApiQuery({ name: 'target_date', description: '目标日期 YYYY-MM-DD' })
  @ApiQuery({ name: 'bazi_wuxing_json', required: false, description: '八字五行统计 JSON' })
  async getDailyWuYun(
    @Query('target_date') targetDate: string,
    @Query('bazi_wuxing_json') baziWuxingJson?: string,
  ) {
    try {
      const params: Record<string, string> = {};
      if (baziWuxingJson) {
        params.bazi_wuxing_json = baziWuxingJson;
      }
      const response = await axios.get(
        `${this.calendarUrl}/api/v1/health/wuyun/daily`,
        { params: { target_date: targetDate, ...params } }
      );
      return response.data;
    } catch (error: any) {
      throw new HttpException(
        error.response?.data?.detail || '五运六气查询失败',
        error.response?.status || 500
      );
    }
  }

  @Get('wuyun/liunian')
  @ApiOperation({ summary: '获取流年五运六气详解' })
  @ApiQuery({ name: 'target_date', description: '目标日期 YYYY-MM-DD' })
  @ApiQuery({ name: 'liunian_gan', required: false, description: '流年天干' })
  @ApiQuery({ name: 'liunian_zhi', required: false, description: '流年地支' })
  async getLiuNianWuYun(
    @Query('target_date') targetDate: string,
    @Query('liunian_gan') liunianGan?: string,
    @Query('liunian_zhi') liunianZhi?: string,
  ) {
    try {
      const params: Record<string, string> = {};
      if (liunianGan) {
        params.liunian_gan = liunianGan;
      }
      if (liunianZhi) {
        params.liunian_zhi = liunianZhi;
      }
      const response = await axios.get(
        `${this.calendarUrl}/api/v1/health/wuyun/liunian`,
        { params: { target_date: targetDate, ...params } }
      );
      return response.data;
    } catch (error: any) {
      throw new HttpException(
        error.response?.data?.detail || '流年五运六气查询失败',
        error.response?.status || 500
      );
    }
  }

  @Get('organs')
  @ApiOperation({ summary: '身体器官五行分析' })
  @ApiQuery({ name: 'bazi_json', description: '八字四柱 JSON' })
  @ApiQuery({ name: 'wuxing_counts_json', description: '五行计数 JSON' })
  async getOrganAnalysis(
    @Query('bazi_json') baziJson: string,
    @Query('wuxing_counts_json') wuxingCountsJson: string,
  ) {
    try {
      const response = await axios.get(`${this.calendarUrl}/api/v1/health/organs`, {
        params: { bazi_json: baziJson, wuxing_counts_json: wuxingCountsJson },
      });
      return response.data;
    } catch (error: any) {
      throw new HttpException(
        error.response?.data?.detail || '器官分析查询失败',
        error.response?.status || 500
      );
    }
  }

  @Get('warnings')
  @ApiOperation({ summary: '健康预警' })
  @ApiQuery({ name: 'bazi_json', description: '八字四柱 JSON' })
  @ApiQuery({ name: 'wuxing_counts_json', description: '五行计数 JSON' })
  @ApiQuery({ name: 'wuyun_json', required: false, description: '五运六气 JSON' })
  async getHealthWarnings(
    @Query('bazi_json') baziJson: string,
    @Query('wuxing_counts_json') wuxingCountsJson: string,
    @Query('wuyun_json') wuyunJson?: string,
  ) {
    try {
      const response = await axios.get(`${this.calendarUrl}/api/v1/health/warnings`, {
        params: {
          bazi_json: baziJson,
          wuxing_counts_json: wuxingCountsJson,
          ...(wuyunJson ? { wuyun_json: wuyunJson } : {}),
        },
      });
      return response.data;
    } catch (error: any) {
      throw new HttpException(
        error.response?.data?.detail || '健康预警查询失败',
        error.response?.status || 500
      );
    }
  }

  @Get('suggestions')
  @ApiOperation({ summary: '综合养生建议' })
  @ApiQuery({ name: 'bazi_json', description: '八字四柱 JSON' })
  @ApiQuery({ name: 'wuxing_counts_json', description: '五行计数 JSON' })
  @ApiQuery({ name: 'target_year', required: false, description: '目标流年' })
  @ApiQuery({ name: 'target_month', required: false, description: '目标流月' })
  @ApiQuery({ name: 'wuyun_json', required: false, description: '五运六气 JSON' })
  async getHealthSuggestions(
    @Query('bazi_json') baziJson: string,
    @Query('wuxing_counts_json') wuxingCountsJson: string,
    @Query('target_year') targetYear?: string,
    @Query('target_month') targetMonth?: string,
    @Query('wuyun_json') wuyunJson?: string,
  ) {
    try {
      const response = await axios.get(`${this.calendarUrl}/api/v1/health/suggestions`, {
        params: {
          bazi_json: baziJson,
          wuxing_counts_json: wuxingCountsJson,
          ...(targetYear ? { target_year: targetYear } : {}),
          ...(targetMonth ? { target_month: targetMonth } : {}),
          ...(wuyunJson ? { wuyun_json: wuyunJson } : {}),
        },
      });
      return response.data;
    } catch (error: any) {
      throw new HttpException(
        error.response?.data?.detail || '养生建议查询失败',
        error.response?.status || 500
      );
    }
  }
}
