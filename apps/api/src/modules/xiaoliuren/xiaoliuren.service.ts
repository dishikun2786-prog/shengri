import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RuleEngineService } from '../rule-engine/rule-engine.service';
import { AiService } from '../ai/ai.service';
import { TokenService } from '../token/token.service';
import { XiaoliurenCalculatorService } from '../../common/xiaoliuren/xiaoliuren-calculator.service';
import { CalculateDto, GenerateReportDto } from './xiaoliuren.dto';

@Injectable()
export class XiaoliurenService {
  private readonly logger = new Logger(XiaoliurenService.name);

  constructor(
    private prisma: PrismaService,
    private ruleEngine: RuleEngineService,
    private aiService: AiService,
    private tokenService: TokenService,
    private calculator: XiaoliurenCalculatorService,
  ) {}

  /** 执行小六壬推算（公开，登录后自动保存记录） */
  async calculate(dto: CalculateDto, userId?: number) {
    let calcResult;
    let inputDetail: any;

    if (dto.inputType === 'time') {
      const month = dto.month || new Date().getMonth() + 1;
      const day = dto.day || new Date().getDate();
      const hour = dto.hour ?? new Date().getHours();

      calcResult = this.calculator.calculateByTime(month, day, hour);
      inputDetail = {
        month,
        day,
        hour,
        hourBranch: this.calculator.hourToBranchName(hour),
      };
    } else {
      const r1 = dto.random1 || Math.ceil(Math.random() * 6);
      const r2 = dto.random2 || Math.ceil(Math.random() * 6);
      const r3 = dto.random3 || Math.ceil(Math.random() * 6);

      calcResult = this.calculator.calculateByRandom(r1, r2, r3);
      inputDetail = { r1, r2, r3 };
    }

    // 登录用户自动保存记录
    let recordUuid: string | null = null;
    if (userId) {
      try {
        const record = await this.prisma.xiaoliurenRecord.create({
          data: {
            userId,
            inputType: dto.inputType,
            inputDetail: inputDetail as any,
            resultPosition: calcResult.result.position,
            resultName: calcResult.result.name,
            question: dto.question || null,
          },
        });
        recordUuid = record.uuid;
      } catch (err) {
        this.logger.warn(`保存小六壬记录失败: ${err.message}`);
      }
    }

    return {
      ...calcResult,
      inputDetail,
      question: dto.question || null,
      recordUuid,
    };
  }

