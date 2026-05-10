import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { XiaoliurenService } from './xiaoliuren.service';
import { CalculateDto, GenerateReportDto } from './xiaoliuren.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';

@ApiTags('小六壬占卜')
@Controller('xiaoliuren')
export class XiaoliurenController {
  constructor(private readonly xiaoliurenService: XiaoliurenService) {}

  @Post('calculate')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: '执行小六壬推算（公开，登录后自动保存记录）' })
  calculate(
    @CurrentUser('id') userId: number | null,
    @Body() dto: CalculateDto,
  ) {
    return this.xiaoliurenService.calculate(dto, userId ?? undefined);
  }

  @Post('report/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '生成小六壬AI解读报告' })
  generateReport(
    @CurrentUser('id') userId: number,
    @Body() dto: GenerateReportDto,
  ) {
    return this.xiaoliurenService.generateReport(dto, userId);
  }

  @Get('report/:uuid')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取小六壬报告详情' })
  getReport(
    @Param('uuid') uuid: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.xiaoliurenService.getReport(uuid, userId);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户占卜历史' })
  getHistory(
    @CurrentUser('id') userId: number,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.xiaoliurenService.getHistory(userId, Number(skip) || 0, Number(take) || 20);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除占卜记录' })
  deleteRecord(@CurrentUser('id') userId: number, @Param('id') id: number) {
    return this.xiaoliurenService.deleteRecord(userId, Number(id));
  }
}
