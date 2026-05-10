import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RuleEngineService } from '../rule-engine/rule-engine.service';
import { AiService } from '../ai/ai.service';
import { TokenService } from '../token/token.service';
import { DigitalEnergyCalculatorService } from '../../common/digital-energy/digital-energy-calculator.service';
import { CalculateDto, GenerateReportDto } from './digital-energy.dto';

@Injectable()
export class DigitalEnergyService {
  private readonly logger = new Logger(DigitalEnergyService.name);

  constructor(
    private prisma: PrismaService,
    private ruleEngine: RuleEngineService,
    private aiService: AiService,
    private tokenService: TokenService,
    private calculator: DigitalEnergyCalculatorService,
  ) {}

  calculate(dto: CalculateDto, userId?: number) {
    const result = this.calculator.analyze(dto.phone);

    // Save record if logged in
    let recordUuid: string | null = null;
    if (userId) {
      this.prisma.digitalEnergyRecord.create({
        data: {
          userId,
          phone: result.phone,
          stars: result.groups as any,
          lastFourAnalysis: result.lastFour as any,
          stats: result.stats as any,
          question: dto.question || null,
        },
      }).then(r => { recordUuid = r.uuid; }).catch(err => {
        this.logger.warn(`保存数字能量记录失败: ${err.message}`);
      });
    }

    return { ...result, recordUuid, question: dto.question || null };
  }

  async generateReport(dto: GenerateReportDto, userId: number) {
    const result = this.calculator.analyze(dto.phone);

    // Check for duplicate within 5 min
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingRecord = await this.prisma.digitalEnergyRecord.findFirst({
      where: { userId, phone: result.phone, createdAt: { gt: fiveMinutesAgo } },
      orderBy: { createdAt: 'desc' },
      include: { reports: { take: 1, orderBy: { createdAt: 'desc' } } },
    });

    if (existingRecord && existingRecord.reports.length > 0) {
      const existingReport = existingRecord.reports[0];
      return {
        id: existingReport.id, uuid: existingReport.uuid, reportType: 'digital_energy',
        content: dto.isPaid ? (existingReport.aiContent || '') : this.truncateForFree(existingReport.aiContent || ''),
        summary: existingReport.aiSummary || '', ruleScores: existingReport.ruleScores,
        ruleTags: existingReport.ruleTags, isPaid: dto.isPaid || false, result,
      };
    }

    // Save record
    const record = await this.prisma.digitalEnergyRecord.create({
      data: {
        userId, phone: result.phone,
        stars: result.groups as any, lastFourAnalysis: result.lastFour as any,
        stats: result.stats as any, question: dto.question || null,
      },
    });

    // Rule engine
    const chartData = {
      phone: result.phone, groups: result.groups, ...result.stats,
    };
    let ruleResults;
    try {
      ruleResults = await this.ruleEngine.analyze(chartData, ['digital_energy']);
    } catch (err) {
      this.logger.warn(`规则引擎失败: ${err.message}`);
      ruleResults = { tags: [], scores: {}, texts: [] };
    }

    // AI generation
    let aiResult;
    try {
      aiResult = await this.aiService.generateReport({
        module: 'digital_energy',
        chartData: {
          phone: result.phone,
          last_four: result.lastFour.map(g => `${g.pair}(${g.star})`).join(' '),
          stars: result.groups.map(g => `${g.pair}:${g.star}(${g.luck})`).join('\n'),
          star_list: result.groups.map(g => g.star).join('、'),
          last_four_stars: result.lastFour.map(g => g.star).join('、'),
          dominant_star: result.stats.dominantStar,
          lucky_percent: result.stats.luckyPercent,
          lucky_count: result.stats.luckyCount,
          unlucky_count: result.stats.unluckyCount,
          wuxing_dist: JSON.stringify(result.stats.wuxingDistribution),
          has_special: result.hasSpecialZero || result.hasSpecialFive ? 'true' : '',
          special_digits: result.specialDigits.map(d => `位置${d.position}:${d.digit}(${d.meaning})`).join('; '),
          zero_analysis: result.zeroAnalysis,
          five_analysis: result.fiveAnalysis,
          zero_count: String(result.stats.zeroCount),
          five_count: String(result.stats.fiveCount),
          zero_pairs: String(result.stats.zeroPairs),
          five_pairs: String(result.stats.fivePairs),
          summary: result.summary,
          suggestion: result.suggestion,
          user_question: dto.question || '',
          has_question: !!dto.question,
          rule_texts: (ruleResults as any)?.texts?.join('\n') || '',
        },
        ruleResults, healthData: null, reportType: 'digital_energy',
        isPaid: dto.isPaid || false, userId,
      });
    } catch (err: any) {
      this.logger.error(`AI生成失败: ${err.message}`, err.stack);
      throw new BadRequestException('AI报告生成失败，请稍后重试');
    }

    this.logger.log(`AI完成: provider=${aiResult.provider}, tokens=${aiResult.tokenUsed}`);

    this.tokenService.trackOnly({
      userId, provider: aiResult.provider, model: aiResult.model,
      source: 'report', sourceRefId: record.id.toString(),
      inputTokens: 0, outputTokens: aiResult.tokenUsed,
    }).catch(err => this.logger.warn(`Token记录失败: ${err.message}`));

    const report = await this.prisma.analysisReport.create({
      data: {
        userId, chartId: null, deRecordId: record.id,
        reportType: 'digital_energy', productId: dto.productId, orderId: dto.orderId,
        ruleResults: ruleResults as any, ruleScores: (ruleResults as any)?.scores || {},
        ruleTags: (ruleResults as any)?.tags || [],
        aiProvider: aiResult.provider, promptVersion: aiResult.promptVersion,
        aiContent: aiResult.content, aiSummary: aiResult.summary,
        aiTokenUsed: aiResult.tokenUsed, aiCost: 0, upsellHook: aiResult.upsellHook,
        isPaid: dto.isPaid || false,
      },
    });

    return {
      id: report.id, uuid: report.uuid, reportType: 'digital_energy',
      content: dto.isPaid ? aiResult.content : this.truncateForFree(aiResult.content),
      summary: aiResult.summary, ruleScores: (ruleResults as any)?.scores || {},
      ruleTags: (ruleResults as any)?.tags || [], upsellHook: aiResult.upsellHook,
      isPaid: dto.isPaid || false, result,
    };
  }

