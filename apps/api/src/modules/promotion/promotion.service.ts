import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DistributionService } from '../distribution/distribution.service';

@Injectable()
export class PromotionService {
  private readonly logger = new Logger(PromotionService.name);

  constructor(
    private prisma: PrismaService,
    private distService: DistributionService,
  ) {}

  async getDashboard(userId: number) {
    const dist = await this.prisma.distributor.findUnique({ where: { userId } });

    const baseUrl = process.env.WEB_BASE_URL || 'https://sr.openedskill.com';
    const referralLink = `${baseUrl}/?ref=${userId}`;

    if (!dist) {
      return {
        isDistributor: false,
        referralLink,
      };
    }

    const recentCommissions = await this.prisma.commissionRecord.findMany({
      where: { distributorId: dist.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Batch lookup buyer nicknames
    const buyerIds = [...new Set(recentCommissions.map((c) => c.buyerId))];
    const buyers = await this.prisma.user.findMany({
      where: { id: { in: buyerIds } },
      select: { id: true, nickname: true },
    });
    const nicknameMap = new Map(buyers.map((b) => [b.id, b.nickname]));

    const teamSize = await this.prisma.user.count({
      where: { referrerId: userId },
    });

    return {
      isDistributor: true,
      level: dist.level,
      totalEarnings: Number(dist.totalEarnings),
      pendingAmount: Number(dist.pendingAmount),
      withdrawnAmount: Number(dist.withdrawnAmount),
      totalOrders: dist.totalOrders,
      totalTeamSize: teamSize,
      commissionRate: dist.commissionRate ? Number(dist.commissionRate) : null,
      recentCommissions: recentCommissions.map((c) => ({
        id: c.id,
        buyerNickname: nicknameMap.get(c.buyerId) || '用户',
        commissionLevel: c.commissionLevel,
        commissionRate: Number(c.commissionRate),
        commissionAmount: Number(c.commissionAmount),
        orderAmount: Number(c.orderAmount),
        status: c.status,
        createdAt: c.createdAt,
      })),
      referralLink,
    };
  }

  async getEarningsHistory(userId: number, page: number = 1, size: number = 20) {
    const dist = await this.prisma.distributor.findUnique({ where: { userId } });
    if (!dist) return { records: [], total: 0, page, size };

    const [records, total] = await Promise.all([
      this.prisma.commissionRecord.findMany({
        where: { distributorId: dist.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.commissionRecord.count({ where: { distributorId: dist.id } }),
    ]);

    // Batch lookup buyer nicknames
    const buyerIds = [...new Set(records.map((c) => c.buyerId))];
    const buyers = await this.prisma.user.findMany({
      where: { id: { in: buyerIds } },
      select: { id: true, nickname: true },
    });
    const nicknameMap = new Map(buyers.map((b) => [b.id, b.nickname]));

    return {
      records: records.map((c) => ({
        id: c.id,
        buyerNickname: nicknameMap.get(c.buyerId) || '用户',
        commissionLevel: c.commissionLevel,
        commissionRate: Number(c.commissionRate),
        commissionAmount: Number(c.commissionAmount),
        orderAmount: Number(c.orderAmount),
        status: c.status,
        createdAt: c.createdAt,
      })),
      total,
      page,
      size,
    };
  }

  async getTeamOverview(userId: number) {
    const referrals = await this.prisma.user.findMany({
      where: { referrerId: userId },
      select: {
        id: true,
        nickname: true,
        createdAt: true,
        totalSpent: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const teamMembers = await Promise.all(
      referrals.map(async (ref) => {
        const orderCount = await this.prisma.order.count({
          where: { userId: ref.id, status: 1 },
        });
        return {
          id: ref.id,
          nickname: ref.nickname || '用户',
          joinedAt: ref.createdAt,
          totalSpent: Number(ref.totalSpent),
          orderCount,
        };
      }),
    );

    return { teamMembers, totalCount: teamMembers.length };
  }

  async applyForPromotion(userId: number) {
    const dist = await this.distService.applyDistributor(userId);
    const baseUrl = process.env.WEB_BASE_URL || 'https://sr.openedskill.com';
    return {
      ...dist,
      referralLink: `${baseUrl}/?ref=${userId}`,
    };
  }

  getReferralLink(userId: number) {
    const baseUrl = process.env.WEB_BASE_URL || 'https://sr.openedskill.com';
    return { referralLink: `${baseUrl}/?ref=${userId}` };
  }
}
