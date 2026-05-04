import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminDashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todayRevenue,
      todayNewUsers,
      todayOrders,
      monthRevenue,
      totalUsers,
      totalOrders,
      totalReports,
      monthPaidOrders,
      monthTotalOrders,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { paidAmount: true },
        where: { paidAt: { gte: today }, status: { in: [1, 2] } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: today }, status: { in: [1, 2] } },
      }),
      this.prisma.order.aggregate({
        _sum: { paidAmount: true },
        where: { paidAt: { gte: monthStart }, status: { in: [1, 2] } },
      }),
      this.prisma.user.count(),
      this.prisma.order.count({ where: { status: { in: [1, 2] } } }),
      this.prisma.analysisReport.count(),
      this.prisma.order.count({
        where: { createdAt: { gte: monthStart }, status: { in: [1, 2] } },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: monthStart } },
      }),
    ]);

    const conversionRate = monthTotalOrders > 0
      ? Math.round((monthPaidOrders / monthTotalOrders) * 10000) / 100
      : 0;

    return {
      todayRevenue: Number(todayRevenue._sum.paidAmount || 0),
      todayNewUsers,
      todayOrders,
      monthRevenue: Number(monthRevenue._sum.paidAmount || 0),
      conversionRate,
      totalUsers,
      totalOrders,
      totalReports,
    };
  }

  @Get('revenue-chart')
  async getRevenueChart() {
    const days: { date: string; revenue: number; orders: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);

      const [agg, count] = await Promise.all([
        this.prisma.order.aggregate({
          _sum: { paidAmount: true },
          where: {
            paidAt: { gte: d, lt: nextDay },
            status: { in: [1, 2] },
          },
        }),
        this.prisma.order.count({
          where: {
            createdAt: { gte: d, lt: nextDay },
            status: { in: [1, 2] },
          },
        }),
      ]);

      days.push({
        date: d.toISOString().slice(0, 10),
        revenue: Number(agg._sum.paidAmount || 0),
        orders: count,
      });
    }

    return days;
  }

  @Get('order-status')
  async getOrderStatusDistribution() {
    const statuses = [
      { status: 0, label: '待付款' },
      { status: 1, label: '已付款' },
      { status: 2, label: '已完成' },
      { status: 3, label: '退款中' },
      { status: 4, label: '已退款' },
      { status: 5, label: '已取消' },
    ];

    const result = await Promise.all(
      statuses.map(async (s) => ({
        ...s,
        count: await this.prisma.order.count({ where: { status: s.status } }),
      })),
    );

    return result.filter((r) => r.count > 0);
  }

  @Get('recent-orders')
  async getRecentOrders() {
    return this.prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, nickname: true, phone: true } },
        product: { select: { id: true, name: true } },
      },
    });
  }

  @Get('recent-users')
  async getRecentUsers() {
    return this.prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nickname: true,
        phone: true,
        vipLevel: true,
        totalSpent: true,
        createdAt: true,
      },
    });
  }
}
