import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MasterService {
  constructor(private prisma: PrismaService) {}

  async applyMaster(userId: number, data: {
    displayName: string;
    title?: string;
    bio?: string;
    specialties?: string[];
    experienceYears?: number;
    textPrice?: number;
  }) {
    const existing = await this.prisma.master.findUnique({ where: { userId } });
    if (existing) throw new BadRequestException('已提交命理师申请');

    return this.prisma.master.create({
      data: {
        userId,
        displayName: data.displayName,
        title: data.title,
        bio: data.bio,
        specialties: data.specialties || [],
        experienceYears: data.experienceYears,
        textPrice: data.textPrice,
        status: 0, // pending review
      },
    });
  }

  async listMasters(params: { featured?: boolean; page?: number }) {
    const { featured, page = 1 } = params;
    const where: any = { status: 1 };
    if (featured) where.isFeatured = true;

    return this.prisma.master.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { avgRating: 'desc' }],
      skip: (page - 1) * 20,
      take: 20,
    });
  }

  async getMaster(id: number) {
    const master = await this.prisma.master.findUnique({ where: { id } });
    if (!master) throw new NotFoundException('命理师不存在');
    return master;
  }

  async createConsultation(data: {
    userId: number;
    masterId: number;
    chartId?: number;
    topic?: string;
    question?: string;
    orderId?: number;
  }) {
    const no = `CS${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return this.prisma.consultation.create({
      data: {
        consultationNo: no,
        userId: data.userId,
        masterId: data.masterId,
        chartId: data.chartId,
        consultationType: 'text',
        topic: data.topic,
        question: data.question,
        orderId: data.orderId,
        status: 0,
      },
    });
  }

  async getMyConsultations(userId: number) {
    const master = await this.prisma.master.findUnique({ where: { userId } });
    if (!master) throw new NotFoundException('您还不是命理师');

    return this.prisma.consultation.findMany({
      where: { masterId: master.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async completeConsultation(consultationNo: string, masterId: number, data: {
    messages: any;
  }) {
    return this.prisma.consultation.update({
      where: { consultationNo },
      data: {
        messages: data.messages,
        status: 2,
        completedAt: new Date(),
      },
    });
  }
}
