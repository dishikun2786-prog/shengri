import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private unreadCacheKey(userId: number) {
    return `notification:unread:${userId}`;
  }

  private async invalidateUnreadCache(userId: number) {
    await this.redis.del(this.unreadCacheKey(userId));
  }

  async getNotifications(userId: number, page = 1, size = 20) {
    const skip = (page - 1) * size;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.getUnreadCount(userId),
    ]);

    return {
      notifications,
      total,
      unreadCount: unreadCount.unreadCount,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async getUnreadCount(userId: number) {
    const cached = await this.redis.get(this.unreadCacheKey(userId));
    if (cached !== null) {
      return { unreadCount: parseInt(cached, 10) };
    }

    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    // Cache for 30 seconds
    await this.redis.set(this.unreadCacheKey(userId), String(count), 30);
    return { unreadCount: count };
  }

  async markAsRead(uuid: string, userId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { uuid },
      select: { userId: true },
    });
    if (!notification) throw new NotFoundException('通知不存在');
    if (notification.userId !== userId) throw new ForbiddenException('无权操作');

    await this.prisma.notification.update({
      where: { uuid },
      data: { isRead: true },
    });

    // Invalidate cache
    await this.invalidateUnreadCache(userId);
    return { success: true };
  }

  async markAllAsRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    // Invalidate cache
    await this.invalidateUnreadCache(userId);
    return { success: true };
  }
}
