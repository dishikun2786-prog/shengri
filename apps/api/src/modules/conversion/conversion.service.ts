import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';

interface FollowUpScript {
  day: number;
  type: string;
  content: string;
  productId?: number;
}

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);

  private readonly SOP_TEMPLATES: FollowUpScript[] = [
    {
      day: 0,
      type: 'welcome',
      content: '欢迎关注生日命理！我已经为您查看了命盘，发现了一些很有意思的特征...',
    },
    {
      day: 1,
      type: 'curiosity_hook',
      content: '您的命盘有个很特别的地方：{{unique_feature}}。这在我分析过的命盘中并不多见。',
    },
    {
      day: 3,
      type: 'lead_product',
      content: '限时福利：9.9元即可获取您的专属命盘分析报告（原价19.9元）。包含性格特点、近期运势等1000字深度解读。',
      productId: 2,
    },
    {
      day: 7,
      type: 'targeted_product',
      content: '根据您的命盘特征，{{targeted_analysis}}。想了解详细分析？本周享受专属优惠。',
    },
    {
      day: 14,
      type: 'social_product',
      content: '很多用户在购买了个人分析后，还会做合婚/合伙人匹配分析。您身边有想了解的人吗？',
    },
    {
      day: 30,
      type: 'monthly_reminder',
      content: '{{month}}月运势提醒：根据您的命盘，这个月{{monthly_fortune}}。需要详细的月度运势分析吗？',
    },
  ];

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async createConversionTask(params: {
    userId: number;
    triggerType: string;
    triggerDetail?: any;
    productId?: number;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
    });
    if (!user) return;

    const chart = await this.prisma.baziChart.findFirst({
      where: { userId: params.userId, isPrimary: true },
    });

    let content = '';
    const template = this.SOP_TEMPLATES.find(
      (t) => t.type === params.triggerType,
    );

    if (template) {
      content = this.fillTemplate(template.content, user, chart);
    }

    const log = await this.prisma.autoConversionLog.create({
      data: {
        userId: params.userId,
        triggerType: params.triggerType,
        triggerDetail: params.triggerDetail || {},
        contentType: 'wechat',
        content,
        productId: params.productId || template?.productId,
        aiGenerated: false,
        scheduledAt: new Date(),
      },
    });

    return log;
  }

  async generateAiFollowUp(userId: number, context: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    const chart = await this.prisma.baziChart.findFirst({
      where: { userId, isPrimary: true },
    });

    const result = await this.aiService.generateReport({
      module: 'follow_up',
      chartData: chart,
      ruleResults: { context, userSpent: user?.totalSpent },
      reportType: 'follow_up',
      isPaid: false,
      userId,
    });

    return {
      script: result.content,
      suggestedProduct: this.suggestProduct(user, chart),
    };
  }

  async getConversionStats(userId?: number) {
    const where = userId ? { userId } : {};
    const total = await this.prisma.autoConversionLog.count({ where });
    const delivered = await this.prisma.autoConversionLog.count({
      where: { ...where, delivered: true },
    });
    const converted = await this.prisma.autoConversionLog.count({
      where: { ...where, converted: true },
    });

    return {
      total,
      delivered,
      converted,
      deliveryRate: total > 0 ? (delivered / total * 100).toFixed(1) : '0',
      conversionRate: delivered > 0 ? (converted / delivered * 100).toFixed(1) : '0',
    };
  }

  async processScheduledTasks() {
    const pendingTasks = await this.prisma.autoConversionLog.findMany({
      where: {
        delivered: false,
        scheduledAt: { lte: new Date() },
      },
      take: 100,
    });

    for (const task of pendingTasks) {
      try {
        // TODO: Integrate with WeChat Work API / SMS / Push
        await this.prisma.autoConversionLog.update({
          where: { id: task.id },
          data: { delivered: true, deliveredAt: new Date() },
        });
      } catch (e) {
        this.logger.error(`Failed to deliver task ${task.id}: ${e.message}`);
      }
    }

    return { processed: pendingTasks.length };
  }

  private fillTemplate(template: string, user: any, chart: any): string {
    let content = template;
    if (chart) {
      content = content.replace('{{unique_feature}}',
        `日主${chart.dayGan}${chart.strengthLevel ? `(${chart.strengthLevel})` : ''}`);

      const identity = user?.identityType;
      const targetedText = identity === 1
        ? '您的命盘显示有企业家特质，财运方面有独到的见解'
        : '您的命盘显示近期运势有新的转机';
      content = content.replace('{{targeted_analysis}}', targetedText);
    }
    content = content.replace('{{month}}', String(new Date().getMonth() + 1));
    content = content.replace('{{monthly_fortune}}', '整体运势平稳，适合稳步推进计划');
    return content;
  }

  private suggestProduct(user: any, chart: any): string {
    const spent = Number(user?.totalSpent || 0);
    if (spent === 0) return 'BASIC_REPORT_9';
    if (spent < 100) return 'WEALTH_REPORT';
    if (spent < 500) return 'ANNUAL_FORTUNE';
    return 'FULL_ANALYSIS';
  }
}
