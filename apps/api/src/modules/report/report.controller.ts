import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('分析报告')
@Controller('report')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '生成分析报告' })
  generate(
    @CurrentUser('id') userId: number,
    @Body() body: {
      chartId: number;
      reportType: string;
      isPaid?: boolean;
      orderId?: number;
      productId?: number;
    },
  ) {
    return this.reportService.generateReport({
      userId,
      chartId: body.chartId,
      reportType: body.reportType,
      isPaid: body.isPaid || false,
      orderId: body.orderId,
      productId: body.productId,
    });
  }

  @Get(':uuid')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取报告详情' })
  getReport(
    @Param('uuid') uuid: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.reportService.getReport(uuid, userId);
  }
}
