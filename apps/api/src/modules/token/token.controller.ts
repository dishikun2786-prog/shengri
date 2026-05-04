import { Controller, Get, Query } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TokenService } from './token.service';

@Controller('token')
@UseGuards(JwtAuthGuard)
export class TokenController {
  constructor(private tokenService: TokenService) {}

  @Get('quota')
  async getQuota(@CurrentUser('id') userId: number) {
    return this.tokenService.checkFreeQuota(userId);
  }

  @Get('usages')
  async getUsages(
    @CurrentUser('id') userId: number,
    @Query('page') page = 1,
    @Query('size') size = 20,
  ) {
    return this.tokenService.getUserUsages(userId, +page, +size);
  }
}
