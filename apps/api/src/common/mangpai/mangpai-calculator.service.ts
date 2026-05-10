import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
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

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async onModuleInit() {
    await this.autoImportRules();
    // Clear all rule caches so the engine picks up new/updated rules immediately
    await this.redis.del('rules:*').catch(() => {});
  }

  /** Auto-import ALL rules from JSON files on startup (mangpai + patterns + ten-gods + shensha + dayun + wealth + hehun + yongshen + partner + risk) */
  private async autoImportRules() {
    const rulesRootDir = path.resolve(__dirname, '../../../../rules');
    if (!fs.existsSync(rulesRootDir)) {
      this.logger.warn(`规则目录不存在: ${rulesRootDir}`);
      return;
    }

    // All module directories and their JSON files
    const moduleFiles: Record<string, string> = {
      // mangpai (8 files)
      mangpai_work: 'mangpai/mangpai-work-rules.json',
      mangpai_power: 'mangpai/mangpai-power-rules.json',
      mangpai_body_guest: 'mangpai/mangpai-body-guest-rules.json',
      mangpai_tengods_direct: 'mangpai/mangpai-tengods-direct-rules.json',
      mangpai_shensha: 'mangpai/mangpai-shensha-rules.json',
      mangpai_marriage: 'mangpai/mangpai-marriage-rules.json',
      mangpai_career: 'mangpai/mangpai-career-rules.json',
      mangpai_health: 'mangpai/mangpai-health-rules.json',
      // mangpai direct judgment (5 files)
      mangpai_marriage_direct: 'mangpai/mangpai-marriage-direct.json',
      mangpai_health_direct: 'mangpai/mangpai-health-direct.json',
      mangpai_career_direct: 'mangpai/mangpai-career-direct.json',
      mangpai_wealth_direct: 'mangpai/mangpai-wealth-direct.json',
      mangpai_disaster_direct: 'mangpai/mangpai-disaster-direct.json',
      // patterns, ten-gods, shensha, dayun, wealth, hehun, yongshen, partner, risk
      pattern: 'patterns/pattern-rules.json',
      ten_gods: 'ten-gods/ten-gods-rules.json',
      shensha: 'shensha/shensha-rules.json',
      dayun: 'dayun/dayun-rules.json',
      wealth: 'wealth/wealth-rules.json',
      hehun: 'hehun/hehun-rules.json',
      yongshen: 'yongshen/yongshen-rules.json',
      partner: 'partner/partner-rules.json',
      risk: 'risk/risk-rules.json',
      // xiaoliuren
      xiaoliuren: 'xiaoliuren/xiaoliuren-rules.json',
      // digital-energy
      digital_energy: 'digital-energy/digital-energy-rules.json',
      bazhai: 'bazhai/bazhai-rules.json',
      health: 'health/health-rules.json',
    };

    let totalCreated = 0;
    let totalUpdated = 0;

    for (const [module, filename] of Object.entries(moduleFiles)) {
      const filePath = path.join(rulesRootDir, filename);
      if (!fs.existsSync(filePath)) {
        this.logger.warn(`规则文件不存在: ${filePath}`);
        continue;
      }

      try {
        const rules = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        for (const rule of rules) {
          if (!rule.rule_id) continue;
          const existing = await this.prisma.rule.findUnique({ where: { ruleId: rule.rule_id } });
          if (existing) {
            await this.prisma.rule.update({
              where: { ruleId: rule.rule_id },
              data: {
                module: rule.module || module,
                name: rule.name,
                version: rule.version || '1.0.0',
                priority: rule.priority || 100,
                conditions: rule.conditions,
                actions: rule.actions,
                isActive: true,
              },
            });
            totalUpdated++;
          } else {
            await this.prisma.rule.create({
              data: {
                ruleId: rule.rule_id,
                module: rule.module || module,
                name: rule.name,
                description: null,
                version: rule.version || '1.0.0',
                priority: rule.priority || 100,
                conditions: rule.conditions,
                actions: rule.actions,
                isActive: true,
              },
            });
            totalCreated++;
          }
        }
      } catch (e) {
        this.logger.warn(`规则文件导入失败: ${filename} — ${(e as Error).message}`);
      }
    }

    if (totalCreated > 0 || totalUpdated > 0) {
      this.logger.log(`全部规则自动导入完成: 新增 ${totalCreated} 条, 更新 ${totalUpdated} 条 (${Object.keys(moduleFiles).length} 个模块)`);
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

    // Check for tomb clashes (库冲) and identify specific types
    const hasKuChong = this.detectKuChong(d);
    const hasChouWeiChong = this.detectSpecificKuChong(d, '丑未冲');
    const hasChenXuChong = this.detectSpecificKuChong(d, '辰戌冲');
    const totalCai = (tenGodCounts['正财'] || 0) + (tenGodCounts['偏财'] || 0);
    const totalSha = tenGodCounts['七杀'] || 0;
    const totalGuan = tenGodCounts['正官'] || 0;
    const totalYin = (tenGodCounts['正印'] || 0) + (tenGodCounts['偏印'] || 0);
    const totalShiShang = (tenGodCounts['食神'] || 0) + (tenGodCounts['伤官'] || 0);
    const totalBiJie = (tenGodCounts['比肩'] || 0) + (tenGodCounts['劫财'] || 0);

    // 日主禄位映射
    const LU_POSITION: Record<string, string> = {
      '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午',
      '戊': '巳', '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子',
    };
    const dayLu = LU_POSITION[dayGan] || '';
    const isYinLuXiangSui = totalYin >= 2 && dayZhi === dayLu;
    // 年月财官到家：年月为财/官 + 日时为印/比 + 家内取家外
    const tenGods = d.ten_gods || {};
    const yearTG = tenGods['年柱'] || '';
    const monthTG = tenGods['月柱'] || '';
    const dayTG = tenGods['日柱'] || '';
    const hourTG = tenGods['时柱'] || '';
    const isYearMonthCaiGuan = ['正财','偏财','正官','七杀'].includes(yearTG) ||
      ['正财','偏财','正官','七杀'].includes(monthTG);
    const isDayHourYinBi = ['正印','偏印','比肩','劫财'].includes(dayTG) ||
      ['正印','偏印','比肩','劫财'].includes(hourTG);
    const hasNianYueCaiGuanDaoJia = isYearMonthCaiGuan && isDayHourYinBi &&
      hostGuest.config === '家内取家外';
    // 羊刃合杀
    const hasYangRen = (d.shensha_list || []).some((s: string) => s.includes('羊刃'));
    const hasYangRenHeSha = hasYangRen && totalSha >= 1 &&
      (['比肩','劫财'].includes(dayTG) || ['比肩','劫财'].includes(hourTG));
    // 比劫合财
    const hasBiJieHeCai = totalBiJie >= 2 && totalCai >= 1 && !!ganCombine;

    // Determine work type and efficiency (higher efficiency checked first)
    if (hasChenXuChong && totalGuan >= 1) {
      workType = '开官杀库';
      efficiency = 100;
      details.push('辰戌冲开官杀库，得权得势');
    } else if (hasChenXuChong && totalCai >= 1) {
      workType = '开财库';
      efficiency = 98;
      details.push('辰戌冲开财库，横发之财');
    } else if (hasChouWeiChong && totalGuan >= 1) {
      workType = '开官杀库';
      efficiency = 100;
      details.push('丑未冲开官杀库，得权得势');
    } else if (hasChouWeiChong && totalCai >= 1) {
      workType = '开财库';
      efficiency = 98;
      details.push('丑未冲开财库，横发之财');
    } else if (hasChouWeiChong && totalShiShang >= 1) {
      workType = '开食伤库';
      efficiency = 95;
      details.push('丑未冲开食伤库，才华爆发');
    } else if (hasChenXuChong && totalShiShang >= 1) {
      workType = '开食伤库';
      efficiency = 95;
      details.push('辰戌冲开食伤库，才华爆发');
    } else if (hasKuChong) {
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
    } else if (isYinLuXiangSui) {
      workType = '印禄相随';
      efficiency = 75;
      details.push('印星生身，禄神在位，福泽深厚');
    } else if (hasGuanYinXiangSheng) {
      workType = '化用（官印相生）';
      efficiency = 80;
      details.push('官印相生，权柄在握');
    } else if (hasShiShangShengCai) {
      workType = '生用泄用（食伤生财）';
      efficiency = 75;
      details.push('食伤生财，才华变现');
    } else if (hasYangRenHeSha) {
      workType = '羊刃合杀';
      efficiency = 60;
      details.push('羊刃合杀，以武制敌，武职权威');
    } else if (hasNianYueCaiGuanDaoJia) {
      workType = '年月财官到家';
      efficiency = 65;
      details.push('年月财官为宾位之用，日时印比为主位之体，家内取家外');
    } else if (ganCombine && totalBiJie >= 2) {
      workType = '比劫合财';
      efficiency = 50;
      details.push('比劫合财，合伙求财');
    } else if (ganCombine) {
      workType = `合用（日主${ganCombine.type}）`;
      efficiency = 65;
      details.push(`日干${dayGan}合${ganCombine.target}，${ganCombine.type}做功`);
    } else if (hasBiJieZhiCai) {
      workType = '制用（比劫制财）';
      efficiency = 40;
      details.push('比劫制财，体力劳动求财');
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
    const relations = d.relations || {};
    if (typeof relations !== 'object') return false;
    const relStr = JSON.stringify(relations);
    return relStr.includes('丑未冲') || relStr.includes('辰戌冲');
  }

  /** Detect a specific tomb clash type (e.g. '丑未冲' or '辰戌冲') */
  private detectSpecificKuChong(d: any, clashType: string): boolean {
    const relations = d.relations || {};
    if (typeof relations !== 'object') return false;
    const relStr = JSON.stringify(relations);
    return relStr.includes(clashType);
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
    const tenGods = d.ten_gods || {};
    const relations = d.relations || {};
    const relStr = typeof relations === 'string' ? relations : JSON.stringify(relations);
    const gender = d.gender || 1;
    const zhengGuanCount = tenGodCounts['正官'] || 0;
    const qiShaCount = tenGodCounts['七杀'] || 0;
    const zhengYinCount = tenGodCounts['正印'] || 0;
    const pianYinCount = tenGodCounts['偏印'] || 0;
    const yinCount = zhengYinCount + pianYinCount;
    const shangGuanCount = tenGodCounts['伤官'] || 0;
    const shiShenCount = tenGodCounts['食神'] || 0;
    const zhengCaiCount = tenGodCounts['正财'] || 0;
    const pianCaiCount = tenGodCounts['偏财'] || 0;
    const caiCount = zhengCaiCount + pianCaiCount;
    const biJianCount = tenGodCounts['比肩'] || 0;
    const jieCaiCount = tenGodCounts['劫财'] || 0;
    const biJieCount = biJianCount + jieCaiCount;
    const shiShangCount = shangGuanCount + shiShenCount;

    // ===== 两头挂口诀 (1-4) =====
    if (tenGods['年柱'] === '七杀' && tenGods['时柱'] === '七杀') {
      rules.push('七杀两头挂：奔波劳碌，晚景多忧');
    }
    if (tenGods['年柱'] === '伤官' && tenGods['时柱'] === '伤官') {
      rules.push('伤官两头挂：亲情淡薄，言语尖锐');
    }
    if ((tenGods['年柱'] === '食神' && tenGods['时柱'] === '食神') ||
        (tenGods['月柱'] === '食神' && tenGods['时柱'] === '食神')) {
      rules.push('食神两头挂：好吃好喝，口福深厚');
    }
    if ((tenGods['年柱'] === '正财' || tenGods['年柱'] === '偏财') &&
        (tenGods['时柱'] === '正财' || tenGods['时柱'] === '偏财')) {
      rules.push('财星两头挂：出手大方，财来财去');
    }

    // ===== 驿马冲 (5) =====
    if ((relStr.includes('寅申冲') || relStr.includes('巳亥冲')) &&
        d.dayun_list && Array.isArray(d.dayun_list)) {
      rules.push('年月驿马冲：早年奔波，多走动变动');
    }

    // ===== 婚姻直断 (6-12) =====
    // 男命日支坐比劫 → 克妻
    if (gender === 1 && (tenGods['日柱'] === '比肩' || tenGods['日柱'] === '劫财')) {
      rules.push('日支坐比劫（男命）：婚姻宫被比劫占据，妻星无位，必主婚姻波折，克妻再娶难免');
    }
    // 女命日支坐比劫 → 争夫
    if (gender === 2 && (tenGods['日柱'] === '比肩' || tenGods['日柱'] === '劫财')) {
      rules.push('日支坐比劫（女命）：婚姻宫被比劫占据，夫星无位，感情多竞争，配偶易有外情');
    }
    // 配偶星被合
    if (gender === 1 && relStr.includes('合') && (zhengCaiCount > 0 || pianCaiCount > 0)) {
      rules.push('男命财星被合：正财/偏财被其他干支合走，配偶易被他人争夺，婚姻不稳');
    }
    if (gender === 2 && relStr.includes('合') && (zhengGuanCount > 0 || qiShaCount > 0)) {
      rules.push('女命官星被合：正官/七杀被其他干支合走，丈夫易有外遇，婚姻危机');
    }
    // 天克地冲日柱
    if (relStr.includes('天克地冲') && relStr.includes('日柱')) {
      rules.push('天克地冲日柱：婚姻宫被冲克，夫妻关系紧张，中年婚姻危机甚至生离死别');
    }
    // 配偶星空亡
    const kongWang = d.kong_wang || {};
    const kongWangStr = JSON.stringify(kongWang);
    if (gender === 1 && (kongWangStr.includes('正财') || kongWangStr.includes('偏财'))) {
      rules.push('男命财星空亡：妻星空亡，婚姻有名无实，或配偶体弱多病，或聚少离多');
    }
    if (gender === 2 && (kongWangStr.includes('正官') || kongWangStr.includes('七杀'))) {
      rules.push('女命官星空亡：夫星空亡，婚姻有名无实，或丈夫体弱多病，或长期分居');
    }
    // 纯阳/纯阴
    const allPillars = [d.year_pillar?.gan, d.month_pillar?.gan, d.day_pillar?.gan, d.hour_pillar?.gan];
    const allYang = allPillars.every((g: string) => g && '甲丙戊庚壬'.includes(g));
    const allYin = allPillars.every((g: string) => g && '乙丁己辛癸'.includes(g));
    if (allYang) rules.push('四柱纯阳：性格刚强过甚，婚姻多波折，孤独终老之象');
    if (allYin) rules.push('四柱纯阴：性格阴柔过甚，婚姻难成，孤阴不生之象');
    // 配偶星不现
    if (gender === 1 && caiCount === 0) {
      rules.push('男命无财星：妻星不现，婚姻缘薄，晚婚或不婚之命');
    }
    if (gender === 2 && zhengGuanCount === 0 && qiShaCount === 0) {
      rules.push('女命无官杀：夫星不现，婚姻缘薄，晚婚或不婚之命');
    }

    // ===== 十神数量直断 (13-14) =====
    if (zhengGuanCount >= 5) rules.push('正官五重：牢刑难免，须防官非');
    else if (zhengGuanCount >= 4) rules.push('正官四重：多遇困难是非');
    else if (zhengGuanCount >= 3) rules.push('正官三重：压力重重，需防小人');
    if (qiShaCount >= 5) rules.push('七杀五重：孤雁短寿，须防意外');
    else if (qiShaCount >= 4) rules.push('七杀四重：易有伤残，行事谨慎');
    else if (qiShaCount >= 3) rules.push('七杀三重：牢狱风险，遵纪守法');
    else if (qiShaCount === 2) rules.push('七杀二重：霸道强势，须防小人');
    else if (qiShaCount === 1 && zhengGuanCount === 0) rules.push('时上七杀一位真：独杀为贵，武职权威');

    // ===== 特殊格局直断 (15-18) =====
    if (shangGuanCount >= 1 && yinCount >= 1) {
      rules.push('伤官配印：高知精英或怪才鬼才之命，才华横溢，以智慧取胜');
    }
    if (caiCount >= 2 && (tenGods['时柱'] === '正财' || tenGods['时柱'] === '偏财')) {
      rules.push('财气通门户：晚年财运丰足，越老越富，时柱为归宿，财归正位');
    }
    if (hostGuest.isReverse && caiCount >= 2) {
      rules.push('反局+财旺：用占主位反制宾位，大富贵之象，财富可达亿级');
    }
    if (zhengGuanCount >= 1 && qiShaCount >= 1) {
      rules.push('官杀混杂：正官七杀同现，事业多变，岗位不稳，易遭遇多头管理或频繁跳槽');
    }

    // ===== 凶灾直断 (19-23) =====
    if (shangGuanCount >= 1 && zhengGuanCount >= 1 && yinCount === 0) {
      rules.push('伤官见官（无印制）：伤官克官，为祸百端，丢官罢职，口舌是非，女命克夫');
    }
    if (qiShaCount >= 2 && yinCount === 0 && shiShenCount === 0) {
      rules.push('七杀无制：七杀攻身无印化无食制，必主凶灾横祸，健康受损，小人暗算');
    }
    if (relStr.includes('刑')) {
      rules.push('三刑入命：命带三刑，刑伤难免。寅巳申刑主官非牢狱，丑戌未刑主疾病伤灾，子卯刑主桃花纠纷');
    }
    if (d.shensha_list && d.shensha_list.some((s: string) => s.includes('羊刃'))) {
      rules.push('羊刃入命：性刚情烈，易有血光之灾。羊刃逢冲之年必有意外伤害，需特别防范');
    }
    // 天克地冲日柱
    if (relStr.includes('天克地冲')) {
      rules.push('天克地冲：岁运与日柱天克地冲，主该年有大变动，或搬家换职，或婚变伤病');
    }

    // ===== 事业直断 (24-27) =====
    if (shiShangCount >= 3 && caiCount === 0) {
      rules.push('食伤旺而无财：才华无处变现，怀才不遇，清高孤傲，宜走技术专家路线不宜经商');
    }
    if (caiCount >= 2 && yinCount >= 1) {
      rules.push('财破印：财星坏印，为财损德，学业受阻，信誉受损，或因财失势');
    }
    if (pianYinCount >= 1 && shiShenCount >= 1) {
      rules.push('枭神夺食：偏印夺食神，食神为福星，被夺则福薄，健康受损，女命克子');
    }
    if (biJieCount >= 3 && zhengCaiCount >= 1) {
      rules.push('比劫夺财：比劫重重克财，财来财去，合伙破财，不宜与人合资经营');
    }

    // ===== 财运直断 (28-30) =====
    if (caiCount === 0 && shiShangCount === 0) {
      rules.push('财星食伤俱无：求财无路，一生清贫，需靠印星庇荫或体力劳动维生');
    }
    const caiInTomb = (d.year_hidden || []).some((h: string) => caiCount > 0 && ['辰','戌','丑','未'].includes(h)) ||
      (d.month_hidden || []).some((h: string) => caiCount > 0 && ['辰','戌','丑','未'].includes(h)) ||
      (d.day_hidden || []).some((h: string) => caiCount > 0 && ['辰','戌','丑','未'].includes(h)) ||
      (d.hour_hidden || []).some((h: string) => caiCount > 0 && ['辰','戌','丑','未'].includes(h));
    if (caiCount >= 1 && !relStr.includes('冲') && caiInTomb) {
      rules.push('财星入墓不沖：财在墓库之中无沖开之机，财运闭塞，小富靠勤，大富无缘');
    }
    if (d.kong_wang && JSON.stringify(d.kong_wang).includes('财')) {
      rules.push('财星空亡：财落空亡，求财如捕风捉影，财运虚无缥缈，易有财务诈骗');
    }

    // ===== 健康直断 (31-35) =====
    const wuxingCounts = d.wuxing_counts || {};
    if (!wuxingCounts['金'] || wuxingCounts['金'] === 0) rules.push('五行缺金：肺与大肠功能偏弱，易患呼吸系统疾病、皮肤过敏、筋骨酸痛');
    if (!wuxingCounts['木'] || wuxingCounts['木'] === 0) rules.push('五行缺木：肝胆功能偏弱，易患肝胆疾病、筋腱损伤、视力问题、抑郁倾向');
    if (!wuxingCounts['水'] || wuxingCounts['水'] === 0) rules.push('五行缺水：肾与膀胱功能偏弱，易患泌尿系统疾病、腰膝酸软、内分泌失调');
    if (!wuxingCounts['火'] || wuxingCounts['火'] === 0) rules.push('五行缺火：心与小肠功能偏弱，易患心血管疾病、失眠心悸、血液循环问题');
    if (!wuxingCounts['土'] || wuxingCounts['土'] === 0) rules.push('五行缺土：脾胃功能偏弱，易患消化系统疾病、营养不良、肌肉萎缩');
    // 天干冲克对应脏腑
    if (relStr.includes('甲') && relStr.includes('庚')) rules.push('甲庚冲：金木交战，易有头部外伤、肝胆疾病、筋骨疼痛，逢申酉年加重');
    if (relStr.includes('乙') && relStr.includes('辛')) rules.push('乙辛冲：金木交战，易有神经衰弱、肝胆不畅、女性月经不调');
    if (relStr.includes('丙') && relStr.includes('壬')) rules.push('丙壬冲：水火交战，易有眼疾、心律不齐、血压不稳、失眠多梦');
    if (relStr.includes('丁') && relStr.includes('癸')) rules.push('丁癸冲：水火交战，易有心脏疾病、血液循环问题、情绪极度波动');
    // 地支冲害对应器官
    if (relStr.includes('子午冲')) rules.push('子午冲：心肾不交，水火不济，易有失眠、心悸、腰酸、内分泌失调');
    if (relStr.includes('卯酉冲')) rules.push('卯酉冲：金木交战，易有肝胆疾病、筋骨损伤、呼吸系统过敏、血稠');

    return rules;
  }
}
