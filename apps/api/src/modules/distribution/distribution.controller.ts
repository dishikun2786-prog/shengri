import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DistributionService } from './distribution.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('分销')
@Controller('distribution')
export class DistributionController {
  constructor(private distService: DistributionService) {}

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '申请成为分销员' })
  apply(@CurrentUser('id') userId: number) {
    return this.distService.applyDistributor(userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '我的分销信息' })
  getMyInfo(@CurrentUser('id') userId: number) {
    return this.distService.getMyDistribution(userId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: '分销排行榜' })
  leaderboard() {
    return this.distService.getLeaderboard();
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '申请佣金提现（需管理员审核）' })
  withdraw(@CurrentUser('id') userId: number) {
    return this.distService.requestWithdrawal(userId);
  }
}
