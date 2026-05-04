import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

const GAN_WUXING: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};
const ZHI_WUXING: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};
const ZHI_HIDDEN_MAIN: Record<string, string> = {
  '子': '癸', '丑': '己', '寅': '甲', '卯': '乙', '辰': '戊', '巳': '丙',
  '午': '丁', '未': '己', '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬',
};

// Pilars: Body (体) = 印比食伤禄, Use (用) = 财官
const BODY_TENGODS = ['正印', '偏印', '比肩', '劫财', '食神', '伤官', '禄'];
const USE_TENGODS = ['正财', '偏财', '正官', '七杀'];

// Work type efficiency mapping (2.4 做功效率总排序)
const WORK_EFFICIENCY: Record<string, number> = {
  '开官杀库': 100, '开财库': 98, '开食伤库': 95,
  '印化官杀': 90, '食伤制官杀': 85, '食伤生财': 80,
  '印禄相随': 75, '合财合官': 70, '年月财官到家': 65,
  '羊刃合杀': 60, '比劫合财': 50, '比劫制财': 30,
};

export interface MangpaiResult {
  workType: string;
  workEfficiency: number;
  workLevel: string;
  hasPower: boolean;
  powerElement: string;
  powerStrength: string;
  level: string;
  levelScore: number;
  bodyUseBalance: string;
  hostGuestConfig: string;
  isReverse: boolean;
  tenGodCounts: Record<string, number>;
  directRules: string[];
}

@Injectable()
export class MangpaiCalculatorService implements OnModuleInit {
  private readonly logger = new Logger(MangpaiCalculatorService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.autoImportRules();
  }

  /** Auto-import blind school rules from JSON files on first startup */
  private async autoImportRules() {
    const rulesDir = path.resolve(__dirname, '../../../../rules/mangpai');
    if (!fs.existsSync(rulesDir)) {
      this.logger.warn(`盲派规则目录不存在: ${rulesDir}`);
      return;
    }

    const moduleFiles: Record<string, string> = {
      mangpai_work: 'mangpai-work-rules.json',
      mangpai_power: 'mangpai-power-rules.json',
      mangpai_body_guest: 'mangpai-body-guest-rules.json',
      mangpai_tengods_direct: 'mangpai-tengods-direct-rules.json',
      mangpai_shensha: 'mangpai-shensha-rules.json',
      mangpai_marriage: 'mangpai-marriage-rules.json',
      mangpai_career: 'mangpai-career-rules.json',
      mangpai_health: 'mangpai-health-rules.json',
    };

    let created = 0;
    let updated = 0;

    for (const [module, filename] of Object.entries(moduleFiles)) {
      const filePath = path.join(rulesDir, filename);
      if (!fs.existsSync(filePath)) {
        this.logger.warn(`盲派规则文件不存在: ${filePath}`);
        continue;
      }

      const rules = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      for (const rule of rules) {
        const existing = await this.prisma.rule.findUnique({ where: { ruleId: rule.rule_id } });
        if (existing) {
          await this.prisma.rule.update({
            where: { ruleId: rule.rule_id },
            data: {
              module: rule.module,
              name: rule.name,
              version: rule.version || '1.0.0',
              priority: rule.priority || 100,
              conditions: rule.conditions,
              actions: rule.actions,
              isActive: true,
            },
          });
          updated++;
        } else {
          await this.prisma.rule.create({
            data: {
              ruleId: rule.rule_id,
              module: rule.module,
              name: rule.name,
              description: null,
              version: rule.version || '1.0.0',
              priority: rule.priority || 100,
              conditions: rule.conditions,
              actions: rule.actions,
              isActive: true,
            },
          });
          created++;
        }
      }
    }

    if (created > 0 || updated > 0) {
      this.logger.log(`盲派规则自动导入完成: 新增 ${created} 条, 更新 ${updated} 条`);
    }
  }

