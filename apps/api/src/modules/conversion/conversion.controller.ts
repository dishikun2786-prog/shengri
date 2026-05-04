import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConversionService } from './conversion.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('自动成交')
@Controller('conversion')
export class ConversionController {
  constructor(private conversionService: ConversionService) {}

  @Post('task')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建成交任务' })
  createTask(@Body() body: {
    userId: number;
    triggerType: string;
    triggerDetail?: any;
    productId?: number;
  }) {
    return this.conversionService.createConversionTask(body);
  }

  @Post('ai-followup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI生成跟进话术' })
  generateFollowUp(@Body() body: { userId: number; context: string }) {
    return this.conversionService.generateAiFollowUp(body.userId, body.context);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '成交统计' })
  getStats() {
    return this.conversionService.getConversionStats();
  }

  @Post('process')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '处理待执行任务（定时任务调用）' })
  processTasks() {
    return this.conversionService.processScheduledTasks();
  }
}