  /** 生成AI解读报告（需认证） */
  async generateReport(dto: GenerateReportDto, userId: number) {
    // 1. 执行推算
    let calcResult;
    let inputDetail: any;

    if (dto.inputType === 'time') {
      const month = dto.month || new Date().getMonth() + 1;
      const day = dto.day || new Date().getDate();
      const hour = dto.hour ?? new Date().getHours();
      calcResult = this.calculator.calculateByTime(month, day, hour);
      inputDetail = { month, day, hour, hourBranch: this.calculator.hourToBranchName(hour) };
    } else {
      const r1 = dto.random1 || Math.ceil(Math.random() * 6);
      const r2 = dto.random2 || Math.ceil(Math.random() * 6);
      const r3 = dto.random3 || Math.ceil(Math.random() * 6);
      calcResult = this.calculator.calculateByRandom(r1, r2, r3);
      inputDetail = { r1, r2, r3 };
    }

    const finalResult = calcResult.result;

    // 2. 防并发：检查5分钟内是否有相同推算的报告
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingRecord = await this.prisma.xiaoliurenRecord.findFirst({
      where: {
        userId,
        inputType: dto.inputType,
        resultPosition: finalResult.position,
        createdAt: { gt: fiveMinutesAgo },
      },
      orderBy: { createdAt: 'desc' },
      include: { reports: { take: 1, orderBy: { createdAt: 'desc' } } },
    });

    if (existingRecord && existingRecord.reports.length > 0) {
      const existingReport = existingRecord.reports[0];
      this.logger.log(`发现已有报告，跳过生成: recordId=${existingRecord.id}`);
      return {
        id: existingReport.id,
        uuid: existingReport.uuid,
        reportType: 'xiaoliuren',
        content: dto.isPaid ? (existingReport.aiContent || '') : this.truncateForFree(existingReport.aiContent || ''),
        summary: existingReport.aiSummary || '',
        ruleScores: existingReport.ruleScores,
        ruleTags: existingReport.ruleTags,
        upsellHook: existingReport.upsellHook || '',
        isPaid: dto.isPaid || false,
        palmResult: calcResult,
      };
    }

    // 3. 保存占卜记录
    const record = await this.prisma.xiaoliurenRecord.create({
      data: {
        userId,
        inputType: dto.inputType,
        inputDetail: inputDetail as any,
        resultPosition: finalResult.position,
        resultName: finalResult.name,
        question: dto.question || null,
      },
    });

    // 4. 运行规则引擎（轻量规则）
    const chartData = {
      resultPosition: finalResult.position,
      resultName: finalResult.name,
      resultWuxing: finalResult.wuxing,
      resultLuckLevel: finalResult.luckLevel,
      ...finalResult,
    };

    let ruleResults;
    try {
      ruleResults = await this.ruleEngine.analyze(chartData, ['xiaoliuren']);
    } catch (err) {
      this.logger.warn(`规则引擎分析失败（降级）: ${err.message}`);
      ruleResults = { tags: [], scores: {}, texts: [] };
    }

    // 5. AI生成解读
    let aiResult;
    try {
      aiResult = await this.aiService.generateReport({
        module: 'xiaoliuren',
        chartData: {
          ...chartData,
          input_type: dto.inputType,
          month: dto.month,
          day: dto.day,
          hour_branch: dto.inputType === 'time' ? this.calculator.hourToBranchName(dto.hour ?? new Date().getHours()) : null,
          random1: dto.random1,
          random2: dto.random2,
          random3: dto.random3,
          palm_name: finalResult.name,
          palm_position: finalResult.position,
          palm_wuxing: finalResult.wuxing,
          palm_luck_level: finalResult.luckLevel,
          palm_direction: finalResult.direction,
          palm_detailed_text: finalResult.detailedText,
          user_question: dto.question || '',
          has_question: !!dto.question,
          rule_texts: (ruleResults as any)?.texts?.join('\n') || '',
        },
        ruleResults,
        healthData: null,
        reportType: 'xiaoliuren',
        isPaid: dto.isPaid || false,
        userId,
      });
    } catch (err: any) {
      this.logger.error(`AI生成报告失败: ${err.message}`, err.stack);
      throw new BadRequestException('AI报告生成失败，请稍后重试');
    }

    this.logger.log(`AI生成完成: provider=${aiResult.provider}, tokenUsed=${aiResult.tokenUsed}`);

    // 6. 记录Token消耗
    this.tokenService.trackOnly({
      userId,
      provider: aiResult.provider,
      model: aiResult.model,
      source: 'report',
      sourceRefId: record.id.toString(),
      inputTokens: 0,
      outputTokens: aiResult.tokenUsed,
    }).catch(err => this.logger.warn(`Token记录失败: ${err.message}`));

    // 7. 创建报告
    const report = await this.prisma.analysisReport.create({
      data: {
        userId,
        chartId: null,
        xlrRecordId: record.id,
        reportType: 'xiaoliuren',
        productId: dto.productId,
        orderId: dto.orderId,
        ruleResults: ruleResults as any,
        ruleScores: (ruleResults as any)?.scores || {},
        ruleTags: (ruleResults as any)?.tags || [],
        aiProvider: aiResult.provider,
        promptVersion: aiResult.promptVersion,
        aiContent: aiResult.content,
        aiSummary: aiResult.summary,
        aiTokenUsed: aiResult.tokenUsed,
        aiCost: 0,
        upsellHook: aiResult.upsellHook,
        isPaid: dto.isPaid || false,
      },
    });

    this.logger.log(`小六壬报告创建成功: id=${report.id}, uuid=${report.uuid}`);

    return {
      id: report.id,
      uuid: report.uuid,
      reportType: 'xiaoliuren',
      content: dto.isPaid ? aiResult.content : this.truncateForFree(aiResult.content),
      summary: aiResult.summary,
      ruleScores: (ruleResults as any)?.scores || {},
      ruleTags: (ruleResults as any)?.tags || [],
      upsellHook: aiResult.upsellHook,
      isPaid: dto.isPaid || false,
      palmResult: calcResult,
    };
  }

