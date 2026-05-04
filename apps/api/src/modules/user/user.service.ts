import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!user.passwordHash) {
      throw new BadRequestException('当前账号未设置密码，无法修改');
    }

    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('当前密码错误');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('新密码至少6位');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  }

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async findByUuid(uuid: string) {
    const user = await this.prisma.user.findUnique({ where: { uuid } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async updateProfile(id: number, data: {
    nickname?: string;
    gender?: number;
    birthDate?: Date;
    birthTime?: string;
    birthCity?: string;
    birthLongitude?: number;
    birthLatitude?: number;
    identityType?: number;
  }) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async getUserCharts(userId: number) {
    return this.prisma.baziChart.findMany({
      where: { userId, status: 1 },
      include: {
        reports: {
          select: { id: true, uuid: true, reportType: true, isPaid: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteUserChart(userId: number, chartId: number) {
    const chart = await this.prisma.baziChart.findFirst({
      where: { id: chartId, userId, status: 1 },
      select: { id: true },
    });

    if (!chart) {
      throw new NotFoundException('命盘不存在');
    }

    await this.prisma.baziChart.update({
      where: { id: chartId },
      data: { status: 0 },
    });

    return { success: true };
  }

  async getUserOrders(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserReports(userId: number) {
    // Get reports owned by the user
    const ownReports = await this.prisma.analysisReport.findMany({
      where: { userId, status: 1 },
      include: {
        chart: true,
        shares: {
          where: { isActive: true },
          select: { id: true, shareToken: true, viewCount: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also get pairing reports where user is the receiver
    // (pairing report's userId is the initiator, receiver wouldn't see it otherwise)
    const pairingRequestReports = await this.prisma.pairingRequest.findMany({
      where: {
        receiverId: userId,
        status: 5,
        reportId: { not: null },
      },
      select: { reportId: true },
    });
    const pairingReportIds = pairingRequestReports
      .map((p) => p.reportId)
      .filter((id): id is number => id !== null);

    // Fetch those pairing reports
    let pairingReports: any[] = [];
    if (pairingReportIds.length > 0) {
      pairingReports = await this.prisma.analysisReport.findMany({
        where: {
          id: { in: pairingReportIds },
          status: 1,
        },
        include: {
          chart: true,
          shares: {
            where: { isActive: true },
            select: { id: true, shareToken: true, viewCount: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Merge, dedup by id
    const allReports = [...ownReports];
    const ownIds = new Set(ownReports.map((r) => r.id));
    for (const r of pairingReports) {
      if (!ownIds.has(r.id)) {
        allReports.push(r);
      }
    }
    // Re-sort by createdAt desc
    allReports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return allReports.map((report) => ({
      ...report,
      activeShare: report.shares[0] || null,
      shares: undefined,
    }));
  }

  async deleteUserReport(userId: number, reportId: number) {
    const report = await this.prisma.analysisReport.findFirst({
      where: { id: reportId, userId },
      select: { id: true },
    });

    if (!report) {
      throw new NotFoundException('报告不存在');
    }

    await this.prisma.analysisReport.update({
      where: { id: reportId },
      data: { status: 0 },
    });

    return { success: true };
  }
}
