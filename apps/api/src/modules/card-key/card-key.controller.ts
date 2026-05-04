import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CardKeyService } from './card-key.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('卡密')
@Controller('card-key')
export class CardKeyController {
  constructor(private cardKeyService: CardKeyService) {}

  @Post('redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户兑换卡密' })
  redeem(
    @CurrentUser('id') userId: number,
    @Body() body: { code: string },
  ) {
    return this.cardKeyService.redeemCardKey(userId, body.code);
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询当前余额' })
  async getBalance(@CurrentUser('id') userId: number) {
    const user = await this.cardKeyService['prisma'].user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });
    return { balance: user?.balance ?? 0 };
  }
}
