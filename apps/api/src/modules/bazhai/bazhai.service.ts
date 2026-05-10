import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RuleEngineService } from '../rule-engine/rule-engine.service';
import { AiService } from '../ai/ai.service';
import { TokenService } from '../token/token.service';
import { BazhaiCalculatorService } from '../../common/bazhai/bazhai-calculator.service';
import { CalculateDto, GenerateReportDto } from './bazhai.dto';

@Injectable()
export class BazhaiService {
  private readonly logger = new Logger(BazhaiService.name);
  constructor(private prisma: PrismaService, private ruleEngine: RuleEngineService, private aiService: AiService, private tokenService: TokenService, private calculator: BazhaiCalculatorService) {}

  async calculate(dto: CalculateDto, userId?: number) {
    const result = this.calculator.analyze(dto.birthYear, dto.gender);
    let recordUuid: string | null = null;
    if (userId) {
      try {
        const record = await this.prisma.bazhaiRecord.create({ data: { userId, birthYear: dto.birthYear, gender: dto.gender, kuaNumber: result.kuaNumber, trigram: result.trigram, group: result.group, directions: result.directions as any, question: dto.question || null } });
        recordUuid = record.uuid;
      } catch (err: any) {
        this.logger.warn(`保存失败: ${err.message}`);
      }
    }
    return { ...result, recordUuid, question: dto.question || null };
  }

  async generateReport(dto: GenerateReportDto, userId: number) {
    const result = this.calculator.analyze(dto.birthYear, dto.gender);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existing = await this.prisma.bazhaiRecord.findFirst({
      where: { userId, birthYear: dto.birthYear, gender: dto.gender, createdAt: { gt: fiveMinAgo } },
      orderBy: { createdAt: 'desc' }, include: { reports: { take: 1, orderBy: { createdAt: 'desc' } } },
    });
    if (existing?.reports.length) {
      const r = existing.reports[0];
      return { id: r.id, uuid: r.uuid, reportType: 'bazhai', content: dto.isPaid ? (r.aiContent || '') : this.truncate(r.aiContent || ''), summary: r.aiSummary || '', isPaid: dto.isPaid || false, result };
    }
    const record = await this.prisma.bazhaiRecord.create({ data: { userId, birthYear: dto.birthYear, gender: dto.gender, kuaNumber: result.kuaNumber, trigram: result.trigram, group: result.group, directions: result.directions as any, question: dto.question || null } });
    const chartData = { birthYear: result.birthYear, gender: result.genderLabel, kuaNumber: result.kuaNumber, trigram: result.trigram, group: result.groupLabel, directions: result.directions.map(d => `${d.direction}(${d.trigram})→${d.star}(${d.luck})`).join('\n'), luckyDirs: result.directions.filter(d => d.luck.includes('吉')).map(d => `${d.direction}(${d.star}):${d.mainAffair}`).join('; '), summary: result.summary };
    let ruleResults;
    try { ruleResults = await this.ruleEngine.analyze(chartData, ['bazhai']); } catch (err) { ruleResults = { tags: [], scores: {}, texts: [] }; }
    let aiResult;
    try {
      aiResult = await this.aiService.generateReport({ module: 'bazhai', chartData: { ...chartData, rule_texts: (ruleResults as any)?.texts?.join('\n') || '', user_question: dto.question || '', has_question: !!dto.question }, ruleResults, healthData: null, reportType: 'bazhai', isPaid: dto.isPaid || false, userId });
    } catch (err: any) { throw new BadRequestException('AI报告生成失败'); }
    this.tokenService.trackOnly({ userId, provider: aiResult.provider, model: aiResult.model, source: 'report', sourceRefId: record.id.toString(), inputTokens: 0, outputTokens: aiResult.tokenUsed }).catch(() => {});
    const report = await this.prisma.analysisReport.create({ data: { userId, chartId: null, bzRecordId: record.id, reportType: 'bazhai', productId: dto.productId, orderId: dto.orderId, ruleResults: ruleResults as any, ruleScores: (ruleResults as any)?.scores || {}, ruleTags: (ruleResults as any)?.tags || [], aiProvider: aiResult.provider, promptVersion: aiResult.promptVersion, aiContent: aiResult.content, aiSummary: aiResult.summary, aiTokenUsed: aiResult.tokenUsed, aiCost: 0, upsellHook: aiResult.upsellHook, isPaid: dto.isPaid || false } });
    return { id: report.id, uuid: report.uuid, reportType: 'bazhai', content: dto.isPaid ? aiResult.content : this.truncate(aiResult.content), summary: aiResult.summary, isPaid: dto.isPaid || false, result };
  }

  async getReport(uuid: string, userId?: number) {
    const report = await this.prisma.analysisReport.findUnique({ where: { uuid }, include: { bzRecord: true } });
    if (!report) throw new NotFoundException(); if (userId && report.userId !== userId) throw new ForbiddenException();
    await this.prisma.analysisReport.update({ where: { id: report.id }, data: { viewCount: { increment: 1 } } });
    if (!report.isPaid) { const up = await this.prisma.product.findFirst({ where: { reportType: 'bazhai', currentPrice: { gt: 0 }, isActive: true }, orderBy: { currentPrice: 'asc' }, select: { id: true, name: true, currentPrice: true } }); return { ...report, aiContent: this.truncate(report.aiContent || ''), locked: true, upgradeProduct: up || null }; }
    return report;
  }

  async getHistory(userId: number, skip = 0, take = 20) {
    const [records, total] = await Promise.all([
      this.prisma.bazhaiRecord.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take, include: { reports: { take: 1, orderBy: { createdAt: 'desc' } } } }),
      this.prisma.bazhaiRecord.count({ where: { userId } }),
    ]);
    return { records: records.map(r => ({ id: r.id, uuid: r.uuid, birthYear: r.birthYear, gender: r.gender, kuaNumber: r.kuaNumber, trigram: r.trigram, group: r.group, question: r.question, createdAt: r.createdAt, reportUuid: r.reports[0]?.uuid || null, isPaid: r.reports[0]?.isPaid || false })), total };
  }

  async deleteRecord(userId: number, id: number) {
    const record = await this.prisma.bazhaiRecord.findFirst({ where: { id, userId } });
    if (!record) throw new NotFoundException('记录不存在');
    await this.prisma.analysisReport.deleteMany({ where: { bzRecordId: id } });
    await this.prisma.bazhaiRecord.delete({ where: { id } });
    return { success: true };
  }

  private truncate(c: string): string { try { const p = JSON.parse(c); if (p?.sections) return JSON.stringify({ ...p, sections: p.sections.map((s: any, i: number) => i < 1 ? s : { title: s.title, content: '解锁查看详情...' }), summary: '' }); } catch {} return c.slice(0, Math.ceil(c.length * 0.3)) + '\n...解锁完整报告...'; }
}