  /** Main entry: compute all blind school fields from chart data */
  analyze(chartData: any): MangpaiResult {
    const tenGodCounts = this.countTenGods(chartData);
    const hostGuest = this.classifyHostGuest(chartData);
    const bodyUse = this.classifyBodyUse(chartData, tenGodCounts);
    const work = this.detectWork(chartData, hostGuest, bodyUse, tenGodCounts);
    const power = this.detectPower(chartData);
    const level = this.evaluateLevel(work, power);
    const directRules = this.applyDirectFormulas(chartData, tenGodCounts, hostGuest);

    return {
      workType: work.type,
      workEfficiency: work.efficiency,
      workLevel: work.level,
      hasPower: power.hasPower,
      powerElement: power.dominantElement,
      powerStrength: power.strength,
      level: level.label,
      levelScore: level.score,
      bodyUseBalance: bodyUse.balance,
      hostGuestConfig: hostGuest.config,
      isReverse: hostGuest.isReverse,
      tenGodCounts,
      directRules,
    };
  }

  /** Flatten result into rule-engine-compatible fields */
  flatten(result: MangpaiResult): Record<string, any> {
    return {
      mangpai_work_type: result.workType,
      mangpai_work_efficiency: result.workEfficiency,
      mangpai_work_level: result.workLevel,
      mangpai_has_power: result.hasPower,
      mangpai_power_element: result.powerElement,
      mangpai_power_strength: result.powerStrength,
      mangpai_level: result.level,
      mangpai_level_score: result.levelScore,
      mangpai_body_use_balance: result.bodyUseBalance,
      mangpai_host_guest_config: result.hostGuestConfig,
      mangpai_is_reverse: result.isReverse,
      mangpai_ten_god_counts: result.tenGodCounts,
      mangpai_direct_rules: result.directRules,
    };
  }

  // ========== 十神计数 (5.1 十神数量歌诀) ==========

  private countTenGods(d: any): Record<string, number> {
    const counts: Record<string, number> = {
      '正官': 0, '七杀': 0, '正印': 0, '偏印': 0, '食神': 0, '伤官': 0,
      '正财': 0, '偏财': 0, '比肩': 0, '劫财': 0,
    };

    const tenGods = d.ten_gods || {};
    // ten_gods format from calendar engine: each pillar key → ten god name
    const pillars = ['年柱', '月柱', '日柱', '时柱'];
    for (const p of pillars) {
      const tg = tenGods[p];
      if (tg && counts[tg] !== undefined) counts[tg]++;
    }

    // Also count hidden stem ten gods from each pillar
    const hiddenFields: Record<string, string> = {
      yearHidden: '年柱', monthHidden: '月柱', dayHidden: '日柱', hourHidden: '时柱',
    };
    for (const [field, pillar] of Object.entries(hiddenFields)) {
      const hidden = (d as any)[field] || d[field];
      if (Array.isArray(hidden)) {
        for (const h of hidden) {
          const hTenGod = typeof h === 'string' ? null : h.tenGod || h.ten_god;
          if (hTenGod && counts[hTenGod] !== undefined) counts[hTenGod]++;
        }
      }
    }

    return counts;
  }

  // ========== 宾主分类 (1.3 宾主论) ==========

  private classifyHostGuest(d: any) {
    // 日时=主(家内), 年月=宾(家外)
    const hostStems = [d.day_pillar?.gan, d.hour_pillar?.gan].filter(Boolean);
    const guestStems = [d.year_pillar?.gan, d.month_pillar?.gan].filter(Boolean);
    const hostWuxing = hostStems.map((s: string) => GAN_WUXING[s] || '');
    const guestWuxing = guestStems.map((s: string) => GAN_WUXING[s] || '');

    // Detect config type
    const tenGods = d.ten_gods || {};
    const hostTenGods = [tenGods['日柱'], tenGods['时柱']].filter(Boolean);
    const guestTenGods = [tenGods['年柱'], tenGods['月柱']].filter(Boolean);

    // Check if body (体) occupies host position and use (用) occupies guest position
    const hostBodyCount = hostTenGods.filter((t: string) => BODY_TENGODS.includes(t)).length;
    const guestUseCount = guestTenGods.filter((t: string) => USE_TENGODS.includes(t)).length;

    // Body occupying guest = reverse situation
    const guestBodyCount = guestTenGods.filter((t: string) => BODY_TENGODS.includes(t)).length;
    const hostUseCount = hostTenGods.filter((t: string) => USE_TENGODS.includes(t)).length;

    const isReverse = guestBodyCount > hostBodyCount || hostUseCount > guestUseCount;
    const isNormal = hostBodyCount >= 1 && guestUseCount >= 1;

    let config = '其他';
    if (isNormal && !isReverse) config = '家内取家外';
    else if (isReverse) config = '反局';

    return { hostStems, guestStems, hostTenGods, guestTenGods, hostWuxing, guestWuxing, config, isReverse };
  }

