import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PromotionService } from './promotion.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('推广中心')
@Controller('promotion')
export class PromotionController {
  constructor(private promotionService: PromotionService) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '推广中心仪表盘数据' })
  getDashboard(@CurrentUser('id') userId: number) {
    return this.promotionService.getDashboard(userId);
  }

  @Get('earnings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '收益记录列表' })
  getEarnings(
    @CurrentUser('id') userId: number,
    @Query('page') page?: number,
    @Query('size') size?: number,
  ) {
    return this.promotionService.getEarningsHistory(userId, page, size);
  }

  @Get('team')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '我的团队' })
  getTeam(@CurrentUser('id') userId: number) {
    return this.promotionService.getTeamOverview(userId);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '申请成为推广员' })
  apply(@CurrentUser('id') userId: number) {
    return this.promotionService.applyForPromotion(userId);
  }

  @Get('referral-link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取推广链接' })
  getReferralLink(@CurrentUser('id') userId: number) {
    return this.promotionService.getReferralLink(userId);
  }
}
