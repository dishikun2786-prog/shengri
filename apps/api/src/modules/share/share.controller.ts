import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ShareService } from './share.service';

@ApiTags('分享页面（公开）')
@Controller('share')
export class ShareController {
  constructor(private shareService: ShareService) {}

  @Get(':token')
  @ApiOperation({ summary: '获取分享报告预览数据（公开，无需登录）' })
  getSharedReport(@Param('token') token: string) {
    return this.shareService.getSharedReport(token);
  }
}