  // ========== 体用分类 (1.2 身/体/用) ==========

  private classifyBodyUse(d: any, tenGodCounts: Record<string, number>) {
    let bodyCount = 0;
    let useCount = 0;
    for (const tg of BODY_TENGODS) bodyCount += tenGodCounts[tg] || 0;
    for (const tg of USE_TENGODS) useCount += tenGodCounts[tg] || 0;

    // Also count 禄 (day branch or hour branch matching the ten god's element)
    const dayZhi = d.day_pillar?.zhi || '';
    if (dayZhi === d.day_master + '的禄') bodyCount++;

    let balance: string;
    const ratio = useCount > 0 ? bodyCount / useCount : 99;
    if (ratio >= 0.7 && ratio <= 1.5) balance = '体用相当';
    else if (ratio < 0.7) balance = '体弱用旺';
    else balance = '体旺用弱';

    return { bodyCount, useCount, balance };
  }

  // ========== 做功检测 (第二篇 做功体系) ==========

  private detectWork(
    d: any,
    hostGuest: any,
    bodyUse: any,
    tenGodCounts: Record<string, number>,
  ) {
    const details: string[] = [];
    let workType = '无功';
    let efficiency = 0;

    // Relations data from calendar engine
    const relations = d.relations || {};

    // Check 制用 (restraint) - most efficient
    const hasShiShangZhiSha = (tenGodCounts['食神'] || 0) + (tenGodCounts['伤官'] || 0) >= 2 &&
      (tenGodCounts['七杀'] || 0) >= 1;
    const hasBiJieZhiCai = (tenGodCounts['比肩'] || 0) + (tenGodCounts['劫财'] || 0) >= 2 &&
      (tenGodCounts['正财'] || 0) + (tenGodCounts['偏财'] || 0) >= 1;

    // Check 化用 (transform)
    const hasShaYinXiangSheng = (tenGodCounts['七杀'] || 0) >= 1 &&
      ((tenGodCounts['正印'] || 0) + (tenGodCounts['偏印'] || 0)) >= 1;
    const hasGuanYinXiangSheng = (tenGodCounts['正官'] || 0) >= 1 &&
      ((tenGodCounts['正印'] || 0) + (tenGodCounts['偏印'] || 0)) >= 1;

    // Check 生用泄用
    const hasShiShangShengCai = ((tenGodCounts['食神'] || 0) + (tenGodCounts['伤官'] || 0)) >= 1 &&
      ((tenGodCounts['正财'] || 0) + (tenGodCounts['偏财'] || 0)) >= 1;

    // Check 合用 - day stem or day branch combines with wealth/official
    const dayGan = d.day_pillar?.gan || '';
    const dayZhi = d.day_pillar?.zhi || '';
    // 阴日干合官, 阳日干合财 (日干五合规则)
    const ganCombineMap: Record<string, { target: string; type: string }> = {
      '甲': { target: '己', type: '合财' }, '己': { target: '甲', type: '合官' },
      '乙': { target: '庚', type: '合官' }, '庚': { target: '乙', type: '合财' },
      '丙': { target: '辛', type: '合财' }, '辛': { target: '丙', type: '合官' },
      '丁': { target: '壬', type: '合官' }, '壬': { target: '丁', type: '合财' },
      '戊': { target: '癸', type: '合财' }, '癸': { target: '戊', type: '合官' },
    };
    const ganCombine = ganCombineMap[dayGan];

    // Check 墓用 (tomb/storage) - look for specific tomb patterns
    const tombMap: Record<string, string> = { '寅': '未', '申': '丑', '巳': '戌', '亥': '辰' };
    const dayZhiTomb = tombMap[dayZhi];

    // Check for power blocks (库冲)
    const hasKuChong = this.detectKuChong(d);

    // Determine work type and efficiency
    if (hasKuChong) {
      workType = '墓用（开库）';
      efficiency = 95;
      details.push('财官临库冲开发用');
    } else if (hasShiShangZhiSha) {
      workType = '制用（食伤制官杀）';
      efficiency = 85;
      details.push('食伤制官杀做功');
    } else if (hasShaYinXiangSheng) {
      workType = '化用（杀印相生）';
      efficiency = 90;
      details.push('七杀得印化，化杀为权');
    } else if (hasGuanYinXiangSheng) {
      workType = '化用（官印相生）';
      efficiency = 80;
      details.push('官印相生，权柄在握');
    } else if (hasShiShangShengCai) {
      workType = '生用泄用（食伤生财）';
      efficiency = 75;
      details.push('食伤生财，才华变现');
    } else if (hasBiJieZhiCai) {
      workType = '制用（比劫制财）';
      efficiency = 40;
      details.push('比劫制财，体力劳动求财');
    } else if (ganCombine) {
      workType = `合用（日主${ganCombine.type}）`;
      efficiency = 65;
      details.push(`日干${dayGan}合${ganCombine.target}，${ganCombine.type}做功`);
    }

    // Adjust for cross-boundary (家外制用 = higher efficiency)
    if (hostGuest.config === '家内取家外' && efficiency > 0) {
      efficiency = Math.min(100, efficiency + 10);
      details.push('家内之体取家外之用，层级放大');
    }
    if (hostGuest.isReverse && efficiency > 0) {
      efficiency = Math.min(100, efficiency + 5);
      details.push('反局做功，富贵加倍');
    }

    const level = efficiency >= 90 ? '最高' : efficiency >= 70 ? '高' : efficiency >= 40 ? '中' : efficiency > 0 ? '低' : '无';

    return { type: workType, efficiency, level, details };
  }

