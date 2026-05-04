import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HehunService } from './hehun.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('合婚')
@Controller('hehun')
export class HehunController {
  constructor(private hehunService: HehunService) {}

  @Post('match')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '合婚匹配分析' })
  match(
    @CurrentUser('id') userId: number,
    @Body() body: {
      maleChartId: number;
      femaleChartId: number;
      orderId?: number;
    },
  ) {
    return this.hehunService.matchCouple({
      userId,
      maleChartId: body.maleChartId,
      femaleChartId: body.femaleChartId,
      orderId: body.orderId,
    });
  }
}
