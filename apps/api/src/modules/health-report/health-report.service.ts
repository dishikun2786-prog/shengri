import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RuleEngineService } from '../rule-engine/rule-engine.service';
import { AiService } from '../ai/ai.service';
import { TokenService } from '../token/token.service';
import { LuniSolarService } from '../../common/lunisolar/lunisolar.service';
import { HealthCalculatorService, type SymptomInput } from '../../common/health/health-calculator.service';
import { CalculateDto, GenerateReportDto } from './health-report.dto';

// 天干五行映射（与Python engine _calc_wuxing一致）
const GAN_WUXING: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

// 地支藏干（与Python engine ZHI_CANG_GAN一致）
const ZHI_CANG_GAN: Record<string, string[]> = {
  '子': ['癸'],            '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'], '卯': ['乙'],
  '辰': ['戊', '乙', '癸'], '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],      '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'], '酉': ['辛'],
  '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲'],
};

// 藏干权重（与Python engine一致: 本气1.0, 中气0.6, 余气0.3）
const CANG_GAN_WEIGHTS = [1.0, 0.6, 0.3];

@Injectable()
export class HealthReportService {
  private readonly logger = new Logger(HealthReportService.name);
  constructor(
    private prisma: PrismaService,
    private ruleEngine: RuleEngineService,
    private aiService: AiService,
    private tokenService: TokenService,
    private calculator: HealthCalculatorService,
    private luniSolar: LuniSolarService,
  ) {}

  /** 将日期转为公历（农历输入时自动转换） */
  private toSolarDate(birthDate: string, calendarType?: string): string {
    if (calendarType !== 'lunar') return birthDate;
    const [y, m, d] = birthDate.split('-').map(Number);
    try {
      const solar = this.luniSolar.lunarToSolar(y, m, d, false);
      return `${solar.year}-${String(solar.month).padStart(2, '0')}-${String(solar.day).padStart(2, '0')}`;
    } catch {
      return birthDate; // fallback
    }
  }

  /** 使用本地八字引擎计算五行统计（与Python _calc_wuxing算法一致） */
  private computeBaziWuxing(birthDate: string, calendarType?: string, hour = 12): Record<string, number> {
    const solarDate = this.toSolarDate(birthDate, calendarType);
    const [y, m, d] = solarDate.split('-').map(Number);
    const pillars = this.luniSolar.calculatePillars(y, m, d, hour);
    const wuxing: Record<string, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };

    for (const p of [pillars.year, pillars.month, pillars.day, pillars.hour]) {
      const gw = GAN_WUXING[p.gan];
      if (gw) wuxing[gw] = (wuxing[gw] || 0) + 1;
      const hidden = ZHI_CANG_GAN[p.zhi] || [];
      for (let i = 0; i < hidden.length; i++) {
        const hw = GAN_WUXING[hidden[i]];
        if (hw) wuxing[hw] = (wuxing[hw] || 0) + 1;
      }
    }
    return wuxing;
  }

  async calculate(dto: CalculateDto, userId?: number) {
    const targetDate = dto.targetDate || new Date().toISOString().slice(0, 10);
    const symptoms: SymptomInput[] = (dto.symptoms || []).map(s => ({
      symptom: s.symptom, duration: s.duration, severity: (s.severity as '轻' | '中' | '重') || '中',
    }));
    const baziWuxing = dto.birthDate ? this.computeBaziWuxing(dto.birthDate, dto.birthCalendarType) : undefined;
    const solarBirthDate = dto.birthDate ? this.toSolarDate(dto.birthDate, dto.birthCalendarType) : undefined;
    const result = this.calculator.analyze(targetDate, baziWuxing, symptoms, solarBirthDate, dto.height, dto.weight);

    let recordUuid: string | null = null;
    if (userId) {
      try {
        const record = await this.prisma.healthRecord.create({
          data: {
            userId, targetDate,
            yearGan: result.yearGan, yearZhi: result.yearZhi, yearYun: result.yearYun,
            sitian: result.sitian, zaiquan: result.zaiquan,
            mainYun: result.mainYun, keQi: result.keQi,
            hostQi: result.hostQi as any, guestQi: result.guestQi as any,
            constitution: result.constitution as any,
            organResults: result.organStatus as any,
            dailyTip: result.dailyTip,
            symptoms: (dto.symptoms || []) as any,
            question: dto.question || null,
            height: dto.height || null,
            weight: dto.weight || null,
            bmi: result.weightAnalysis?.bmi || null,
            bmiCategory: result.weightAnalysis?.bmiCategory || null,
            weightAnalysis: result.weightAnalysis as any || null,
          },
        });
        recordUuid = record.uuid;
      } catch (err: any) {
        this.logger.warn(`保存健康记录失败: ${err.message}`);
      }
    }
    return { ...result, recordUuid, question: dto.question || null };
  }

  async generateReport(dto: GenerateReportDto, userId: number) {
    const targetDate = dto.targetDate || new Date().toISOString().slice(0, 10);
    const symptoms: SymptomInput[] = (dto.symptoms || []).map(s => ({
      symptom: s.symptom, duration: s.duration, severity: (s.severity as '轻' | '中' | '重') || '中',
    }));
    const baziWuxing = dto.birthDate ? this.computeBaziWuxing(dto.birthDate, dto.birthCalendarType) : undefined;
    const solarBirthDate = dto.birthDate ? this.toSolarDate(dto.birthDate, dto.birthCalendarType) : undefined;
    const result = this.calculator.analyze(targetDate, baziWuxing, symptoms, solarBirthDate, dto.height, dto.weight);

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existing = await this.prisma.healthRecord.findFirst({
      where: { userId, targetDate, createdAt: { gt: fiveMinAgo } },
      orderBy: { createdAt: 'desc' }, include: { reports: { take: 1, orderBy: { createdAt: 'desc' } } },
    });
    if (existing?.reports.length) {
      const r = existing.reports[0];
      return { id: r.id, uuid: r.uuid, reportType: 'health', content: dto.isPaid ? (r.aiContent || '') : this.truncate(r.aiContent || ''), summary: r.aiSummary || '', isPaid: dto.isPaid || false, result };
    }

    const record = await this.prisma.healthRecord.create({
      data: {
        userId, targetDate,
        yearGan: result.yearGan, yearZhi: result.yearZhi, yearYun: result.yearYun,
        sitian: result.sitian, zaiquan: result.zaiquan,
        mainYun: result.mainYun, keQi: result.keQi,
        hostQi: result.hostQi as any, guestQi: result.guestQi as any,
        constitution: result.constitution as any,
        organResults: result.organStatus as any,
        dailyTip: result.dailyTip,
        symptoms: (dto.symptoms || []) as any,
        question: dto.question || null,
        height: dto.height || null,
        weight: dto.weight || null,
        bmi: result.weightAnalysis?.bmi || null,
        bmiCategory: result.weightAnalysis?.bmiCategory || null,
        weightAnalysis: result.weightAnalysis as any || null,
      },
    });
    const chartData = {
      targetDate, yearYun: result.yearYun, sitian: result.sitian, zaiquan: result.zaiquan,
      yearGanZhi: `${result.yearGan}${result.yearZhi}`,
      hostQi: result.hostQi.map(h => `${h.name}(${h.wuxing})`).join(', '),
      guestQi: result.guestQi.map(g => `${g.name}(${g.wuxing})`).join(', '),
      currentQi: `${result.hostQi[result.currentStep]?.name}(${result.hostQi[result.currentStep]?.wuxing})`,
      constitution: result.constitution.primary,
      constitutionScores: JSON.stringify(result.constitution.scores),
      organStatus: Object.entries(result.organStatus).map(([k, v]) => `${k}:${v.status}(${v.detail})`).join(', '),
      baziWuxing: result.baziWuxing ? JSON.stringify(result.baziWuxing) : '',
      birthYun: result.birthYun ? `${result.birthYun.gan}${result.birthYun.zhi}年${result.birthYun.yearYun}·${result.birthYun.sitian}司天` : '',
      birthAnalysis: result.birthYun?.analysis || '',
      drynessDampness: `${result.drynessDampness?.level}: ${result.drynessDampness?.desc}`,
      drynessAdvice: result.drynessDampness?.advice || '',
      combinedAnalysis: result.combinedAnalysis,
      symptoms: (dto.symptoms || []).map(s => `${s.symptom}(${s.duration || '未知'},${s.severity || '中'})`).join('; '),
      symptomMatches: result.symptomMatches.map(m => `${m.symptom}→${m.pattern}`).join('; '),
      dailyTip: result.dailyTip, summary: result.summary,
      yunAnalysis: result.yunAnalysis, qiAnalysis: result.qiAnalysis,
      user_question: dto.question || '', has_question: !!dto.question,
      has_symptoms: !!(dto.symptoms?.length),
      has_birth: !!dto.birthDate,
      hasWeightData: !!(dto.height && dto.weight),
      height: dto.height || null, weight: dto.weight || null,
      bmi: result.weightAnalysis?.bmi || null,
      bmiCategory: result.weightAnalysis?.bmiCategory || null,
      tcmBodyType: result.weightAnalysis?.tcmBodyType || '',
      tcmWeightPattern: result.weightAnalysis?.tcmPattern || '',
      spleenStomachAnalysis: result.weightAnalysis?.spleenStomachAnalysis || '',
      weightDampnessLevel: result.weightAnalysis?.dampnessLevel || '',
      dietaryAdvice: result.weightAnalysis?.dietaryAdvice || '',
      acupoints: result.weightAnalysis?.acupoints?.join(', ') || '',
      exerciseAdvice: result.weightAnalysis?.exerciseAdvice || '',
      herbSuggestions: result.weightAnalysis?.herbSuggestions?.join(', ') || '',
      neijingQuotes: result.weightAnalysis?.neijingQuotes?.join(' | ') || '',
    };

    let ruleResults;
    try { ruleResults = await this.ruleEngine.analyze(chartData, ['health']); } catch (err) { ruleResults = { tags: [], scores: {}, texts: [] }; }

    let aiResult;
    try {
      aiResult = await this.aiService.generateReport({
        module: 'health', chartData: { ...chartData, rule_texts: (ruleResults as any)?.texts?.join('\n') || '' },
        ruleResults, healthData: null, reportType: 'health', isPaid: dto.isPaid || false, userId,
      });
    } catch (err: any) { throw new BadRequestException('AI报告生成失败'); }

    this.tokenService.trackOnly({ userId, provider: aiResult.provider, model: aiResult.model, source: 'report', sourceRefId: record.id.toString(), inputTokens: 0, outputTokens: aiResult.tokenUsed }).catch(() => {});

    const report = await this.prisma.analysisReport.create({
      data: {
        userId, chartId: null, haRecordId: record.id, reportType: 'health',
        productId: dto.productId, orderId: dto.orderId,
        ruleResults: ruleResults as any, ruleScores: (ruleResults as any)?.scores || {}, ruleTags: (ruleResults as any)?.tags || [],
        aiProvider: aiResult.provider, promptVersion: aiResult.promptVersion,
        aiContent: aiResult.content, aiSummary: aiResult.summary, aiTokenUsed: aiResult.tokenUsed, aiCost: 0,
        upsellHook: aiResult.upsellHook, isPaid: dto.isPaid || false,
      },
    });
    return { id: report.id, uuid: report.uuid, reportType: 'health', content: dto.isPaid ? aiResult.content : this.truncate(aiResult.content), summary: aiResult.summary, isPaid: dto.isPaid || false, result };
  }

  async getReport(uuid: string, userId?: number) {
    const report = await this.prisma.analysisReport.findUnique({ where: { uuid }, include: { haRecord: true } });
    if (!report) throw new NotFoundException(); if (userId && report.userId !== userId) throw new ForbiddenException();
    await this.prisma.analysisReport.update({ where: { id: report.id }, data: { viewCount: { increment: 1 } } });
    if (!report.isPaid) {
      const up = await this.prisma.product.findFirst({ where: { reportType: 'health', currentPrice: { gt: 0 }, isActive: true }, orderBy: { currentPrice: 'asc' }, select: { id: true, name: true, currentPrice: true } });
      return { ...report, aiContent: this.truncate(report.aiContent || ''), locked: true, upgradeProduct: up || null };
    }
    return report;
  }

  async getHistory(userId: number, skip = 0, take = 20) {
    const [records, total] = await Promise.all([
      this.prisma.healthRecord.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take, include: { reports: { take: 1, orderBy: { createdAt: 'desc' } } } }),
      this.prisma.healthRecord.count({ where: { userId } }),
    ]);
    return { records: records.map(r => ({ id: r.id, uuid: r.uuid, targetDate: r.targetDate, yearYun: r.yearYun, sitian: r.sitian, zaiquan: r.zaiquan, question: r.question, createdAt: r.createdAt, reportUuid: r.reports[0]?.uuid || null, isPaid: r.reports[0]?.isPaid || false, bmi: r.bmi, bmiCategory: r.bmiCategory })), total };
  }

  async deleteRecord(userId: number, id: number) {
    const record = await this.prisma.healthRecord.findFirst({ where: { id, userId } });
    if (!record) throw new NotFoundException('记录不存在');
    await this.prisma.analysisReport.deleteMany({ where: { haRecordId: id } });
    await this.prisma.healthRecord.delete({ where: { id } });
    return { success: true };
  }

  private truncate(c: string): string {
    try { const p = JSON.parse(c); if (p?.sections) return JSON.stringify({ ...p, sections: p.sections.map((s: any, i: number) => i < 1 ? s : { title: s.title, content: '解锁查看详情...' }), summary: '' }); } catch {}
    return c.slice(0, Math.ceil(c.length * 0.3)) + '\n...解锁完整报告...';
  }
}
