import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BaziService } from '../bazi/bazi.service';
import { AiService } from '../ai/ai.service';

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

@Injectable()
export class HehunService {
  constructor(
    private prisma: PrismaService,
    private baziService: BaziService,
    private aiService: AiService,
  ) {}

  async matchCouple(params: {
    userId: number;
    maleChartId: number;
    femaleChartId: number;
    orderId?: number;
  }) {
    const maleChart = await this.baziService.getChart(params.maleChartId);
    const femaleChart = await this.baziService.getChart(params.femaleChartId);
    if (!maleChart || !femaleChart) {
      throw new NotFoundException('命盘不存在');
    }

    const scores = this.calculateCompatibility(maleChart, femaleChart);
    const totalScore = this.weightedAverage(scores);
    const level = this.getCompatibilityLevel(totalScore);
    const riskYears = this.identifyRiskYears(maleChart, femaleChart);
    const bestYears = this.identifyBestWeddingYears(maleChart, femaleChart);

    const formatChart = (chart: any) => {
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
        shensha_list: chart.shenshaList,
        gender: chart.gender,
      };
    };

    const aiResult = await this.aiService.generateReport({
      module: 'hehun',
      chartData: { male: formatChart(maleChart), female: formatChart(femaleChart) },
      ruleResults: { scores, totalScore, level, riskYears, bestYears, tags: [level], },
      reportType: 'hehun',
      isPaid: !!params.orderId,
    });

    const report = await this.prisma.analysisReport.create({
      data: {
        userId: params.userId,
        chartId: params.maleChartId,
        reportType: 'hehun',
        orderId: params.orderId,
        ruleResults: { scores, totalScore, level, riskYears, bestYears } as any,
        ruleScores: scores as any,
        ruleTags: [level] as any,
        aiProvider: aiResult.provider,
        promptVersion: aiResult.promptVersion,
        aiContent: aiResult.content,
        aiSummary: aiResult.summary,
        aiTokenUsed: aiResult.tokenUsed,
        upsellHook: aiResult.upsellHook,
        isPaid: !!params.orderId,
      },
    });

    return {
      reportId: report.id,
      reportUuid: report.uuid,
      totalScore,
      level,
      dimensionScores: scores,
      riskYears,
      bestWeddingYears: bestYears,
      content: aiResult.content,
      summary: aiResult.summary,
    };
  }

  private calculateCompatibility(male: any, female: any): Record<string, number> {
    const scores: Record<string, number> = {};

    // 1. 日主天合 (权重30%)
    scores['日主天合'] = GAN_HE[male.dayGan] === female.dayGan ? 95 : 50;

    // 2. 五行互补 (权重25%)
    const maleWx = GAN_WUXING[male.dayGan];
    const femaleWx = GAN_WUXING[female.dayGan];
    if (WUXING_SHENG[maleWx] === femaleWx || WUXING_SHENG[femaleWx] === maleWx) {
      scores['五行互补'] = 85;
    } else if (maleWx === femaleWx) {
      scores['五行互补'] = 65;
    } else {
      scores['五行互补'] = 50;
    }

    // 3. 地支六合 (权重20%)
    let hexCount = 0;
    const maleZhi = [male.yearZhi, male.monthZhi, male.dayZhi, male.hourZhi].filter(Boolean);
    const femaleZhi = [female.yearZhi, female.monthZhi, female.dayZhi, female.hourZhi].filter(Boolean);
    for (const mz of maleZhi) {
      for (const fz of femaleZhi) {
        if (ZHI_LIU_HE[mz] === fz) hexCount++;
      }
    }
    scores['地支六合'] = Math.min(95, 50 + hexCount * 15);

    // 4. 冲克检查 (权重15%) - 越少越好
    let clashCount = 0;
    for (const mz of maleZhi) {
      for (const fz of femaleZhi) {
        if (ZHI_LIU_CHONG[mz] === fz) clashCount++;
      }
    }
    scores['冲克'] = Math.max(20, 90 - clashCount * 25);

    // 5. 大运同步 (权重10%)
    scores['大运同步'] = this.evaluateDayunSync(male, female);

    return scores;
  }

  private evaluateDayunSync(male: any, female: any): number {
    // Simplified: check if both are in favorable dayun periods
    const maleStr = male.dayMasterStrength || 50;
    const femaleStr = female.dayMasterStrength || 50;
    const diff = Math.abs(maleStr - femaleStr);
    if (diff < 15) return 80;
    if (diff < 30) return 65;
    return 50;
  }

  private weightedAverage(scores: Record<string, number>): number {
    const weights: Record<string, number> = {
      '日主天合': 0.30,
      '五行互补': 0.25,
      '地支六合': 0.20,
      '冲克': 0.15,
      '大运同步': 0.10,
    };

    let total = 0;
    let weightSum = 0;
    for (const [key, score] of Object.entries(scores)) {
      const w = weights[key] || 0.1;
      total += score * w;
      weightSum += w;
    }
    return Math.round(total / weightSum);
  }

  private getCompatibilityLevel(score: number): string {
    if (score >= 85) return '天作之合';
    if (score >= 70) return '良缘佳配';
    if (score >= 55) return '尚可磨合';
    return '需慎重考虑';
  }

  private identifyRiskYears(male: any, female: any): number[] {
    const currentYear = new Date().getFullYear();
    const risks: number[] = [];
    for (let y = currentYear; y <= currentYear + 10; y++) {
      // Simplified risk detection
      if (y % 6 === 0 || y % 12 === currentYear % 12) {
        risks.push(y);
      }
    }
    return risks.slice(0, 3);
  }

  private identifyBestWeddingYears(male: any, female: any): number[] {
    const currentYear = new Date().getFullYear();
    const best: number[] = [];
    for (let y = currentYear; y <= currentYear + 5; y++) {
      if (y % 2 === 0) best.push(y);
    }
    return best.slice(0, 3);
  }
}