  private detectKuChong(d: any): boolean {
    // Check for 丑未冲 or 辰戌冲 (tomb clashes - highest efficiency)
    const relations = d.relations || {};
    if (typeof relations !== 'object') return false;
    const relStr = JSON.stringify(relations);
    return relStr.includes('丑未冲') || relStr.includes('辰戌冲');
  }

  // ========== 势检测 (第三篇 势与格局) ==========

  private detectPower(d: any) {
    const wuxingScore = d.wuxing_score || {};
    const scores: { element: string; score: number }[] = [];
    for (const [el, val] of Object.entries(wuxingScore)) {
      scores.push({ element: el, score: Number(val) || 0 });
    }
    scores.sort((a, b) => b.score - a.score);

    // 成势判断: highest element >= 40% of total
    const total = scores.reduce((s, x) => s + x.score, 0);
    const dominant = scores[0];
    const ratio = total > 0 ? dominant.score / total : 0;

    const hasPower = ratio >= 0.35 && scores.length >= 2 && dominant.score > scores[1].score * 1.3;
    const strength = dominant.score >= 60 ? '强' : dominant.score >= 35 ? '中' : '弱';

    return {
      hasPower,
      dominantElement: hasPower ? dominant.element : '无',
      strength: hasPower ? strength : '无',
      scores,
    };
  }

  // ========== 层次判断 (1.5 富贵八字根本标准) ==========

  private evaluateLevel(work: any, power: any) {
    const hasWork = work.efficiency > 0;
    const hasPower = power.hasPower;

    let label: string;
    let score: number;

    if (hasPower && hasWork && work.efficiency >= 90) {
      label = '大人物';
      score = 95;
    } else if (hasPower && hasWork) {
      label = '富贵';
      score = 80;
    } else if (hasPower && !hasWork) {
      label = '怀才不遇';
      score = 35;
    } else if (!hasPower && hasWork && work.efficiency >= 50) {
      label = '普通人';
      score = 55;
    } else if (!hasPower && hasWork) {
      label = '普通人';
      score = 40;
    } else {
      label = '穷苦';
      score = 15;
    }

    return { label, score };
  }

