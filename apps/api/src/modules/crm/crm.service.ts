import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  async createCustomer(data: {
    userId?: number;
    name?: string;
    phone?: string;
    wechatId?: string;
    company?: string;
    source?: string;
    sourceDetail?: string;
  }) {
    return this.prisma.crmCustomer.create({
      data: {
        ...data,
        customerStage: 'lead',
        customerType: data.company ? 'enterprise' : 'individual',
      },
    });
  }

  async updateCustomer(id: number, data: any) {
    return this.prisma.crmCustomer.update({ where: { id }, data });
  }

  async listCustomers(params: {
    stage?: string;
    level?: string;
    assignedTo?: number;
    page?: number;
    pageSize?: number;
  }) {
    const { stage, level, assignedTo, page = 1, pageSize = 20 } = params;
    const where: any = { status: 1 };
    if (stage) where.customerStage = stage;
    if (level) where.customerLevel = level;
    if (assignedTo) where.assignedTo = assignedTo;

    const [items, total] = await Promise.all([
      this.prisma.crmCustomer.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.crmCustomer.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async addFollowUp(data: {
    customerId: number;
    operatorId: number;
    followType: string;
    content: string;
    result?: string;
    nextFollowAt?: Date;
  }) {
    const followUp = await this.prisma.crmFollowUp.create({ data });

    await this.prisma.crmCustomer.update({
      where: { id: data.customerId },
      data: {
        lastFollowAt: new Date(),
        nextFollowAt: data.nextFollowAt,
        followCount: { increment: 1 },
      },
    });

    return followUp;
  }

  async getCustomerTimeline(customerId: number) {
    return this.prisma.crmFollowUp.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getConversionFunnel() {
    const stages = ['lead', 'prospect', 'customer', 'vip', 'lost'];
    const counts: Record<string, number> = {};
    for (const stage of stages) {
      counts[stage] = await this.prisma.crmCustomer.count({
        where: { customerStage: stage },
      });
    }
    return counts;
  }
}