  /** 获取报告 */
  async getReport(uuid: string, userId?: number) {
    const report = await this.prisma.analysisReport.findUnique({
      where: { uuid },
      include: { xlrRecord: true },
    });

    if (!report) throw new NotFoundException('报告不存在');
    if (userId && report.userId !== userId) {
      throw new ForbiddenException('无权限访问该报告');
    }

    await this.prisma.analysisReport.update({
      where: { id: report.id },
      data: { viewCount: { increment: 1 } },
    });

    if (!report.isPaid) {
      const upgradeProduct = await this.prisma.product.findFirst({
        where: {
          reportType: 'xiaoliuren',
          currentPrice: { gt: 0 },
          isActive: true,
        },
        orderBy: { currentPrice: 'asc' },
        select: { id: true, name: true, currentPrice: true },
      });

      return {
        ...report,
        aiContent: this.truncateForFree(report.aiContent || ''),
        locked: true,
        upgradeProduct: upgradeProduct
          ? { id: upgradeProduct.id, name: upgradeProduct.name, price: upgradeProduct.currentPrice }
          : null,
      };
    }

    return report;
  }

  /** 获取用户占卜历史 */
  async getHistory(userId: number, skip = 0, take = 20) {
    const [records, total] = await Promise.all([
      this.prisma.xiaoliurenRecord.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { reports: { take: 1, orderBy: { createdAt: 'desc' } } },
      }),
      this.prisma.xiaoliurenRecord.count({ where: { userId } }),
    ]);

    return {
      records: records.map(r => ({
        id: r.id,
        uuid: r.uuid,
        inputType: r.inputType,
        inputDetail: r.inputDetail,
        resultPosition: r.resultPosition,
        resultName: r.resultName,
        question: r.question,
        createdAt: r.createdAt,
        reportUuid: r.reports[0]?.uuid || null,
        isPaid: r.reports[0]?.isPaid || false,
      })),
      total,
    };
  }

  /** 删除用户占卜记录（硬删除，同时删除关联报告） */
  async deleteRecord(userId: number, id: number) {
    const record = await this.prisma.xiaoliurenRecord.findFirst({ where: { id, userId } });
    if (!record) throw new NotFoundException('记录不存在');
    await this.prisma.analysisReport.deleteMany({ where: { xlrRecordId: id } });
    await this.prisma.xiaoliurenRecord.delete({ where: { id } });
    return { success: true };
  }

  private truncateForFree(content: string): string {
    try {
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.sections)) {
        const FREE_VISIBLE_SECTIONS = 1;
        const truncated = {
          ...parsed,
          sections: parsed.sections.map((sec: any, i: number) => {
            if (i < FREE_VISIBLE_SECTIONS) return sec;
            return {
              title: sec.title,
              score: sec.score,
              content: '解锁完整报告查看详细AI解读...',
              highlights: [],
            };
          }),
          summary: '',
        };
        return JSON.stringify(truncated);
      }
    } catch {
      // not JSON, fall through
    }
    const lines = content.split('\n');
    const showLines = Math.ceil(lines.length * 0.3);
    return lines.slice(0, showLines).join('\n') + '\n\n... 更多精彩内容请解锁完整报告 ...';
  }
}
