import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { BaziService } from '../bazi/bazi.service';
import { AiService } from '../ai/ai.service';
import { ChatService } from '../chat/chat.service';
import { ChatGateway } from '../chat/chat.gateway';
import { PairingBillingService } from './pairing-billing.service';
import { Decimal } from '@prisma/client/runtime/library';

const GAN_HE: Record<string, string> = {
  '甲': '己', '己': '甲', '乙': '庚', '庚': '乙',
  '丙': '辛', '辛': '丙', '丁': '壬', '壬': '丁', '戊': '癸', '癸': '戊',
};

const ZHI_LIU_HE: Record<string, string> = {
  '子': '丑', '丑': '子', '寅': '亥', '亥': '寅',
  '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰',
  '巳': '申', '申': '巳', '午': '未', '未': '午',
};

const ZHI_LIU_CHONG: Record<string, string> = {
  '子': '午', '午': '子', '丑': '未', '未': '丑',
  '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
};

const GAN_WUXING: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

const WUXING_SHENG: Record<string, string> = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};

const WUXING_KE: Record<string, string> = {
  '木': '土', '土': '水', '水': '火', '火': '金', '金': '木',
};

// Valid state transitions
const VALID_TRANSITIONS: Record<number, number[]> = {
  0: [1, 2, 6], // pending -> accepted / rejected / cancelled
  1: [3],        // accepted -> configuring
  3: [4],        // configuring -> analyzing
  4: [5],        // analyzing -> completed
};

@Injectable()
export class PairingService {
  private readonly logger = new Logger(PairingService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private baziService: BaziService,
    private aiService: AiService,
    private chatService: ChatService,
    private billingService: PairingBillingService,
    @Inject(forwardRef(() => ChatGateway)) private chatGateway: ChatGateway,
  ) {}

  /** Create a notification in DB AND push it via Socket.IO to online users */
  private async pushNotification(data: {
    userId: number;
    type: string;
    title: string;
    body?: string;
    refType?: string;
    refId?: string;
  }) {
    const notif = await this.prisma.notification.create({ data });
    // Push to user's personal Socket.IO room (auto-joined on connect)
    try {
      this.chatGateway.sendNotificationToUser(data.userId, {
        uuid: notif.uuid,
        type: data.type,
        title: data.title,
        body: data.body,
        refType: data.refType,
        refId: data.refId,
        createdAt: notif.createdAt.toISOString(),
      });
    } catch (err) {
      // Socket push is best-effort; DB persistence is the source of truth
      this.logger.warn(`Failed to push notification via socket: ${err.message}`);
    }
    return notif;
  }

  // ============ 状态机校验 ============

