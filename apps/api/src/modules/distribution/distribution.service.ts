import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class DistributionService {
  private readonly logger = new Logger(DistributionService.name);

  constructor(private prisma: PrismaService) {}

  async applyDistributor(userId: number) {
    const existing = await this.prisma.distributor.findUnique({
      where: { userId },
    });
    if (existing) throw new BadRequestException('已经是分销员');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    let parentId: number | null = null;
    if (user?.referrerId) {
      const parentDist = await this.prisma.distributor.findUnique({
        where: { userId: user.referrerId },
      });
      if (parentDist) parentId = parentDist.id;
    }

    return this.prisma.distributor.create({
      data: {
        userId,
        level: 1,
        parentId,
        status: 1,
        approvedAt: new Date(),
      },
    });
  }

  async processCommission(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true },
    });
    if (!order || order.status < 1) return;

    const buyer = await this.prisma.user.findUnique({
      where: { id: order.userId },
    });
    if (!buyer?.referrerId) return;

    // Level 1 commission
    const l1Dist = await this.prisma.distributor.findUnique({
      where: { userId: buyer.referrerId },
    });
    if (l1Dist && l1Dist.status === 1) {
      const rate = Number(l1Dist.commissionRate || order.product.commissionRateL1 || 0);
      const amount = Number(order.paidAmount) * rate;
      if (amount > 0) {
        await this.prisma.commissionRecord.create({
          data: {
            distributorId: l1Dist.id,
            orderId: order.id,
            buyerId: order.userId,
            commissionLevel: 1,
            commissionRate: rate,
            commissionAmount: amount,
            orderAmount: order.paidAmount,
          },
        });
        await this.prisma.distributor.update({
          where: { id: l1Dist.id },
          data: {
            pendingAmount: { increment: amount },
            totalOrders: { increment: 1 },
          },
        });
      }

      // Level 2 commission
      if (l1Dist.parentId) {
        const l2Dist = await this.prisma.distributor.findUnique({
          where: { id: l1Dist.parentId },
        });
        if (l2Dist && l2Dist.status === 1) {
          const rate2 = Number(l2Dist.commissionRate || order.product.commissionRateL2 || 0);
          const amount2 = Number(order.paidAmount) * rate2;
          if (amount2 > 0) {
            await this.prisma.commissionRecord.create({
              data: {
                distributorId: l2Dist.id,
                orderId: order.id,
                buyerId: order.userId,
                commissionLevel: 2,
                commissionRate: rate2,
                commissionAmount: amount2,
                orderAmount: order.paidAmount,
              },
            });
            await this.prisma.distributor.update({
              where: { id: l2Dist.id },
              data: { pendingAmount: { increment: amount2 } },
            });
          }
        }
      }
    }
  }

  async getMyDistribution(userId: number) {
    const dist = await this.prisma.distributor.findUnique({
      where: { userId },
    });
    if (!dist) return null;

    const commissions = await this.prisma.commissionRecord.findMany({
      where: { distributorId: dist.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const team = await this.prisma.distributor.findMany({
      where: { parentId: dist.id },
    });

    return {
      ...dist,
      recentCommissions: commissions,
      teamSize: team.length,
    };
  }

  async withdrawCommission(userId: number) {
    const dist = await this.prisma.distributor.findUnique({ where: { userId } });
    if (!dist) throw new NotFoundException('尚未成为推广员');

    const pendingAmount = new Decimal(dist.pendingAmount.toString());
    if (pendingAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('暂无待结算佣金');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update commission records from pending(0) to settled(1)
      await tx.commissionRecord.updateMany({
        where: { distributorId: dist.id, status: 0 },
        data: { status: 1, settledAt: new Date() },
      });

      // Move pending to withdrawn and add to user balance
      const amount = pendingAmount;
      const updatedDist = await tx.distributor.update({
        where: { id: dist.id },
        data: {
          pendingAmount: { decrement: amount },
          withdrawnAmount: { increment: amount },
          totalEarnings: { increment: amount },
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
      });

      const user = await tx.user.findUnique({ where: { id: userId } });
      await tx.balanceTransaction.create({
        data: {
          userId,
          type: 'commission_withdrawal',
          amount,
          balanceAfter: user!.balance,
          refType: 'commission',
          remark: `佣金提现 ¥${amount}`,
        },
      });

      this.logger.log(`用户 ${userId} 提现佣金 ¥${amount}`);

      return {
        withdrawnAmount: Number(amount),
        previousPending: Number(pendingAmount),
        currentPending: Number(updatedDist.pendingAmount),
        totalEarnings: Number(updatedDist.totalEarnings),
      };
    });
  }

  async requestWithdrawal(userId: number) {
    const dist = await this.prisma.distributor.findUnique({ where: { userId } });
    if (!dist) throw new NotFoundException('尚未成为推广员');

    const pendingAmount = Number(dist.pendingAmount);
    if (pendingAmount <= 0) {
      throw new BadRequestException('暂无待结算佣金');
    }

    return this.prisma.$transaction(async (tx) => {
      // Create withdrawal request
      const request = await tx.withdrawalRequest.create({
        data: {
          userId,
          distributorId: dist.id,
          amount: pendingAmount,
          status: 0,
        },
      });

      // Decrement pendingAmount to prevent double-withdrawal
      await tx.distributor.update({
        where: { id: dist.id },
        data: { pendingAmount: { decrement: pendingAmount } },
      });

      this.logger.log(`用户 ${userId} 提交提现申请 ¥${pendingAmount}，申请ID: ${request.id}`);

      return {
        requestId: request.id,
        amount: pendingAmount,
        status: 0,
        message: '提现申请已提交，等待审核',
      };
    });
  }

  async getPendingWithdrawals(page: number = 1, size: number = 20, status?: number) {
    const where: any = {};
    if (status !== undefined && status !== null) {
      where.status = status;
    }

    const [records, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
        include: {
          user: { select: { id: true, nickname: true } },
          distributor: { select: { id: true, level: true, totalEarnings: true } },
        },
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);

    return {
      records: records.map((r) => ({
        id: r.id,
        userId: r.userId,
        userNickname: r.user?.nickname || '用户',
        distributorId: r.distributorId,
        distributorLevel: r.distributor?.level || 1,
        distributorEarnings: Number(r.distributor?.totalEarnings || 0),
        amount: Number(r.amount),
        status: r.status,
        reviewNotes: r.reviewNotes,
        requestedAt: r.requestedAt,
        reviewedAt: r.reviewedAt,
      })),
      total,
      page,
      size,
    };
  }

  async approveWithdrawal(requestId: number, adminId: number) {
    const wreq = await this.prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
      include: { distributor: true },
    });
    if (!wreq) throw new NotFoundException('提现申请不存在');
    if (wreq.status !== 0) throw new BadRequestException('该申请已处理');

    const amount = Number(wreq.amount);
    const dist = wreq.distributor;

    return this.prisma.$transaction(async (tx) => {
      // Update commission records from pending(0) to settled(1)
      await tx.commissionRecord.updateMany({
        where: { distributorId: dist.id, status: 0 },
        data: { status: 1, settledAt: new Date() },
      });

      // Update distributor
      await tx.distributor.update({
        where: { id: dist.id },
        data: {
          withdrawnAmount: { increment: amount },
          totalEarnings: { increment: amount },
        },
      });

      // Add to user balance
      await tx.user.update({
        where: { id: wreq.userId },
        data: { balance: { increment: amount } },
      });

      const user = await tx.user.findUnique({ where: { id: wreq.userId } });
      await tx.balanceTransaction.create({
        data: {
          userId: wreq.userId,
          type: 'commission_withdrawal',
          amount,
          balanceAfter: user!.balance,
          refType: 'commission',
          remark: `佣金提现审核通过 ¥${amount}`,
        },
      });

      // Update withdrawal request
      await tx.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 1,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      this.logger.log(`管理员 ${adminId} 通过提现申请 ${requestId}，金额 ¥${amount}`);

      return { requestId, amount, status: 1, message: '提现审核已通过' };
    });
  }

  async denyWithdrawal(requestId: number, adminId: number, reason: string) {
    const wreq = await this.prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
    });
    if (!wreq) throw new NotFoundException('提现申请不存在');
    if (wreq.status !== 0) throw new BadRequestException('该申请已处理');

    const amount = Number(wreq.amount);

    return this.prisma.$transaction(async (tx) => {
      // Restore pendingAmount
      await tx.distributor.update({
        where: { id: wreq.distributorId },
        data: { pendingAmount: { increment: amount } },
      });

      // Update withdrawal request
      await tx.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 2,
          reviewedBy: adminId,
          reviewNotes: reason,
          reviewedAt: new Date(),
        },
      });

      this.logger.log(`管理员 ${adminId} 拒绝提现申请 ${requestId}，金额 ¥${amount}，原因: ${reason}`);

      return { requestId, amount, status: 2, message: '提现申请已拒绝' };
    });
  }

  async getLeaderboard(limit: number = 20) {
    return this.prisma.distributor.findMany({
      where: { status: 1 },
      orderBy: { totalEarnings: 'desc' },
      take: limit,
    });
  }
}
