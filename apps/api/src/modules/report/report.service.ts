import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Mem0Service } from '../../common/mem0/mem0.service';
import { BaziService } from '../bazi/bazi.service';
import { RuleEngineService } from '../rule-engine/rule-engine.service';
import { AiService } from '../ai/ai.service';
import { WuyunliuqiService } from '../health/wuyunliuqi.service';
import { TokenService } from '../token/token.service';
import { MangpaiCalculatorService } from '../../common/mangpai/mangpai-calculator.service';
import { buildProfileMemory, buildRuleSummary, getExpirationDate } from '../chat/memory-builder';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private prisma: PrismaService,
    private baziService: BaziService,
    private ruleEngine: RuleEngineService,
    private aiService: AiService,
    private wuyunliuqiService: WuyunliuqiService,
    private tokenService: TokenService,
    private mem0: Mem0Service,
    private mangpai: MangpaiCalculatorService,
  ) {}

  async generateReport(params: {
    userId: number;
    chartId: number;
    reportType: string;
    isPaid: boolean;
    orderId?: number;
    productId?: number;
  }) {
    this.logger.log(`开始生成报告: chartId=${params.chartId}, reportType=${params.reportType}, isPaid=${params.isPaid}`);

    try {
      // 1. 验证命盘
      const chart = await this.baziService.getChart(params.chartId);
      if (!chart) throw new NotFoundException('命盘不存在');
      if (chart.userId !== params.userId) {
        throw new ForbiddenException('无权限生成该命盘报告');
      }

      // 2. 检查是否已有相同类型的未处理报告（防止并发）
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const existingReport = await this.prisma.analysisReport.findFirst({
        where: {
          chartId: params.chartId,
          reportType: params.reportType,
          isPaid: params.isPaid,
          createdAt: { gt: fiveMinutesAgo },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingReport) {
        this.logger.log(`发现已有报告，跳过生成: id=${existingReport.id}, uuid=${existingReport.uuid}`);
        return {
          id: existingReport.id,
          uuid: existingReport.uuid,
          reportType: params.reportType,
          content: params.isPaid ? (existingReport.aiContent || '') : this.truncateForFree(existingReport.aiContent || ''),
          summary: existingReport.aiSummary || '',
          ruleScores: existingReport.ruleScores,
          ruleTags: existingReport.ruleTags,
          upsellHook: existingReport.upsellHook || '',
          isPaid: params.isPaid,
        };
      }

      // 3. 执行分析
      const chartData = this.enrichWithMangpai(this.chartToAnalysisData(chart));

      const mangpaiModules = ['mangpai_work', 'mangpai_power', 'mangpai_body_guest', 'mangpai_tengods_direct', 'mangpai_shensha'];
      const moduleMap: Record<string, string[]> = {
        'free': ['ten_gods', 'pattern', 'yongshen', ...mangpaiModules],
        'wealth': ['ten_gods', 'pattern', 'yongshen', 'wealth', 'dayun', ...mangpaiModules],
        'marriage': ['ten_gods', 'pattern', 'yongshen', 'hehun', 'dayun', ...mangpaiModules, 'mangpai_marriage'],
        'career': ['ten_gods', 'pattern', 'yongshen', 'dayun', 'wealth', ...mangpaiModules, 'mangpai_career'],
        'annual': ['ten_gods', 'dayun', 'liunian', 'wealth', 'risk', ...mangpaiModules],
        'partner': ['ten_gods', 'pattern', 'partner', ...mangpaiModules],
        'enterprise': ['ten_gods', 'pattern', 'wealth', 'dayun', 'risk', ...mangpaiModules],
        'full': ['ten_gods', 'pattern', 'yongshen', 'wealth', 'marriage', 'career', 'dayun', 'liunian', 'risk', ...mangpaiModules, 'mangpai_marriage', 'mangpai_career', 'mangpai_health'],
      };

      const modules = moduleMap[params.reportType] || moduleMap['free'];

      // 并行执行：规则引擎分析 + 健康数据获取（仅 full/全部报告类型）
      const isFullReport = params.reportType === 'full';
      const [ruleResults, healthData] = await Promise.all([
        (async () => {
          this.logger.log(`开始规则引擎分析: modules=${modules.join(',')}`);
          const result = await this.ruleEngine.analyze(chartData, modules);
          this.logger.log(`规则引擎分析完成: scores=${JSON.stringify(result.scores)}`);
          return result;
        })(),
        isFullReport
          ? this.fetchHealthEnrichmentData(chart, chartData).catch(err => {
              this.logger.warn(`健康数据获取失败（降级处理）: ${err.message}`);
              return null;
            })
          : Promise.resolve(null),
      ]);

      this.logger.log(`开始AI生成报告: module=${params.reportType}`);

      const aiResult = await this.aiService.generateReport({
        module: params.reportType,
        chartData,
        ruleResults,
        healthData,
        reportType: params.reportType,
        isPaid: params.isPaid,
        userId: params.userId,
      });
      this.logger.log(`AI生成完成: provider=${aiResult.provider}, tokenUsed=${aiResult.tokenUsed}`);

      // 记录 Token 消耗统计（报告已通过产品购买付费，不重复扣余额）
      this.tokenService.trackOnly({
        userId: params.userId,
        provider: aiResult.provider,
        model: aiResult.model,
        source: 'report',
        sourceRefId: params.chartId.toString(),
        inputTokens: 0,
        outputTokens: aiResult.tokenUsed,
      }).catch(err => this.logger.warn(`报告 Token 记录失败: ${err.message}`));

      // 4. 使用事务创建报告
      const report = await this.prisma.$transaction(async (tx) => {
        return tx.analysisReport.create({
          data: {
            userId: params.userId,
            chartId: params.chartId,
            reportType: params.reportType,
            productId: params.productId,
            orderId: params.orderId,
            ruleResults: ruleResults as any,
            ruleScores: ruleResults.scores as any,
            ruleTags: ruleResults.tags as any,
            aiProvider: aiResult.provider,
            promptVersion: aiResult.promptVersion,
            aiContent: aiResult.content,
            aiSummary: aiResult.summary,
            aiTokenUsed: aiResult.tokenUsed,
            aiCost: 0,
            upsellHook: aiResult.upsellHook,
            isPaid: params.isPaid,
          },
        });
      });

      this.logger.log(`报告创建成功: id=${report.id}, uuid=${report.uuid}`);

      // 5. 同步命盘画像到 Mem0 记忆系统（fire-and-forget，不阻塞响应）
      this.syncProfileToMemory(params.userId, chart, report).catch((err) => {
        this.logger.warn(`报告后同步 Mem0 失败（降级）: ${err.message}`);
      });

      return {
        id: report.id,
        uuid: report.uuid,
        reportType: params.reportType,
        content: params.isPaid ? aiResult.content : this.truncateForFree(aiResult.content),
        summary: aiResult.summary,
        ruleScores: ruleResults.scores,
        ruleTags: ruleResults.tags,
        upsellHook: aiResult.upsellHook,
        isPaid: params.isPaid,
      };
    } catch (error) {
      this.logger.error(`报告生成失败: chartId=${params.chartId}, error=${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async getReport(uuid: string, userId?: number) {
    const report = await this.prisma.analysisReport.findUnique({
      where: { uuid },
      include: { chart: true },
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
          reportType: report.reportType,
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

  private truncateForFree(content: string): string {
    try {
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.sections)) {
        const FREE_VISIBLE_SECTIONS = 2;
        const truncated = {
          ...parsed,
          sections: parsed.sections.map((sec: any, i: number) => {
            if (i < FREE_VISIBLE_SECTIONS) return sec;
            return {
              title: sec.title,
              score: sec.score,
              content: '解锁完整报告查看详细分析...',
              highlights: [],
              yearMarks: [],
            };
          }),
          summary: '',
          keyYears: [],
        };
        return JSON.stringify(truncated);
      }
    } catch {
      // not JSON, fall through to plain text truncation
    }

    const lines = content.split('\n');
    const showLines = Math.ceil(lines.length * 0.3);
    return lines.slice(0, showLines).join('\n') + '\n\n... 更多精彩内容请解锁完整报告 ...';
  }

  private chartToAnalysisData(chart: any) {
    const GAN_WUXING: Record<string, string> = {
      '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
      '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
    };

    return {
      year_pillar: { gan: chart.yearGan, zhi: chart.yearZhi },
      month_pillar: { gan: chart.monthGan, zhi: chart.monthZhi },
      day_pillar: { gan: chart.dayGan, zhi: chart.dayZhi },
      hour_pillar: { gan: chart.hourGan, zhi: chart.hourZhi },
      day_master: chart.dayGan,
      day_master_wuxing: GAN_WUXING[chart.dayGan] || '',
      day_master_strength: chart.dayMasterStrength,
      strength_level: chart.strengthLevel,
      wuxing_counts: chart.wuxingCounts,
      wuxing_score: chart.wuxingScore,
      ten_gods: chart.tenGodsMap,
      shensha_list: chart.shenshaList,
      dayun_list: chart.dayunList,
      dayun_start_age: chart.dayunStartAge,
      dayun_direction: chart.dayunDirection,
      liunian_list: chart.liunianList,
      pattern_type: chart.patternType,
      pattern_name: chart.patternName,
      yong_shen: chart.yongShen,
      xi_shen: chart.xiShen,
      ji_shen: chart.jiShen,
      tiaohuo_need: chart.tiaohuoNeed,
      kong_wang: chart.kongWang,
      chang_sheng: chart.changSheng,
      tai_yuan: chart.taiYuan,
      ming_gong: chart.mingGong,
      shen_gong: chart.shenGong,
      relations: chart.relations,
      gender: chart.gender,
      birth_year: chart.solarDate ? new Date(chart.solarDate).getFullYear() : null,
      current_age: chart.solarDate
        ? new Date().getFullYear() - new Date(chart.solarDate).getFullYear()
        : null,
      // Blind school hidden stem data (already in chart, expose for rule engine)
      year_hidden: chart.yearHidden,
      month_hidden: chart.monthHidden,
      day_hidden: chart.dayHidden,
      hour_hidden: chart.hourHidden,
    };
  }

  /** Enhance chartData with blind school computed fields */
  private enrichWithMangpai(chartData: any) {
    // Add hidden stems as direct fields for rule engine access
    chartData.year_hidden = chartData.year_hidden || [];
    chartData.month_hidden = chartData.month_hidden || [];
    chartData.day_hidden = chartData.day_hidden || [];
    chartData.hour_hidden = chartData.hour_hidden || [];

    // Compute mangpai analysis
    const result = this.mangpai.analyze(chartData);
    const flat = this.mangpai.flatten(result);
    Object.assign(chartData, flat);

    return chartData;
  }

  /**
   * 获取健康增值数据（五运六气 + 器官分析 + 健康预警）
   * 并行调用 calendar engine 的多个健康端点
   */
  private async fetchHealthEnrichmentData(chart: any, chartData: any) {
    const currentYear = new Date().getFullYear();
    const targetDate = `${currentYear}-01-01`;

    const baziJson = JSON.stringify({
      day_gan: chart.dayGan,
      day_zhi: chart.dayZhi,
      year_zhi: chart.yearZhi,
      month_gan: chart.monthGan,
      month_zhi: chart.monthZhi,
    });
    const wuxingJson = JSON.stringify(chart.wuxingCounts || {});

    // 并行调用 calendar engine 的 3 个健康端点
    const [currentYearYunqi, organAnalysis, healthWarnings] = await Promise.all([
      this.wuyunliuqiService.getWuyunComputationData(targetDate, chartData.wuxing_counts),
      this.wuyunliuqiService.getOrganAnalysisComputation(baziJson, wuxingJson),
      this.wuyunliuqiService.getHealthWarningsComputation(baziJson, wuxingJson, null),
    ]);

    // 流年五运六气（本地计算，不需要 HTTP 调用）
    const liunianList = chart.liunianList || [];
    const liunianYears = liunianList
      .filter((ln: any) => ln.year >= currentYear && ln.year <= currentYear + 10)
      .map((ln: any) => ({ gan: ln.gan, zhi: ln.zhi, year: ln.year }));
    const multiYearYunqi = this.wuyunliuqiService.getMultiYearYunqi(liunianYears);

    // 五运六气参考表
    const yunqiReference = this.wuyunliuqiService.getYunqiReferenceTables();

    return {
      currentYearYunqi,
      organAnalysis,
      healthWarnings,
      multiYearYunqi,
      yunqiReference,
    };
  }

  /**
   * 报告生成后异步同步命盘画像到 Mem0 记忆系统
   * 重置同步标记 → 构建画像文本 → 写入 User 层永久记忆 + 规则分析 → 标记已同步
   */
  private async syncProfileToMemory(userId: number, chart: any, report: any): Promise<void> {
    if (!this.mem0.isReady()) {
      this.logger.warn(`Mem0 未就绪，跳过用户 ${userId} 的画像同步`);
      return;
    }

    const mem0UserId = `user_${userId}`;

    try {
      // 1. 重置同步标记，确保下次测算顾问获取最新数据
      await this.prisma.user.update({
        where: { id: userId },
        data: { mem0ProfileSynced: false },
      });

      // 2. 构建并写入命盘画像（User 层永久记忆）
      const profileText = buildProfileMemory(chart, report);
      if (profileText) {
        await this.mem0.addUserProfile(mem0UserId, profileText, {
          reportType: report.reportType,
          chartId: chart.id,
          expirationDate: null,
        });
        this.logger.log(`用户 ${userId} 八字画像已同步至 Mem0`);
      }

      // 3. 构建并写入规则分析摘要（User 层中期记忆）
      const ruleSummary = buildRuleSummary(report);
      if (ruleSummary) {
        await this.mem0.addMemory(
          [{ role: 'system', content: ruleSummary }],
          {
            userId: mem0UserId,
            metadata: {
              memoryType: 'analysis',
              reportType: report.reportType,
              chartId: chart.id,
              expirationDate: getExpirationDate('medium', chart) ?? undefined,
            },
          },
        );
      }

      // 4. 标记已同步
      await this.prisma.user.update({
        where: { id: userId },
        data: { mem0ProfileSynced: true },
      });
    } catch (error) {
      this.logger.warn(`Mem0 画像同步失败（降级）: ${error.message}`);
      // 重试时重置标记，下次聊天可再次触发同步
      await this.prisma.user.update({
        where: { id: userId },
        data: { mem0ProfileSynced: false },
      }).catch(() => {});
    }
  }
}
