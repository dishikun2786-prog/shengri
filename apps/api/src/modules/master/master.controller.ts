import { Controller, Post, Get, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MasterService } from './master.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('命理师')
@Controller('master')
export class MasterController {
  constructor(private masterService: MasterService) {}

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '申请成为命理师' })
  apply(
    @CurrentUser('id') userId: number,
    @Body() data: { displayName: string; title?: string; bio?: string; specialties?: string[] },
  ) {
    return this.masterService.applyMaster(userId, data);
  }

  @Get('list')
  @ApiOperation({ summary: '命理师列表' })
  list(@Query('featured') featured?: boolean) {
    return this.masterService.listMasters({ featured });
  }

  @Get('consultations/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '我的咨询单（命理师端）' })
  myConsultations(@CurrentUser('id') userId: number) {
    return this.masterService.getMyConsultations(userId);
  }

  @Post('consultation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发起咨询' })
  createConsultation(
    @CurrentUser('id') userId: number,
    @Body() data: { masterId: number; chartId?: number; topic?: string; question?: string },
  ) {
    return this.masterService.createConsultation({ userId, ...data });
  }

  @Get(':id')
  @ApiOperation({ summary: '命理师详情' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.masterService.getMaster(id);
  }
}
