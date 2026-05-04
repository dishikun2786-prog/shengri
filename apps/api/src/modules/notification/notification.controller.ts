import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationService } from './notification.service';
import { QueryNotificationDto } from './notification.dto';

@ApiTags('通知')
@Controller('notification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get('list')
  @ApiOperation({ summary: '获取通知列表' })
  getNotifications(
    @CurrentUser('id') userId: number,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationService.getNotifications(userId, query.page, query.size);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '获取未读通知数量' })
  getUnreadCount(@CurrentUser('id') userId: number) {
    return this.notificationService.getUnreadCount(userId);
  }

  @Put(':uuid/read')
  @HttpCode(200)
  @ApiOperation({ summary: '标记通知为已读' })
  markAsRead(
    @CurrentUser('id') userId: number,
    @Param('uuid') uuid: string,
  ) {
    return this.notificationService.markAsRead(uuid, userId);
  }

  @Put('read-all')
  @HttpCode(200)
  @ApiOperation({ summary: '标记所有通知为已读' })
  markAllAsRead(@CurrentUser('id') userId: number) {
    return this.notificationService.markAllAsRead(userId);
  }
}
