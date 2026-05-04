import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('AI分析')
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '生成AI分析报告' })
  generate(@Body() body: {
    module: string;
    chartData: any;
    ruleResults: any;
    reportType: string;
    isPaid: boolean;
  }) {
    return this.aiService.generateReport(body);
  }
}
