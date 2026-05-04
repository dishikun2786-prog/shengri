import { Injectable } from '@nestjs/common';

const ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const TWELVE_STARS = [
  { name: '太岁', type: 'neutral', desc: '遇吉则吉遇凶则凶' },
  { name: '青龙', type: 'good', desc: '喜事、财运、贵人' },
  { name: '丧门', type: 'minor_bad', desc: '地丧、孝服、小病' },
  { name: '六合', type: 'good', desc: '和美、婚姻、合作' },
  { name: '官符', type: 'neutral', desc: '红鸾星动、喜事' },
  { name: '小耗', type: 'minor_bad', desc: '小偷、破小财' },
  { name: '大耗', type: 'major_bad', desc: '大破财、大凶' },
  { name: '朱雀', type: 'major_bad', desc: '口舌、是非、官灾' },
  { name: '白虎', type: 'major_bad', desc: '血光、横祸、丧服' },
  { name: '贵神', type: 'good', desc: '贵人相助、逢凶化吉' },
  { name: '吊客', type: 'minor_bad', desc: '吊唁、阴气、不祥' },
  { name: '病符', type: 'minor_bad', desc: '疾病、体弱、住院' },
];

interface ChuanGongYear {
  year: number;
  yearZhi: string;
  stars: { branch: string; star: string; starType: string; desc: string }[];
  summary: {
    goodStars: string[];
    badStars: string[];
    majorWarnings: string[];
    overall: string;
  };
}

export interface ChuanGongResult {
  currentYear: ChuanGongYear;
  nextYear: ChuanGongYear;
  years: ChuanGongYear[];
  twelveStarLegend: { name: string; type: string; desc: string }[];
}

@Injectable()
export class ChuanGongService {

  /** Generate 串宫压运 for a range of years */
  analyze(currentYear: number, count: number = 5): ChuanGongResult {
    const years: ChuanGongYear[] = [];
    for (let i = 0; i < count; i++) {
      years.push(this.computeYear(currentYear + i));
    }

    return {
      currentYear: years[0],
      nextYear: years[1] || years[0],
      years,
      twelveStarLegend: TWELVE_STARS.map(s => ({ name: s.name, type: s.type, desc: s.desc })),
    };
  }

  /** Compute 串宫压运 for a single year */
  private computeYear(year: number): ChuanGongYear {
    // Get the earthly branch of the year
    const yearZhi = this.yearToZhi(year);
    const stars = this.assignStars(yearZhi);

    const goodStars = stars.filter(s => s.starType === 'good').map(s => `${s.branch}${s.star}`);
    const badStars = stars.filter(s => s.starType === 'minor_bad' || s.starType === 'major_bad').map(s => `${s.branch}${s.star}`);
    const majorWarnings = stars.filter(s => s.starType === 'major_bad').map(s => `${s.star}临${s.branch}：${s.desc}`);

    // Overall judgment
    let overall: string;
    const majorCount = stars.filter(s => s.starType === 'major_bad').length;
    const goodCount = stars.filter(s => s.starType === 'good').length;

    if (majorCount >= 3) overall = '大凶之年，诸事谨慎';
    else if (majorCount >= 2) overall = '凶多吉少，保守行事';
    else if (goodCount >= 4) overall = '大吉之年，百事顺遂';
    else if (goodCount >= 2) overall = '吉多凶少，有利发展';
    else overall = '平运之年，吉凶参半';

    return { year, yearZhi, stars, summary: { goodStars, badStars, majorWarnings, overall } };
  }

  /** Assign 12 stars to 12 branches for a given year branch */
  private assignStars(yearZhi: string) {
    const startIdx = ZHI_ORDER.indexOf(yearZhi);
    if (startIdx === -1) return [];

    const result: { branch: string; star: string; starType: string; desc: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const zhiIdx = (startIdx + i) % 12;
      const star = TWELVE_STARS[i];
      result.push({
        branch: ZHI_ORDER[zhiIdx],
        star: star.name,
        starType: star.type,
        desc: star.desc,
      });
    }
    return result;
  }

  /** Convert year number to earthly branch */
  private yearToZhi(year: number): string {
    // 地支: 子=4 (e.g., 2020=庚子, 2020%12=4)
    const idx = (year % 12 + 12) % 12;
    const zhiMap: Record<number, string> = {
      0: '申', 1: '酉', 2: '戌', 3: '亥', 4: '子', 5: '丑',
      6: '寅', 7: '卯', 8: '辰', 9: '巳', 10: '午', 11: '未',
    };
    return zhiMap[idx] || '子';
  }

  /** Generate a human-readable summary text for report embedding */
  generateReportText(result: ChuanGongResult): string {
    const lines: string[] = [];
    lines.push('【盲派串宫压运流年分析】\n');

    for (const yr of result.years) {
      lines.push(`## ${yr.year}年（${yr.yearZhi}年）`);
      lines.push(`总体判断：${yr.summary.overall}`);
      if (yr.summary.majorWarnings.length > 0) {
        lines.push(`⚠ 重大警示：${yr.summary.majorWarnings.join('；')}`);
      }
      if (yr.summary.goodStars.length > 0) {
        lines.push(`吉星：${yr.summary.goodStars.join('、')}`);
      }
      if (yr.summary.badStars.length > 0) {
        lines.push(`凶星：${yr.summary.badStars.join('、')}`);
      }

      // Monthly breakdown
      lines.push('各月星神分布：');
      for (const s of yr.stars) {
        const emoji = s.starType === 'good' ? '吉' : s.starType === 'major_bad' ? '大凶' : s.starType === 'minor_bad' ? '小凶' : '平';
        lines.push(`  ${s.branch}月 · ${s.star}【${emoji}】${s.desc}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /** Generate a compact summary for AI prompt injection */
  generateCompactSummary(result: ChuanGongResult): string {
    const parts: string[] = [];
    for (const yr of result.years) {
      const good = yr.summary.goodStars.join('、');
      const bad = yr.summary.badStars.join('、');
      const warnings = yr.summary.majorWarnings.join('；');
      parts.push(`${yr.year}(${yr.yearZhi}) ${yr.summary.overall} | 吉:${good || '无'} | 凶:${bad || '无'}${warnings ? ` | ⚠${warnings}` : ''}`);
    }
    return parts.join('\n');
  }
}