  // ========== 直断口诀 (第十一篇 综合口诀集) ==========

  private applyDirectFormulas(
    d: any,
    tenGodCounts: Record<string, number>,
    hostGuest: any,
  ): string[] {
    const rules: string[] = [];

    // 1. 七杀两头挂 (年时柱都见七杀)
    const tenGods = d.ten_gods || {};
    if (tenGods['年柱'] === '七杀' && tenGods['时柱'] === '七杀') {
      rules.push('七杀两头挂：奔波劳碌，晚景多忧');
    }

    // 2. 伤官两头挂
    if (tenGods['年柱'] === '伤官' && tenGods['时柱'] === '伤官') {
      rules.push('伤官两头挂：亲情淡薄，言语尖锐');
    }

    // 3. 食神两头挂
    if ((tenGods['年柱'] === '食神' && tenGods['时柱'] === '食神') ||
        (tenGods['月柱'] === '食神' && tenGods['时柱'] === '食神')) {
      rules.push('食神两头挂：好吃好喝，口福深厚');
    }

    // 4. 财星两头挂
    if ((tenGods['年柱'] === '正财' || tenGods['年柱'] === '偏财') &&
        (tenGods['时柱'] === '正财' || tenGods['时柱'] === '偏财')) {
      rules.push('财星两头挂：出手大方，财来财去');
    }

    // 5. 年月地支相冲 → 早年奔波
    const relations = d.relations || {};
    const relStr = typeof relations === 'string' ? relations : JSON.stringify(relations);
    if ((relStr.includes('寅申冲') || relStr.includes('巳亥冲')) &&
        d.dayun_list && Array.isArray(d.dayun_list)) {
      rules.push('年月驿马冲：早年奔波，多走动变动');
    }

    // 6. 日支坐比劫 → 克妻
    if (d.gender === 1 && (tenGods['日柱'] === '比肩' || tenGods['日柱'] === '劫财')) {
      rules.push('日支坐比劫：婚姻易有波折，注意夫妻关系');
    }

    // 7. 正官数量直断
    const zhengGuanCount = tenGodCounts['正官'] || 0;
    if (zhengGuanCount >= 5) rules.push('正官五重：牢刑难免，须防官非');
    else if (zhengGuanCount >= 4) rules.push('正官四重：多遇困难是非');
    else if (zhengGuanCount >= 3) rules.push('正官三重：压力重重，需防小人');

    // 8. 七杀数量直断
    const qiShaCount = tenGodCounts['七杀'] || 0;
    if (qiShaCount >= 5) rules.push('七杀五重：孤雁短寿，须防意外');
    else if (qiShaCount >= 4) rules.push('七杀四重：易有伤残，行事谨慎');
    else if (qiShaCount >= 3) rules.push('七杀三重：牢狱风险，遵纪守法');
    else if (qiShaCount === 2) rules.push('七杀二重：霸道强势，须防小人');
    else if (qiShaCount === 1 && zhengGuanCount === 0) rules.push('时上七杀一位真：独杀为贵，武职权威');

    // 9. 伤官配印判断
    const shangGuanCount = tenGodCounts['伤官'] || 0;
    const yinCount = (tenGodCounts['正印'] || 0) + (tenGodCounts['偏印'] || 0);
    if (shangGuanCount >= 1 && yinCount >= 1) {
      rules.push('伤官配印：高知精英或怪才鬼才之命');
    }

    // 10. 财气通门户
    const caiCount = (tenGodCounts['正财'] || 0) + (tenGodCounts['偏财'] || 0);
    if (caiCount >= 2 && (tenGods['时柱'] === '正财' || tenGods['时柱'] === '偏财')) {
      rules.push('财气通门户：晚年财运丰足，越老越富');
    }

    // 11. 反局提示
    if (hostGuest.isReverse && (tenGodCounts['正财'] + tenGodCounts['偏财'] >= 2)) {
      rules.push('反局+财旺：用占主位反制宾位，大富贵之象');
    }

    // 12. 有势无功
    if (d.mangpai_has_power === false && d.mangpai_work_type === '无功') {
      // This will only match from computed data - skip for now
    }

    return rules;
  }
}