  async getReport(uuid: string, userId?: number) {
    const report = await this.prisma.analysisReport.findUnique({
      where: { uuid }, include: { deRecord: true },
    });
    if (!report) throw new NotFoundException('报告不存在');
    if (userId && report.userId !== userId) throw new ForbiddenException('无权限');
    await this.prisma.analysisReport.update({ where: { id: report.id }, data: { viewCount: { increment: 1 } } });
    if (!report.isPaid) {
      const upgradeProduct = await this.prisma.product.findFirst({
        where: { reportType: 'digital_energy', currentPrice: { gt: 0 }, isActive: true },
        orderBy: { currentPrice: 'asc' }, select: { id: true, name: true, currentPrice: true },
      });
      return { ...report, aiContent: this.truncateForFree(report.aiContent || ''), locked: true, upgradeProduct: upgradeProduct || null };
    }
    return report;
  }

  async getHistory(userId: number, skip = 0, take = 20) {
    const [records, total] = await Promise.all([
      this.prisma.digitalEnergyRecord.findMany({
        where: { userId }, orderBy: { createdAt: 'desc' }, skip, take,
        include: { reports: { take: 1, orderBy: { createdAt: 'desc' } } },
      }),
      this.prisma.digitalEnergyRecord.count({ where: { userId } }),
    ]);
    return {
      records: records.map(r => ({
        id: r.id, uuid: r.uuid, phone: r.phone, stars: r.stars, stats: r.stats,
        question: r.question, createdAt: r.createdAt,
        reportUuid: r.reports[0]?.uuid || null, isPaid: r.reports[0]?.isPaid || false,
      })), total,
    };
  }

  async deleteRecord(userId: number, id: number) {
    const record = await this.prisma.digitalEnergyRecord.findFirst({ where: { id, userId } });
    if (!record) throw new NotFoundException('记录不存在');
    await this.prisma.analysisReport.deleteMany({ where: { deRecordId: id } });
    await this.prisma.digitalEnergyRecord.delete({ where: { id } });
    return { success: true };
  }

  private truncateForFree(content: string): string {
    try {
      const parsed = JSON.parse(content);
      if (parsed?.sections) {
        return JSON.stringify({
          ...parsed,
          sections: parsed.sections.map((s: any, i: number) => i < 1 ? s : { title: s.title, content: '解锁查看详情...' }),
          summary: '',
        });
      }
    } catch {}
    return content.slice(0, Math.ceil(content.length * 0.3)) + '\n...解锁完整报告...';
  }
}
