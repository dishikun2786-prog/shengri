import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DigitalEnergyService } from './digital-energy.service';
import { CalculateDto, GenerateReportDto } from './digital-energy.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('数字能量测算')
@Controller('digital-energy')
export class DigitalEnergyController {
  constructor(private readonly service: DigitalEnergyService) {}

  @Post('calculate')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: '执行数字能量测算（登录后自动保存）' })
  calculate(@CurrentUser('id') userId: number | null, @Body() dto: CalculateDto) {
    return this.service.calculate(dto, userId ?? undefined);
  }

  @Post('report/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '生成AI解读报告' })
  generateReport(@CurrentUser('id') userId: number, @Body() dto: GenerateReportDto) {
    return this.service.generateReport(dto, userId);
  }

  @Get('report/:uuid')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取报告详情' })
  getReport(@Param('uuid') uuid: string, @CurrentUser('id') userId: number) {
    return this.service.getReport(uuid, userId);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取测算历史' })
  getHistory(@CurrentUser('id') userId: number, @Query('skip') skip?: number, @Query('take') take?: number) {
    return this.service.getHistory(userId, Number(skip) || 0, Number(take) || 20);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除测算记录' })
  deleteRecord(@CurrentUser('id') userId: number, @Param('id') id: number) {
    return this.service.deleteRecord(userId, Number(id));
  }
}
