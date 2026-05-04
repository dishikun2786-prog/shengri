import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShareService } from './share.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('用户分享记录')
@Controller('user')
export class UserShareController {
  constructor(private shareService: ShareService) {}

  @Get('shares')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户的分享记录列表' })
  listShares(@CurrentUser('id') userId: number) {
    return this.shareService.listUserShares(userId);
  }
}
