import { Controller, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShareService } from './share.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('报告分享（需登录）')
@Controller('report')
export class ReportShareController {
  constructor(private shareService: ShareService) {}

  @Post(':uuid/share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建/获取报告分享链接' })
  createShare(
    @CurrentUser('id') userId: number,
    @Param('uuid') uuid: string,
  ) {
    return this.shareService.createShare(userId, uuid);
  }

  @Delete(':uuid/share/:shareId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '撤销分享链接' })
  deactivateShare(
    @CurrentUser('id') userId: number,
    @Param('shareId') shareId: string,
  ) {
    return this.shareService.deactivateShare(userId, Number(shareId));
  }
}
