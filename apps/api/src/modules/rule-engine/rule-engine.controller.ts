import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RuleEngineService } from './rule-engine.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('规则引擎')
@Controller('rules')
export class RuleEngineController {
  constructor(private ruleEngine: RuleEngineService) {}

  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '规则引擎分析命盘' })
  analyze(@Body() body: { chartData: any; modules?: string[] }) {
    return this.ruleEngine.analyze(body.chartData, body.modules || []);
  }

  @Get(':module')
  @ApiOperation({ summary: '获取某模块的规则列表' })
  getRules(@Param('module') module: string) {
    return this.ruleEngine.getRulesByModule(module);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建规则（管理员）' })
  createRule(@Body() data: any) {
    return this.ruleEngine.createRule(data);
  }
}
