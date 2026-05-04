import { Controller, Post, Get, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { OpenApiService } from './open-api.service';
import { BaziService } from '../bazi/bazi.service';
import { RuleEngineService } from '../rule-engine/rule-engine.service';
import { AiService } from '../ai/ai.service';

@ApiTags('开放API')
@Controller('open')
export class OpenApiController {
  constructor(
    private openApiService: OpenApiService,
    private baziService: BaziService,
    private ruleEngine: RuleEngineService,
    private aiService: AiService,
  ) {}

  private async validateAndCheckRate(apiKey: string) {
    if (!apiKey) {
      throw new HttpException('API Key required', HttpStatus.UNAUTHORIZED);
    }
    try {
      const { rateLimit } = await this.openApiService.validateApiKey(apiKey);
      const allowed = await this.openApiService.checkRateLimit(apiKey, rateLimit);
      if (!allowed) {
        throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      }
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException('Invalid API Key', HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('chart')
  @ApiOperation({ summary: '开放API - 排盘' })
  @ApiHeader({ name: 'X-API-Key', required: true })
  async chart(
    @Headers('x-api-key') apiKey: string,
    @Body() body: { year: number; month: number; day: number; hour: number; minute: number; gender: number; city?: string },
  ) {
    await this.validateAndCheckRate(apiKey);
    return this.baziService.createChart(body);
  }

  @Post('analyze')
  @ApiOperation({ summary: '开放API - 分析' })
  @ApiHeader({ name: 'X-API-Key', required: true })
  async analyze(
    @Headers('x-api-key') apiKey: string,
    @Body() body: { chartData: any; modules?: string[] },
  ) {
    await this.validateAndCheckRate(apiKey);
    return this.ruleEngine.analyze(body.chartData, body.modules || []);
  }
}
