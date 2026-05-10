import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BazhaiService } from './bazhai.service';
import { CalculateDto, GenerateReportDto } from './bazhai.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('八宅风水')
@Controller('bazhai')
export class BazhaiController {
  constructor(private readonly service: BazhaiService) {}
  @Post('calculate') @UseGuards(OptionalJwtAuthGuard) @ApiOperation({ summary: '八宅风水命卦测算' })
  calculate(@CurrentUser('id') userId: number | null, @Body() dto: CalculateDto) { return this.service.calculate(dto, userId ?? undefined); }
  @Post('report/generate') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '生成AI报告' })
  generateReport(@CurrentUser('id') userId: number, @Body() dto: GenerateReportDto) { return this.service.generateReport(dto, userId); }
  @Get('report/:uuid') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '获取报告' })
  getReport(@Param('uuid') uuid: string, @CurrentUser('id') userId: number) { return this.service.getReport(uuid, userId); }
  @Get('history') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '历史记录' })
  getHistory(@CurrentUser('id') userId: number, @Query('skip') skip?: number, @Query('take') take?: number) { return this.service.getHistory(userId, Number(skip) || 0, Number(take) || 20); }
  @Delete(':id') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '删除记录' })
  deleteRecord(@CurrentUser('id') userId: number, @Param('id') id: number) { return this.service.deleteRecord(userId, Number(id)); }
}
