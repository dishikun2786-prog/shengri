import { Controller, Post, Get, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BaziService } from './bazi.service';
import { CreateChartDto } from './bazi.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('八字排盘')
@Controller('bazi')
export class BaziController {
  constructor(private baziService: BaziService) {}

  @Post('chart')
  @ApiOperation({ summary: '排盘（无需登录）' })
  createChartPublic(@Body() dto: CreateChartDto) {
    return this.baziService.createChart(dto);
  }

  @Post('chart/save')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '排盘并保存（需登录）' })
  createChartSave(
    @Body() dto: CreateChartDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.baziService.createChart(dto, userId);
  }

  @Get('chart/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取命盘详情' })
  getChart(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.baziService.getChart(id, userId);
  }

  @Get('cities/search')
  @ApiOperation({ summary: '搜索城市/区县' })
  @ApiQuery({ name: 'q', description: '搜索关键词' })
  @ApiQuery({ name: 'limit', required: false, description: '返回数量上限' })
  searchCities(
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.baziService.searchCities(q, limit ? parseInt(limit) : 10);
  }

  @Get('cities')
  @ApiOperation({ summary: '获取支持的城市列表' })
  getCities() {
    return this.baziService.getCities();
  }

  @Get('liuyue')
  @ApiOperation({ summary: '获取流月干支' })
  @ApiQuery({ name: 'year', description: '公历年' })
  @ApiQuery({ name: 'day_master', required: false, description: '日主天干（兼容旧版）' })
  getLiuyue(
    @Query('year') year: string,
    @Query('day_master') dayMaster?: string,
  ) {
    return this.baziService.getLiuyue(parseInt(year), dayMaster);
  }

  @Get('liuri')
  @ApiOperation({ summary: '获取流日干支（统一基准日口径）' })
  @ApiQuery({ name: 'year', description: '公历年' })
  @ApiQuery({ name: 'month', description: '公历月' })
  @ApiQuery({ name: 'day_master', required: false, description: '日主天干（兼容旧版）' })
  @ApiQuery({ name: 'day_boundary_mode', required: false, description: '换日口径: zi_hour|gregorian_midnight' })
  @ApiQuery({ name: 'use_true_solar_time', required: false, description: '是否使用真太阳时' })
  @ApiQuery({ name: 'reference_hour', required: false, description: '参考小时' })
  @ApiQuery({ name: 'reference_minute', required: false, description: '参考分钟' })
  @ApiQuery({ name: 'longitude', required: false, description: '经度' })
  @ApiQuery({ name: 'timezone_offset', required: false, description: '时区偏移' })
  getLiuri(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('day_master') dayMaster?: string,
    @Query('day_boundary_mode') dayBoundaryMode?: 'gregorian_midnight' | 'zi_hour',
    @Query('use_true_solar_time') useTrueSolarTime?: string,
    @Query('reference_hour') referenceHour?: string,
    @Query('reference_minute') referenceMinute?: string,
    @Query('longitude') longitude?: string,
    @Query('timezone_offset') timezoneOffset?: string,
  ) {
    return this.baziService.getLiuri(parseInt(year), parseInt(month), dayMaster, {
      day_boundary_mode: dayBoundaryMode,
      use_true_solar_time: useTrueSolarTime === 'true',
      reference_hour: referenceHour !== undefined ? parseInt(referenceHour) : undefined,
      reference_minute: referenceMinute !== undefined ? parseInt(referenceMinute) : undefined,
      longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
      timezone_offset: timezoneOffset !== undefined ? parseFloat(timezoneOffset) : undefined,
    });
  }

  @Get('liunian')
  @ApiOperation({ summary: '获取流年干支' })
  @ApiQuery({ name: 'day_master', description: '日主天干' })
  @ApiQuery({ name: 'year_zhi', description: '年柱地支' })
  @ApiQuery({ name: 'start_year', description: '起始公历年' })
  @ApiQuery({ name: 'count', required: false, description: '返回年数，默认10' })
  getLiunian(
    @Query('day_master') dayMaster: string,
    @Query('year_zhi') yearZhi: string,
    @Query('start_year') startYear: string,
    @Query('count') count?: string,
  ) {
    return this.baziService.getLiunian(
      dayMaster,
      yearZhi,
      parseInt(startYear),
      count ? parseInt(count) : 10,
    );
  }
}
