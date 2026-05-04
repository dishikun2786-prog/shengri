import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DistributionService } from '../distribution/distribution.service';
import { v4 as uuidv4 } from 'uuid';
import * as dayjs from 'dayjs';
import { Decimal } from '@prisma/client/runtime/library';

const ORDER_TIMEOUT_MINUTES = 30;

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private prisma: PrismaService,
    private distService: DistributionService,
  ) {}

  async createOrder(data: {
    userId: number;
    productId: number;
    chartId?: number;
    reportId?: number;
    sourceChannel?: string;
    clientType?: string;
    referrerId?: number;
  }) {
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
    });
    if (!product || !product.isActive) {
      throw new NotFoundException('产品不存在或已下架');
    }

    const orderNo = this.generateOrderNo();

    const order = await this.prisma.order.create({
      data: {
        orderNo,
        userId: data.userId,
        productId: data.productId,
        chartId: data.chartId,
        reportId: data.reportId,
        originalAmount: product.currentPrice,
        discountAmount: 0,
        paidAmount: product.currentPrice,
        referrerId: data.referrerId,
        sourceChannel: data.sourceChannel,
        clientType: data.clientType || 'web',
        status: 0,
      },
      include: { product: true },
    });

    return order;
  }

  async getOrder(id: number) {
    return this.prisma.order.findUnique({
      where: { id },
      include: { product: true, user: true },
    });
  }

  async getOrderByNo(orderNo: string) {
    return this.prisma.order.findUnique({
      where: { orderNo },
      include: { product: true },
    });
  }

  async markPaid(orderNo: string, paymentData: {
    paymentMethod: string;
    paymentNo: string;
  }) {
    const order = await this.prisma.order.update({
      where: { orderNo },
      data: {
        status: 1,
        paymentMethod: paymentData.paymentMethod,
        paymentNo: paymentData.paymentNo,
        paidAt: new Date(),
      },
      include: { product: true },
    });

    await this.prisma.user.update({
      where: { id: order.userId },
      data: { totalSpent: { increment: order.paidAmount } },
    });

    if (order.reportId) {
      await this.prisma.analysisReport.update({
        where: { id: order.reportId },
        data: { isPaid: true },
      });
    }

    // Auto-trigger commission processing (fire-and-forget)
    this.distService.processCommission(order.id).catch((err) => {
      this.logger.error(`Commission processing failed for order ${orderNo}: ${err.message}`);
    });

    return order;
  }

  async payWithBalance(userId: number, orderNo: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { orderNo } });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.userId !== userId) throw new BadRequestException('无权操作此订单');
      if (order.status !== 0) throw new BadRequestException('订单状态不允许支付');

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('用户不存在');

      const needed = new Decimal(order.paidAmount.toString());
      if (user.balance.lessThan(needed)) {
        throw new BadRequestException(
          `余额不足，当前余额 ¥${user.balance}，需支付 ¥${needed}`,
        );
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: needed },
          totalSpent: { increment: needed },
        },
      });

      const balanceTx = await tx.balanceTransaction.create({
        data: {
          userId,
          type: 'payment',
          amount: needed.negated(),
          balanceAfter: updatedUser.balance,
          refId: orderNo,
          refType: 'order',
          remark: `余额支付订单 ${orderNo}`,
        },
      });

      const paidOrder = await tx.order.update({
        where: { orderNo },
        data: {
          status: 1,
          paymentMethod: 'balance',
          paymentNo: `BAL-${balanceTx.id}`,
          paidAt: new Date(),
        },
        include: { product: true },
      });

      if (paidOrder.reportId) {
        await tx.analysisReport.update({
          where: { id: paidOrder.reportId },
          data: { isPaid: true },
        });
      }

      // Auto-trigger commission after transaction commits
      setImmediate(() => {
        this.distService.processCommission(paidOrder.id).catch((err) => {
          this.logger.error(`Commission processing failed for order ${orderNo}: ${err.message}`);
        });
      });

      return paidOrder;
    });
  }

  async listProducts(category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;
    return this.prisma.product.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async closeExpiredOrders() {
    const expireTime = new Date(Date.now() - ORDER_TIMEOUT_MINUTES * 60 * 1000);
    const result = await this.prisma.order.updateMany({
      where: {
        status: 0,
        createdAt: { lt: expireTime },
      },
      data: { status: 5 },
    });
    if (result.count > 0) {
      this.logger.log(`已关闭 ${result.count} 个超时未付订单`);
    }
  }

  private generateOrderNo(): string {
    const prefix = dayjs().format('YYYYMMDDHHmmss');
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `SR${prefix}${random}`;
  }
}