  private validateTransition(currentStatus: number, newStatus: number) {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new BadRequestException(
        `不允许从状态 ${currentStatus} 转换到 ${newStatus}`,
      );
    }
  }

  private async updateStatus(requestId: number, newStatus: number) {
    const request = await this.prisma.pairingRequest.findUnique({
      where: { id: requestId },
      select: { status: true },
    });
    if (!request) throw new NotFoundException('配对请求不存在');
    this.validateTransition(request.status, newStatus);
    return this.prisma.pairingRequest.update({
      where: { id: requestId },
      data: { status: newStatus },
    });
  }

  // ============ 配对请求 CRUD ============

  async sendRequest(params: {
    initiatorId: number;
    receiverId: number;
    pairingType: string;
    message?: string;
    chartId?: number;
  }) {
    const { initiatorId, receiverId, pairingType, message, chartId } = params;

    if (initiatorId === receiverId) {
      throw new BadRequestException('不能和自己配对');
    }

    // Verify receiver exists
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, status: true },
    });
    if (!receiver || receiver.status === 0) {
      throw new NotFoundException('对方用户不存在');
    }

    // Check for existing pending request between these two users
    const existing = await this.prisma.pairingRequest.findFirst({
      where: {
        OR: [
          { initiatorId, receiverId, status: 0 },
          { initiatorId: receiverId, receiverId: initiatorId, status: 0 },
        ],
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('已有一个待处理的配对请求');
    }

    // Validate chart ownership if provided
    if (chartId) {
      const chart = await this.prisma.baziChart.findUnique({
        where: { id: chartId },
        select: { userId: true },
      });
      if (!chart || chart.userId !== initiatorId) {
        throw new ForbiddenException('命盘不存在或不属于你');
      }
    }

    const request = await this.prisma.pairingRequest.create({
      data: {
        initiatorId,
        receiverId,
        pairingType,
        mode: 'social',
        message: message?.trim() || null,
        initiatorChartId: chartId || null,
        status: 0,
      },
      include: {
        initiator: {
          select: { id: true, nickname: true, username: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, nickname: true, username: true, avatarUrl: true },
        },
      },
    });

    // Create notification for receiver
    const typeLabels: Record<string, string> = {
      personality: '性格匹配',
      career: '事业合作',
      wealth: '财运互补',
      hehun: '合婚分析',
      comprehensive: '综合配对',
    };
    await this.pushNotification({
      userId: receiverId,
      type: 'pairing_request',
      title: `${request.initiator.nickname || request.initiator.username} 向你发起配对请求`,
      body: `配对类型：${typeLabels[pairingType]}${message ? `\n留言：${message}` : ''}`,
      refType: 'pairing_request',
      refId: request.uuid,
    });

    return {
      uuid: request.uuid,
      pairingType: request.pairingType,
      status: request.status,
      message: request.message,
      initiator: request.initiator,
      receiver: request.receiver,
      createdAt: request.createdAt,
    };
  }

  async acceptRequest(requestUuid: string, userId: number, chartId?: number) {
    const request = await this.prisma.pairingRequest.findUnique({
      where: { uuid: requestUuid },
    });
    if (!request) throw new NotFoundException('配对请求不存在');
    if (request.receiverId !== userId) {
      throw new ForbiddenException('只有接收方可以同意配对请求');
    }
    this.validateTransition(request.status, 1);

    // Validate chart if provided
    if (chartId) {
      const chart = await this.prisma.baziChart.findUnique({
        where: { id: chartId },
        select: { userId: true },
      });
      if (!chart || chart.userId !== userId) {
        throw new ForbiddenException('命盘不存在或不属于你');
      }
    }

    const updated = await this.prisma.pairingRequest.update({
      where: { uuid: requestUuid },
      data: {
        status: 1,
        ...(chartId ? { receiverChartId: chartId } : {}),
      },
    });

    // Create notification for initiator
    const receiver = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, username: true },
    });
    const receiverName = receiver?.nickname || receiver?.username || '对方';
    await this.pushNotification({
      userId: request.initiatorId,
      type: 'pairing_accepted',
      title: `${receiverName} 同意了你的配对请求`,
      body: '请前往配置命盘以生成配对报告',
      refType: 'pairing_request',
      refId: requestUuid,
    });

    return { uuid: requestUuid, status: updated.status };
  }

  async rejectRequest(requestUuid: string, userId: number) {
    const request = await this.prisma.pairingRequest.findUnique({
      where: { uuid: requestUuid },
    });
    if (!request) throw new NotFoundException('配对请求不存在');
    if (request.receiverId !== userId) {
      throw new ForbiddenException('只有接收方可以拒绝配对请求');
    }
    this.validateTransition(request.status, 2);

    await this.prisma.pairingRequest.update({
      where: { uuid: requestUuid },
      data: { status: 2 },
    });

    const rejecter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, username: true },
    });
    const rejecterName = rejecter?.nickname || rejecter?.username || '对方';
    await this.pushNotification({
      userId: request.initiatorId,
      type: 'pairing_rejected',
      title: `${rejecterName} 拒绝了你的配对请求`,
      refType: 'pairing_request',
      refId: requestUuid,
    });

    return { uuid: requestUuid, status: 2 };
  }

  async cancelRequest(requestUuid: string, userId: number) {
    const request = await this.prisma.pairingRequest.findUnique({
      where: { uuid: requestUuid },
    });
    if (!request) throw new NotFoundException('配对请求不存在');
    if (request.initiatorId !== userId) {
      throw new ForbiddenException('只有发起方可以取消配对请求');
    }
    this.validateTransition(request.status, 6);

    await this.prisma.pairingRequest.update({
      where: { uuid: requestUuid },
      data: { status: 6 },
    });

    return { uuid: requestUuid, status: 6 };
  }

  // ============ 自选配对 ============

  async initiateSelfPairing(params: {
    userId: number;
    chartIdA: number;
    chartIdB: number;
    pairingType: string;
  }) {
    const { userId, chartIdA, chartIdB, pairingType } = params;

    // Validate both charts exist and belong to user
    const [chartA, chartB] = await Promise.all([
      this.prisma.baziChart.findUnique({ where: { id: chartIdA }, select: { id: true, userId: true } }),
      this.prisma.baziChart.findUnique({ where: { id: chartIdB }, select: { id: true, userId: true } }),
    ]);

    if (!chartA || chartA.userId !== userId) {
      throw new ForbiddenException('命盘A不存在或不属于你');
    }
    if (!chartB || chartB.userId !== userId) {
      throw new ForbiddenException('命盘B不存在或不属于你');
    }
    if (chartIdA === chartIdB) {
      throw new BadRequestException('请选择两个不同的命盘');
    }

    // Check for duplicate self-pairing (same two charts + same type, not completed/cancelled)
    const existing = await this.prisma.pairingRequest.findFirst({
      where: {
        mode: 'self',
        initiatorId: userId,
        pairingType,
        initiatorChartId: chartIdA,
        receiverChartId: chartIdB,
        status: { notIn: [5, 6] },
      },
      select: { uuid: true },
    });
    if (existing) {
      return { uuid: existing.uuid, status: 3 };
    }

    const request = await this.prisma.pairingRequest.create({
      data: {
        initiatorId: userId,
        receiverId: userId,
        initiatorChartId: chartIdA,
        receiverChartId: chartIdB,
        pairingType,
        mode: 'self',
        status: 3,
      },
    });

    return { uuid: request.uuid, status: request.status };
  }

  async getSelfPairingRequests(userId: number, page = 1, size = 20) {
    const skip = (page - 1) * size;
    const [requests, total] = await Promise.all([
      this.prisma.pairingRequest.findMany({
        where: {
          initiatorId: userId,
          receiverId: userId,
          mode: 'self',
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
        include: {
          initiatorChart: {
            select: { id: true, name: true, dayGan: true, gender: true },
          },
          receiverChart: {
            select: { id: true, name: true, dayGan: true, gender: true },
          },
        },
      }),
      this.prisma.pairingRequest.count({
        where: { initiatorId: userId, receiverId: userId, mode: 'self' },
      }),
    ]);

    return {
      requests: requests.map((r) => ({
        uuid: r.uuid,
        pairingType: r.pairingType,
        status: r.status,
        chartA: r.initiatorChart,
        chartB: r.receiverChart,
        isPaid: r.isPaid,
        freeTrial: r.freeTrial,
        createdAt: r.createdAt,
      })),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async configurePairing(requestUuid: string, userId: number, chartId: number) {
    const request = await this.prisma.pairingRequest.findUnique({
      where: { uuid: requestUuid },
    });
    if (!request) throw new NotFoundException('配对请求不存在');

    if (request.mode === 'self') {
      throw new BadRequestException('自选配对无需单独配置命盘');
    }

    if (request.status !== 1 && request.status !== 3) {
      throw new BadRequestException('当前状态不允许配置命盘');
    }
    if (request.initiatorId !== userId && request.receiverId !== userId) {
      throw new ForbiddenException('你不在这个配对请求中');
    }

    // Validate chart ownership
    const chart = await this.prisma.baziChart.findUnique({
      where: { id: chartId },
      select: { userId: true },
    });
    if (!chart || chart.userId !== userId) {
      throw new ForbiddenException('命盘不存在或不属于你');
    }

    // Update the appropriate chart field
    const isInitiator = request.initiatorId === userId;
    const updateData = isInitiator
      ? { initiatorChartId: chartId }
      : { receiverChartId: chartId };

    // If transitioning from accepted -> configuring, update status too
    if (request.status === 1) {
      updateData['status'] = 3;
    }

    const updated = await this.prisma.pairingRequest.update({
      where: { uuid: requestUuid },
      data: updateData,
    });

    return {
      uuid: requestUuid,
      status: updated.status,
      initiatorConfigured: !!updated.initiatorChartId,
      receiverConfigured: !!updated.receiverChartId,
    };
  }

  // ============ 报告生成 ============

  async generateReport(requestUuid: string, userId?: number) {
    const request = await this.prisma.pairingRequest.findUnique({
      where: { uuid: requestUuid },
      include: {
        initiatorChart: true,
        receiverChart: true,
      },
    });
    if (!request) throw new NotFoundException('配对请求不存在');
    if (!request.initiatorChartId || !request.receiverChartId) {
      throw new BadRequestException('双方都需配置命盘后才能生成报告');
    }

    // Payment gate: check if already paid or free-trial used
    if (!request.isPaid && !request.freeTrial) {
      if (!userId) {
        throw new BadRequestException('请先完成支付或使用免费体验');
      }

      // Check free trial first
      const freeCheck = await this.billingService.checkFreeTrial(userId, request.pairingType);
      if (freeCheck.hasFree) {
        await this.billingService.consumeFreeTrial(userId, request.pairingType);
        await this.prisma.pairingRequest.update({
          where: { uuid: requestUuid },
          data: { freeTrial: true, isPaid: true },
        });
        request.isPaid = true;
        request.freeTrial = true;
      } else {
        throw new BadRequestException('免费次数已用完，请先完成支付');
      }
    }

    // Use Redis lock to prevent double generation
    const lockKey = `pairing:lock:report:${requestUuid}`;
    const locked = await this.redis.get(lockKey);
    if (locked) {
      throw new BadRequestException('报告正在生成中，请稍后查看');
    }
    await this.redis.set(lockKey, '1', 120);

    // Update status to analyzing
    await this.prisma.pairingRequest.update({
      where: { uuid: requestUuid },
      data: { status: 4 },
    });

    try {
      const chartA = request.initiatorChart!;
      const chartB = request.receiverChart!;

      // Calculate compatibility scores
      const scores = await this.calculateCompatibility(
        chartA, chartB, request.pairingType,
      );
      const totalScore = this.weightedAverage(scores, request.pairingType);
      const level = this.getCompatibilityLevel(totalScore);
      const highlights = this.extractHighlights(scores);
      const cautions = this.extractCautions(chartA, chartB);

      // Format charts for AI
      const formatChart = (chart: any) => ({
        year_pillar: { gan: chart.yearGan, zhi: chart.yearZhi },
        month_pillar: { gan: chart.monthGan, zhi: chart.monthZhi },
        day_pillar: { gan: chart.dayGan, zhi: chart.dayZhi },
        hour_pillar: { gan: chart.hourGan, zhi: chart.hourZhi },
        day_master: chart.dayGan,
        day_master_wuxing: GAN_WUXING[chart.dayGan] || '',
        day_master_strength: chart.dayMasterStrength,
        strength_level: chart.strengthLevel,
        pattern_type: chart.patternType,
        pattern_name: chart.patternName,
        yong_shen: chart.yongShen,
        xi_shen: chart.xiShen,
        wuxing_counts: chart.wuxingCounts,
        shensha_list: chart.shenshaList,
        gender: chart.gender,
        dayun_list: chart.dayunList,
      });

      // Generate AI report
      const aiResult = await this.aiService.generateReport({
        module: 'pairing',
        chartData: {
          userA: formatChart(chartA),
          userB: formatChart(chartB),
        },
        ruleResults: {
          pairingType: request.pairingType,
          scores,
          totalScore,
          level,
          highlights,
          cautions,
          tags: [level, request.pairingType],
        },
        reportType: 'pairing',
        isPaid: request.isPaid,
      });

      // Create AnalysisReport - link to initiator's chart as primary
      const report = await this.prisma.analysisReport.create({
        data: {
          userId: request.initiatorId,
          chartId: request.initiatorChartId!,
          reportType: 'pairing',
          ruleResults: { scores, totalScore, level, highlights, cautions, pairingType: request.pairingType } as any,
          ruleScores: scores as any,
          ruleTags: [level, request.pairingType] as any,
          aiProvider: aiResult.provider,
          promptVersion: aiResult.promptVersion,
          aiContent: aiResult.content,
          aiSummary: aiResult.summary,
          aiTokenUsed: aiResult.tokenUsed,
          isPaid: request.isPaid,
        },
      });

      // Link report to pairing request
      await this.prisma.pairingRequest.update({
        where: { uuid: requestUuid },
        data: { reportId: report.id },
      });

      // Create chat sessions based on mode
      if (request.mode === 'self') {
        await this.chatService.createPairingSession(
          report.id,
          request.initiatorId,
          request.pairingType,
        );
      } else {
        await this.chatService.createPairingSessions(
          report.id,
          request.initiatorId,
          request.receiverId,
          request.pairingType,
        );
      }

      // Update status to completed
      await this.prisma.pairingRequest.update({
        where: { uuid: requestUuid },
        data: { status: 5 },
      });

      // Notify user(s)
      const typeLabels: Record<string, string> = {
        personality: '性格匹配',
        career: '事业合作',
        wealth: '财运互补',
        hehun: '合婚分析',
        comprehensive: '综合配对',
      };
      const notifTitle = `${typeLabels[request.pairingType]}报告已生成`;
      const notifBody = `配对得分：${totalScore}分（${level}）`;

      if (request.mode === 'self') {
        await this.pushNotification({
          userId: request.initiatorId,
          type: 'pairing_report_ready',
          title: notifTitle,
          body: notifBody,
          refType: 'report',
          refId: report.uuid,
        });
      } else {
        await Promise.all([
          this.pushNotification({
            userId: request.initiatorId,
            type: 'pairing_report_ready',
            title: notifTitle,
            body: notifBody,
            refType: 'report',
            refId: report.uuid,
          }),
          this.pushNotification({
            userId: request.receiverId,
            type: 'pairing_report_ready',
            title: notifTitle,
            body: notifBody,
            refType: 'report',
            refId: report.uuid,
          }),
        ]);
      }

      // Release Redis lock and invalidate notification caches
      await this.redis.del(`pairing:lock:report:${requestUuid}`);

      return {
        reportId: report.id,
        reportUuid: report.uuid,
        totalScore,
        level,
        dimensionScores: scores,
        content: aiResult.content,
        summary: aiResult.summary,
      };
    } catch (error) {
      // Reset status on failure so users can retry, release lock
      await Promise.all([
        this.prisma.pairingRequest.update({
          where: { uuid: requestUuid },
          data: { status: 3 },
        }),
        this.redis.del(`pairing:lock:report:${requestUuid}`),
      ]);
      throw error;
    }
  }

  // ============ 查询方法 ============

  async getRequest(requestUuid: string, userId: number) {
    const request = await this.prisma.pairingRequest.findUnique({
      where: { uuid: requestUuid },
      include: {
        initiator: {
          select: { id: true, nickname: true, username: true, avatarUrl: true, bio: true },
        },
        receiver: {
          select: { id: true, nickname: true, username: true, avatarUrl: true, bio: true },
        },
        initiatorChart: {
          select: { id: true, name: true, dayGan: true, yearGan: true, yearZhi: true, monthGan: true, monthZhi: true, dayZhi: true, hourGan: true, hourZhi: true, gender: true },
        },
        receiverChart: {
          select: { id: true, name: true, dayGan: true, yearGan: true, yearZhi: true, monthGan: true, monthZhi: true, dayZhi: true, hourGan: true, hourZhi: true, gender: true },
        },
      },
    });

    if (!request) throw new NotFoundException('配对请求不存在');

    if (request.mode === 'self') {
      if (request.initiatorId !== userId) {
        throw new ForbiddenException('无权查看此配对请求');
      }
    } else {
      if (request.initiatorId !== userId && request.receiverId !== userId) {
        throw new ForbiddenException('无权查看此配对请求');
      }
    }

    // If completed, include report info
    let report: {
      uuid: string;
      aiContent: string | null;
      aiSummary: string | null;
      ruleScores: any;
      ruleTags: any;
      ruleResults: any;
      createdAt: Date;
    } | null = null;
    if (request.reportId) {
      report = await this.prisma.analysisReport.findUnique({
        where: { id: request.reportId },
        select: {
          uuid: true,
          aiContent: true,
          aiSummary: true,
          ruleScores: true,
          ruleTags: true,
          ruleResults: true,
          createdAt: true,
        },
      });
    }

    return {
      uuid: request.uuid,
      pairingType: request.pairingType,
      mode: request.mode,
      status: request.status,
      message: request.message,
      initiator: request.initiator,
      receiver: request.receiver,
      initiatorChart: request.initiatorChart,
      receiverChart: request.receiverChart,
      initiatorConfigured: !!request.initiatorChartId,
      receiverConfigured: !!request.receiverChartId,
      isPaid: request.isPaid,
      freeTrial: request.freeTrial,
      orderId: request.orderId,
      report,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  async getIncomingRequests(userId: number, page = 1, size = 20) {
    const skip = (page - 1) * size;
    const [requests, total] = await Promise.all([
      this.prisma.pairingRequest.findMany({
        where: { receiverId: userId, mode: 'social' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
        include: {
          initiator: {
            select: { id: true, nickname: true, username: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.pairingRequest.count({ where: { receiverId: userId, mode: 'social' } }),
    ]);

    return {
      requests: requests.map((r) => ({
        uuid: r.uuid,
        pairingType: r.pairingType,
        status: r.status,
        message: r.message,
        initiator: r.initiator,
        createdAt: r.createdAt,
      })),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async getOutgoingRequests(userId: number, page = 1, size = 20) {
    const skip = (page - 1) * size;
    const [requests, total] = await Promise.all([
      this.prisma.pairingRequest.findMany({
        where: { initiatorId: userId, mode: 'social' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
        include: {
          receiver: {
            select: { id: true, nickname: true, username: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.pairingRequest.count({ where: { initiatorId: userId, mode: 'social' } }),
    ]);

    return {
      requests: requests.map((r) => ({
        uuid: r.uuid,
        pairingType: r.pairingType,
        status: r.status,
        message: r.message,
        receiver: r.receiver,
        createdAt: r.createdAt,
      })),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async getPairingReports(userId: number, page = 1, size = 20) {
    const skip = (page - 1) * size;

    // Find all pairing requests where user is involved AND report has been generated
    const [requests, total] = await Promise.all([
      this.prisma.pairingRequest.findMany({
        where: {
          OR: [
            { initiatorId: userId },
            { receiverId: userId },
          ],
          status: 5,
          reportId: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: size,
        include: {
          initiator: {
            select: { id: true, nickname: true, username: true, avatarUrl: true },
          },
          receiver: {
            select: { id: true, nickname: true, username: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.pairingRequest.count({
        where: {
          OR: [
            { initiatorId: userId },
            { receiverId: userId },
          ],
          status: 5,
          reportId: { not: null },
        },
      }),
    ]);

    // Fetch reports in batch
    const reportIds = requests.map((r) => r.reportId!).filter(Boolean);
    const reports = reportIds.length > 0
      ? await this.prisma.analysisReport.findMany({
          where: { id: { in: reportIds } },
          select: { id: true, uuid: true, aiSummary: true, ruleScores: true, ruleTags: true, createdAt: true },
        })
      : [];
    const reportMap = new Map(reports.map((r) => [r.id, r]));

    return {
      reports: requests.map((r) => {
        const report = reportMap.get(r.reportId!);
        return {
          requestUuid: r.uuid,
          pairingType: r.pairingType,
          initiator: r.initiator,
          receiver: r.receiver,
          report: report ? {
            uuid: report.uuid,
            summary: report.aiSummary,
            scores: report.ruleScores,
            tags: report.ruleTags,
            createdAt: report.createdAt,
          } : null,
          createdAt: r.createdAt,
        };
      }),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  // ============ 支付相关 ============

  async payWithBalance(userId: number, orderId: number, pairingRequestUuid: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.userId !== userId) throw new ForbiddenException('无权操作此订单');
    if (order.status !== 0) throw new BadRequestException('订单状态不允许支付');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    const amount = new Decimal(order.paidAmount);
    if (user.balance.lt(amount)) {
      throw new BadRequestException('余额不足');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: amount },
          totalSpent: { increment: amount },
        },
      });

      await tx.balanceTransaction.create({
        data: {
          userId,
          type: 'payment',
          amount: amount.negated(),
          balanceAfter: user.balance.minus(amount),
          refId: String(orderId),
          refType: 'order',
          remark: '配对报告支付',
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: 1, paymentMethod: 'balance', paidAt: new Date() },
      });

      await tx.pairingRequest.update({
        where: { uuid: pairingRequestUuid },
        data: { isPaid: true },
      });
    });

    return { success: true, message: '支付成功' };
  }

  async getOrderStatus(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, paidAmount: true, paymentMethod: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }

  // ============ 配对算法 ============

  private async calculateCompatibility(chartA: any, chartB: any, pairingType: string): Promise<Record<string, number>> {
    // Try Redis cache first (cache key by chart IDs + pairing type)
    const cacheKey = `pairing:algo:${chartA.id}:${chartB.id}:${pairingType}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Algorithm cache hit: ${cacheKey}`);
      return JSON.parse(cached);
    }

    let scores: Record<string, number>;
    switch (pairingType) {
      case 'personality': scores = this.calcPersonality(chartA, chartB); break;
      case 'career': scores = this.calcCareer(chartA, chartB); break;
      case 'wealth': scores = this.calcWealth(chartA, chartB); break;
      case 'hehun': scores = this.calcHehun(chartA, chartB); break;
      case 'comprehensive': scores = this.calcComprehensive(chartA, chartB); break;
      default: scores = this.calcComprehensive(chartA, chartB);
    }

    // Cache for 1 hour (chart data doesn't change)
    await this.redis.set(cacheKey, JSON.stringify(scores), 3600);
    return scores;
  }

  private calcPersonality(chartA: any, chartB: any): Record<string, number> {
    const scores: Record<string, number> = {};

    // 日主五行和谐度
    const wxA = GAN_WUXING[chartA.dayGan];
    const wxB = GAN_WUXING[chartB.dayGan];
    if (WUXING_SHENG[wxA] === wxB || WUXING_SHENG[wxB] === wxA) {
      scores['日主相生'] = 90;
    } else if (wxA === wxB) {
      scores['日主相同'] = 75;
    } else if (WUXING_KE[wxA] === wxB || WUXING_KE[wxB] === wxA) {
      scores['日主相克'] = 40;
    } else {
      scores['日主关系'] = 60;
    }

    // 日主强弱互补
    const strA = chartA.dayMasterStrength || 50;
    const strB = chartB.dayMasterStrength || 50;
    const diff = Math.abs(strA - strB);
    if (diff < 15) scores['强弱平衡'] = 80;
    else if (diff < 30) scores['强弱平衡'] = 65;
    else scores['强弱平衡'] = 50;

    // 十神配置
    scores['十神和谐'] = this.evaluateTenGodHarmony(chartA, chartB);

    return scores;
  }

  private calcCareer(chartA: any, chartB: any): Record<string, number> {
    const scores: Record<string, number> = {};

    // 格局互补
    if (chartA.patternType && chartB.patternType) {
      if (chartA.patternType === chartB.patternType) {
        scores['格局协同'] = 80;
      } else {
        scores['格局互补'] = 65;
      }
    } else {
      scores['格局匹配'] = 60;
    }

    // 用神配合
    const yongA = chartA.yongShen;
    const yongB = chartB.yongShen;
    if (yongA && yongB) {
      if (WUXING_SHENG[yongA] === yongB) scores['用神相生'] = 90;
      else if (yongA === yongB) scores['用神一致'] = 85;
      else if (WUXING_SHENG[yongB] === yongA) scores['用神互补'] = 80;
      else scores['用神关系'] = 55;
    } else {
      scores['用神匹配'] = 60;
    }

    // 大运协作
    scores['大运同步'] = this.evaluateDayunSync(chartA, chartB);

    return scores;
  }

  private calcWealth(chartA: any, chartB: any): Record<string, number> {
    const scores: Record<string, number> = {};

    // 五行财运分析
    const wxScoreA = chartA.wuxingScore || {};
    const wxScoreB = chartB.wuxingScore || {};
    const wxA = GAN_WUXING[chartA.dayGan];
    const wxB = GAN_WUXING[chartB.dayGan];

    // 财星互补（日主所克为财）
    const caiXingA = WUXING_KE[wxA]; // A的财星
    const caiXingB = WUXING_KE[wxB]; // B的财星
    const caiScoreA = parseFloat(wxScoreA[caiXingA]) || 50;
    const caiScoreB = parseFloat(wxScoreB[caiXingB]) || 50;
    scores['财星力量'] = Math.round((caiScoreA + caiScoreB) / 2);

    // 五行流通互补
    if (WUXING_SHENG[wxA] === wxB || WUXING_SHENG[wxB] === wxA) {
      scores['五行流通'] = 85;
    } else if (wxA === wxB) {
      scores['五行协同'] = 70;
    } else {
      scores['五行关系'] = 55;
    }

    // 大运财运同步
    scores['财运同步'] = this.evaluateDayunSync(chartA, chartB);

    return scores;
  }

  private calcHehun(chartA: any, chartB: any): Record<string, number> {
    const scores: Record<string, number> = {};

    // 日主天合
    scores['日主天合'] = GAN_HE[chartA.dayGan] === chartB.dayGan ? 95 : 50;

    // 五行互补
    const wxA = GAN_WUXING[chartA.dayGan];
    const wxB = GAN_WUXING[chartB.dayGan];
    if (WUXING_SHENG[wxA] === wxB || WUXING_SHENG[wxB] === wxA) {
      scores['五行互补'] = 85;
    } else if (wxA === wxB) {
      scores['五行相同'] = 65;
    } else {
      scores['五行差异'] = 50;
    }

    // 地支六合
    let hexCount = 0;
    const zhiA = [chartA.yearZhi, chartA.monthZhi, chartA.dayZhi, chartA.hourZhi].filter(Boolean);
    const zhiB = [chartB.yearZhi, chartB.monthZhi, chartB.dayZhi, chartB.hourZhi].filter(Boolean);
    for (const za of zhiA) {
      for (const zb of zhiB) {
        if (ZHI_LIU_HE[za] === zb) hexCount++;
      }
    }
    scores['地支六合'] = Math.min(95, 50 + hexCount * 15);

    // 冲克检查
    let clashCount = 0;
    for (const za of zhiA) {
      for (const zb of zhiB) {
        if (ZHI_LIU_CHONG[za] === zb) clashCount++;
      }
    }
    scores['冲克程度'] = Math.max(20, 90 - clashCount * 25);

    // 大运同步
    scores['大运同步'] = this.evaluateDayunSync(chartA, chartB);

    return scores;
  }

  private calcComprehensive(chartA: any, chartB: any): Record<string, number> {
    const personality = this.calcPersonality(chartA, chartB);
    const career = this.calcCareer(chartA, chartB);
    const wealth = this.calcWealth(chartA, chartB);
    const hehun = this.calcHehun(chartA, chartB);

    return {
      性格匹配: this.simpleAverage(personality),
      事业合作: this.simpleAverage(career),
      财运互补: this.simpleAverage(wealth),
      合婚指数: this.simpleAverage(hehun),
    };
  }

  private evaluateTenGodHarmony(chartA: any, chartB: any): number {
    // Simplified: compare dayMaster relationship via tenGods
    const wxA = GAN_WUXING[chartA.dayGan];
    const wxB = GAN_WUXING[chartB.dayGan];
    if (WUXING_SHENG[wxA] === wxB) return 85;
    if (WUXING_SHENG[wxB] === wxA) return 80;
    if (wxA === wxB) return 70;
    return 55;
  }

  private evaluateDayunSync(chartA: any, chartB: any): number {
    const strA = chartA.dayMasterStrength || 50;
    const strB = chartB.dayMasterStrength || 50;
    const diff = Math.abs(strA - strB);
    if (diff < 15) return 80;
    if (diff < 30) return 65;
    return 50;
  }

  private simpleAverage(scores: Record<string, number>): number {
    const values = Object.values(scores);
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  private weightedAverage(scores: Record<string, number>, pairingType: string): number {
    const weights: Record<string, Record<string, number>> = {
      personality: { '日主相生': 0.30, '日主相同': 0.30, '日主相克': 0.30, '日主关系': 0.30, '强弱平衡': 0.40, '十神和谐': 0.30 },
      career: { '格局协同': 0.25, '格局互补': 0.25, '格局匹配': 0.25, '用神相生': 0.30, '用神一致': 0.30, '用神互补': 0.30, '用神关系': 0.30, '用神匹配': 0.30, '大运同步': 0.20 },
      wealth: { '财星力量': 0.35, '五行流通': 0.30, '五行协同': 0.30, '五行关系': 0.30, '财运同步': 0.20 },
      hehun: { '日主天合': 0.30, '五行互补': 0.25, '五行相同': 0.25, '五行差异': 0.25, '地支六合': 0.20, '冲克程度': 0.15, '大运同步': 0.10 },
      comprehensive: { '性格匹配': 0.25, '事业合作': 0.25, '财运互补': 0.25, '合婚指数': 0.25 },
    };

    const typeWeights = weights[pairingType] || weights.comprehensive;
    let total = 0;
    let weightSum = 0;

    for (const [key, score] of Object.entries(scores)) {
      const w = typeWeights[key] || 0.15;
      total += score * w;
      weightSum += w;
    }

    return Math.round(weightSum > 0 ? total / weightSum : 50);
  }

  private getCompatibilityLevel(score: number): string {
    if (score >= 85) return '天作之合';
    if (score >= 70) return '良缘佳配';
    if (score >= 55) return '尚可磨合';
    return '需慎重考虑';
  }

  private extractHighlights(scores: Record<string, number>): string[] {
    const highlights: string[] = [];
    const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    for (const [key, score] of entries) {
      if (score >= 80) highlights.push(`${key}得分较高(${score}分)`);
    }
    return highlights.slice(0, 3);
  }

  private extractCautions(chartA: any, chartB: any): string[] {
    const cautions: string[] = [];
    const zhiA = [chartA.yearZhi, chartA.monthZhi, chartA.dayZhi, chartA.hourZhi].filter(Boolean);
    const zhiB = [chartB.yearZhi, chartB.monthZhi, chartB.dayZhi, chartB.hourZhi].filter(Boolean);
    let clashCount = 0;
    for (const za of zhiA) {
      for (const zb of zhiB) {
        if (ZHI_LIU_CHONG[za] === zb) {
          clashCount++;
          cautions.push(`${za}${zb}相冲`);
        }
      }
    }
    return cautions.slice(0, 3);
  }
}
