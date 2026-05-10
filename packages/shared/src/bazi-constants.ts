// ============================================================================
// 八字核心常量 — 天干 地支 藏干 合冲刑害破 纳音 十二长生 十神
// 与 Python calendar-engine/app/core/constants.py 保持同步
// ============================================================================

import { TIAN_GAN, DI_ZHI, type TianGan, type DiZhi } from './bazi-primitives';

// ==================== 天干 ====================

/** 天干五行 */
export const GAN_WUXING: Record<TianGan, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

/** 天干阴阳 (0=阳, 1=阴) */
export const GAN_YINYANG: Record<TianGan, string> = {
  '甲': '阳', '乙': '阴', '丙': '阳', '丁': '阴', '戊': '阳',
  '己': '阴', '庚': '阳', '辛': '阴', '壬': '阳', '癸': '阴',
};

// ==================== 地支 ====================

/** 地支五行 */
export const ZHI_WUXING: Record<DiZhi, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木',
  '辰': '土', '巳': '火', '午': '火', '未': '土',
  '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

/** 地支阴阳 */
export const ZHI_YINYANG: Record<DiZhi, string> = {
  '子': '阳', '丑': '阴', '寅': '阳', '卯': '阴',
  '辰': '阳', '巳': '阴', '午': '阳', '未': '阴',
  '申': '阳', '酉': '阴', '戌': '阳', '亥': '阴',
};

/** 地支方位 (后天八卦) */
export const ZHI_DIRECTION: Record<DiZhi, string> = {
  '子': '正北', '丑': '东北', '寅': '东北', '卯': '正东',
  '辰': '东南', '巳': '东南', '午': '正南', '未': '西南',
  '申': '西南', '酉': '正西', '戌': '西北', '亥': '西北',
};

/** 地支生肖 */
export const ZHI_ZODIAC: Record<DiZhi, string> = {
  '子': '鼠', '丑': '牛', '寅': '虎', '卯': '兔',
  '辰': '龙', '巳': '蛇', '午': '马', '未': '羊',
  '申': '猴', '酉': '鸡', '戌': '狗', '亥': '猪',
};

/** 地支月份 (节气月, 寅=正月) */
export const ZHI_MONTH: Record<DiZhi, number> = {
  '寅': 1, '卯': 2, '辰': 3, '巳': 4, '午': 5, '未': 6,
  '申': 7, '酉': 8, '戌': 9, '亥': 10, '子': 11, '丑': 12,
};

/** 地支时辰 */
export const ZHI_HOUR: Record<DiZhi, [number, number]> = {
  '子': [23, 1], '丑': [1, 3],   '寅': [3, 5],   '卯': [5, 7],
  '辰': [7, 9],   '巳': [9, 11],  '午': [11, 13], '未': [13, 15],
  '申': [15, 17], '酉': [17, 19], '戌': [19, 21], '亥': [21, 23],
};

// ==================== 地支藏干（本气/中气/余气） ====================

/**
 * 地支藏干完整表
 * 顺序: [本气(主气), 中气, 余气]
 * 本气力量最强, 中气次之, 余气最弱
 */
export const ZHI_CANG_GAN: Record<DiZhi, string[]> = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲'],
};

/** 藏干权重 (用于五行力量计算) */
export const CANG_GAN_WEIGHT = { ben_qi: 1.0, zhong_qi: 0.6, yu_qi: 0.3 } as const;

/** 获取地支的本气 (第一藏干) */
export function getBenQi(zhi: DiZhi): string {
  return ZHI_CANG_GAN[zhi][0];
}

// ==================== 五行生克 ====================

/** 五行相生: A生B => B = WUXING_SHENG[A] */
export const WUXING_SHENG: Record<string, string> = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};

/** 五行相克: A克B => B = WUXING_KE[A] */
export const WUXING_KE: Record<string, string> = {
  '木': '土', '火': '金', '土': '水', '金': '木', '水': '火',
};

/** 生我者 (反查) */
export const WUXING_SHENG_WO: Record<string, string> = {
  '火': '木', '土': '火', '金': '土', '水': '金', '木': '水',
};

/** 克我者 (反查) */
export const WUXING_KE_WO: Record<string, string> = {
  '土': '木', '金': '火', '水': '土', '木': '金', '火': '水',
};

// ==================== 天干关系 ====================

/**
 * 天干五合 (有情之克, 合而化气)
 * 甲己合土 → 中正之合
 * 乙庚合金 → 仁义之合
 * 丙辛合水 → 威制之合
 * 丁壬合木 → 淫匿之合
 * 戊癸合火 → 无情之合
 */
export const GAN_HE: Record<string, string> = {
  '甲': '己', '己': '甲', '乙': '庚', '庚': '乙',
  '丙': '辛', '辛': '丙', '丁': '壬', '壬': '丁',
  '戊': '癸', '癸': '戊',
};

/** 天干五合化气结果 */
export const GAN_HE_RESULT: Record<string, string> = {
  '甲己': '土', '乙庚': '金', '丙辛': '水', '丁壬': '木', '戊癸': '火',
};

/** 天干五合详解 */
export const GAN_HE_DETAIL: Record<string, { pair: string; result: string; name: string; desc: string }> = {
  '甲己': { pair: '甲己', result: '土', name: '中正之合', desc: '甲为阳木, 己为阴土, 合化为土, 主忠厚正直' },
  '乙庚': { pair: '乙庚', result: '金', name: '仁义之合', desc: '乙为阴木, 庚为阳金, 合化为金, 主义气仁德' },
  '丙辛': { pair: '丙辛', result: '水', name: '威制之合', desc: '丙为阳火, 辛为阴金, 合化为水, 主威严果断' },
  '丁壬': { pair: '丁壬', result: '木', name: '淫匿之合', desc: '丁为阴火, 壬为阳水, 合化为木, 主仁寿多情' },
  '戊癸': { pair: '戊癸', result: '火', name: '无情之合', desc: '戊为阳土, 癸为阴水, 合化为火, 主貌合神离' },
};

/**
 * 天干相冲 (阳克阳/阴克阴, 同性相斥)
 * 甲庚冲、乙辛冲、丙壬冲、丁癸冲
 */
export const GAN_CHONG: Record<string, string> = {
  '甲': '庚', '庚': '甲', '乙': '辛', '辛': '乙',
  '丙': '壬', '壬': '丙', '丁': '癸', '癸': '丁',
};

// ==================== 地支关系 ====================

/**
 * 地支六合 (子丑合土、寅亥合木、卯戌合火、辰酉合金、巳申合水、午未合土)
 * 六合为有情之合, 力量较强
 */
export const ZHI_LIU_HE: Record<DiZhi, DiZhi> = {
  '子': '丑', '丑': '子', '寅': '亥', '亥': '寅',
  '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰',
  '巳': '申', '申': '巳', '午': '未', '未': '午',
};

/** 地支六合化气结果 */
export const ZHI_LIU_HE_RESULT: Record<string, string> = {
  '子丑': '土', '寅亥': '木', '卯戌': '火', '辰酉': '金', '巳申': '水', '午未': '土',
};

/**
 * 地支六冲 (子午冲、丑未冲、寅申冲、卯酉冲、辰戌冲、巳亥冲)
 * 六冲为无情之冲, 力量最大, 方位相对
 */
export const ZHI_LIU_CHONG: Record<DiZhi, DiZhi> = {
  '子': '午', '午': '子', '丑': '未', '未': '丑',
  '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
};

/**
 * 地支三合局 (长生+帝旺+墓库 三合化一行)
 * 申子辰合水、寅午戌合火、巳酉丑合金、亥卯未合木
 * 三合为五行之气的完整循环, 力量最大
 */
export const ZHI_SAN_HE: Record<string, string> = {
  '申子辰': '水', '寅午戌': '火', '巳酉丑': '金', '亥卯未': '木',
};

/** 三合局的三个位置: [长生, 帝旺, 墓库] */
export const ZHI_SAN_HE_POSITION: Record<string, [DiZhi, DiZhi, DiZhi]> = {
  '水': ['申', '子', '辰'],
  '火': ['寅', '午', '戌'],
  '金': ['巳', '酉', '丑'],
  '木': ['亥', '卯', '未'],
};

/**
 * 地支半合 (缺少帝旺, 力量弱于三合但仍有情)
 * 如: 申子半合水 (缺辰), 子辰半合水 (缺申)
 */
export function getBanHe(zhi1: DiZhi, zhi2: DiZhi): string | null {
  for (const [triple, wx] of Object.entries(ZHI_SAN_HE)) {
    const members = triple.match(/.{1}/g) as [string, string, string];
    // 长生+帝旺 (前半合)
    if ((zhi1 === members[0] && zhi2 === members[1]) || (zhi1 === members[1] && zhi2 === members[0])) {
      return wx;
    }
    // 帝旺+墓库 (后半合)
    if ((zhi1 === members[1] && zhi2 === members[2]) || (zhi1 === members[2] && zhi2 === members[1])) {
      return wx;
    }
  }
  return null;
}

/**
 * 地支三会方 (寅卯辰会木、巳午未会火、申酉戌会金、亥子丑会水)
 * 三会为同方位三支聚会, 力量强于三合, 拱出五行之气最为纯粹
 */
export const ZHI_SAN_HUI: Record<string, string> = {
  '寅卯辰': '木', '巳午未': '火', '申酉戌': '金', '亥子丑': '水',
};

/**
 * 地支相刑
 * 无恩之刑: 寅刑巳 → 巳刑申 → 申刑寅 (循环)
 * 恃势之刑: 丑刑戌 → 戌刑未 → 未刑丑 (循环)
 * 无礼之刑: 子刑卯 ↔ 卯刑子 (互刑)
 * 自刑: 辰辰、午午、酉酉、亥亥
 */
export const ZHI_XIANG_XING: Record<DiZhi, DiZhi> = {
  '寅': '巳', '巳': '申', '申': '寅',
  '丑': '戌', '戌': '未', '未': '丑',
  '子': '卯', '卯': '子',
};

/** 自刑四支 */
export const ZI_XING: DiZhi[] = ['辰', '午', '酉', '亥'];

/**
 * 地支相害 (六害, 由六合被冲而来)
 * 子未害、丑午害、寅巳害、卯辰害、申亥害、酉戌害
 */
export const ZHI_XIANG_HAI: Record<DiZhi, DiZhi> = {
  '子': '未', '未': '子', '丑': '午', '午': '丑',
  '寅': '巳', '巳': '寅', '卯': '辰', '辰': '卯',
  '申': '亥', '亥': '申', '酉': '戌', '戌': '酉',
};

/**
 * 地支相破
 * 子酉破、丑辰破、寅亥破、卯午破、巳申破、未戌破
 */
export const ZHI_XIANG_PO: Record<DiZhi, DiZhi> = {
  '子': '酉', '酉': '子', '丑': '辰', '辰': '丑',
  '寅': '亥', '亥': '寅', '卯': '午', '午': '卯',
  '巳': '申', '申': '巳', '未': '戌', '戌': '未',
};

/**
 * 地支六合暗合 (虽合但藏干不通气, 关系隐蔽)
 * 用于判断暗合、偷合等隐蔽关系
 */
export const ZHI_AN_HE: Record<string, string[]> = {
  '寅': ['午', '戌'],  // 寅午戌三合火, 寅为长生
  '午': ['寅', '戌'],  // 午为帝旺
  '戌': ['寅', '午'],  // 戌为墓库
  '申': ['子', '辰'],  // 申子辰三合水
  '子': ['申', '辰'],
  '辰': ['申', '子'],
  '巳': ['酉', '丑'],  // 巳酉丑三合金
  '酉': ['巳', '丑'],
  '丑': ['巳', '酉'],
  '亥': ['卯', '未'],  // 亥卯未三合木
  '卯': ['亥', '未'],
  '未': ['亥', '卯'],
};

// ==================== 六十甲子纳音 ====================

export const NAYIN_TABLE: Record<string, string> = {
  '甲子': '海中金', '乙丑': '海中金', '丙寅': '炉中火', '丁卯': '炉中火',
  '戊辰': '大林木', '己巳': '大林木', '庚午': '路旁土', '辛未': '路旁土',
  '壬申': '剑锋金', '癸酉': '剑锋金', '甲戌': '山头火', '乙亥': '山头火',
  '丙子': '涧下水', '丁丑': '涧下水', '戊寅': '城头土', '己卯': '城头土',
  '庚辰': '白蜡金', '辛巳': '白蜡金', '壬午': '杨柳木', '癸未': '杨柳木',
  '甲申': '泉中水', '乙酉': '泉中水', '丙戌': '屋上土', '丁亥': '屋上土',
  '戊子': '霹雳火', '己丑': '霹雳火', '庚寅': '松柏木', '辛卯': '松柏木',
  '壬辰': '长流水', '癸巳': '长流水', '甲午': '砂石金', '乙未': '砂石金',
  '丙申': '山下火', '丁酉': '山下火', '戊戌': '平地木', '己亥': '平地木',
  '庚子': '壁上土', '辛丑': '壁上土', '壬寅': '金箔金', '癸卯': '金箔金',
  '甲辰': '覆灯火', '乙巳': '覆灯火', '丙午': '天河水', '丁未': '天河水',
  '戊申': '大驿土', '己酉': '大驿土', '庚戌': '钗钏金', '辛亥': '钗钏金',
  '壬子': '桑柘木', '癸丑': '桑柘木', '甲寅': '大溪水', '乙卯': '大溪水',
  '丙辰': '沙中土', '丁巳': '沙中土', '戊午': '天上火', '己未': '天上火',
  '庚申': '石榴木', '辛酉': '石榴木', '壬戌': '大海水', '癸亥': '大海水',
};

// ==================== 旬空 (空亡) ====================

/** 六甲旬空亡表 */
export const XUN_KONG: Record<string, [DiZhi, DiZhi]> = {
  '甲子': ['戌', '亥'], '甲戌': ['申', '酉'], '甲申': ['午', '未'],
  '甲午': ['辰', '巳'], '甲辰': ['寅', '卯'], '甲寅': ['子', '丑'],
};

/** 获取干支所在旬的旬头 */
export function getXunHead(gan: TianGan, zhi: DiZhi): string {
  const gIdx = TIAN_GAN.indexOf(gan);
  const zIdx = DI_ZHI.indexOf(zhi);
  const headZhiIdx = (zIdx - gIdx + 12) % 12;
  return `甲${DI_ZHI[headZhiIdx]}`;
}

/** 获取日柱所在旬的空亡二支 */
export function getKongWang(dayGan: TianGan, dayZhi: DiZhi): DiZhi[] {
  const xunHead = getXunHead(dayGan, dayZhi);
  return XUN_KONG[xunHead] || [];
}

// ==================== 十二长生 ====================

export const CHANG_SHENG_NAMES = [
  '长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养',
] as const;

export type ChangShengName = typeof CHANG_SHENG_NAMES[number];

/** 十天干长生起算地支索引 (阳干顺排, 阴干逆排) */
export const CHANG_SHENG_START: Record<TianGan, DiZhi> = {
  '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉', '戊': '寅',
  '己': '酉', '庚': '巳', '辛': '子', '壬': '申', '癸': '卯',
};

/** 计算某天干在某地支的十二长生状态 */
export function getChangSheng(gan: TianGan, zhi: DiZhi): ChangShengName {
  const ganIdx = TIAN_GAN.indexOf(gan);
  const isYang = ganIdx % 2 === 0;
  const startZhi = CHANG_SHENG_START[gan];
  const startIdx = DI_ZHI.indexOf(startZhi);
  const zhiIdx = DI_ZHI.indexOf(zhi);
  const offset = isYang ? (zhiIdx - startIdx + 12) % 12 : (startIdx - zhiIdx + 12) % 12;
  return CHANG_SHENG_NAMES[offset];
}

// ==================== 十神 ====================

const WUXING_ORDER = ['木', '火', '土', '金', '水'] as const;

/**
 * 根据日主天干和另一天干推算十神
 * 生我者印 (正印/偏印), 我生者食伤 (食神/伤官)
 * 克我者官杀 (正官/七杀), 我克者财 (正财/偏财)
 * 同我者比劫 (比肩/劫财)
 */
export function getTenGod(dayMaster: TianGan, otherGan: TianGan): string {
  if (dayMaster === otherGan) return '比肩';

  const dmIdx = TIAN_GAN.indexOf(dayMaster);
  const otIdx = TIAN_GAN.indexOf(otherGan);
  const dmYinYang = dmIdx % 2; // 0=阳 1=阴
  const otYinYang = otIdx % 2;
  const samePolarity = dmYinYang === otYinYang;

  const dmWx = GAN_WUXING[dayMaster];
  const otWx = GAN_WUXING[otherGan];

  if (dmWx === otWx) {
    return samePolarity ? '比肩' : '劫财';
  }

  const dmWi = WUXING_ORDER.indexOf(dmWx as typeof WUXING_ORDER[number]);
  const otWi = WUXING_ORDER.indexOf(otWx as typeof WUXING_ORDER[number]);

  // 生我者 → 印
  const shengWo = WUXING_ORDER[(dmWi - 1 + 5) % 5];
  if (otWx === shengWo) {
    return samePolarity ? '偏印' : '正印';
  }

  // 我生者 → 食伤
  const woSheng = WUXING_ORDER[(dmWi + 1) % 5];
  if (otWx === woSheng) {
    return samePolarity ? '食神' : '伤官';
  }

  // 我克者 → 财
  const woKe = WUXING_ORDER[(dmWi + 2) % 5];
  if (otWx === woKe) {
    return samePolarity ? '偏财' : '正财';
  }

  // 克我者 → 官杀
  const keWo = WUXING_ORDER[(dmWi - 2 + 5) % 5];
  if (otWx === keWo) {
    return samePolarity ? '七杀' : '正官';
  }

  return '未知';
}

/** 十神对应的六亲含义 */
export const TEN_GOD_MEANING: Record<string, string> = {
  '正官': '克我之阳克阴/阴克阳: 女命为夫, 男命为子女; 主功名、纪律、约束',
  '七杀': '克我之阳克阳/阴克阴: 女命为偏夫, 男命为子女; 主权势、压力、竞争',
  '正印': '生我之阳生阴/阴生阳: 不论男女为母; 主学业、仁慈、保护',
  '偏印': '生我之阳生阳/阴生阴: 不论男女为继母; 主偏业、悟性、孤独',
  '比肩': '同我同性: 兄弟姐妹、朋友; 主竞争、自立、固执',
  '劫财': '同我异性: 兄弟姐妹、朋友; 主合作、争夺、豪爽',
  '食神': '我生同性: 女命为女, 男命为婿; 主才华、口福、温和',
  '伤官': '我生异性: 女命为子, 男命为孙女; 主聪明、傲气、叛逆',
  '正财': '我克异性: 不论男女为妻; 主稳定收入、节俭、务实',
  '偏财': '我克同性: 不论男女为父; 主横财、慷慨、投机',
};

// ==================== 天干十神速查表 (按日主) ====================

/**
 * 生成某日主对所有天干的十神速查表
 * 用法: GAN_SHENGOD_TABLE['甲']['己'] → '正财'
 */
export function buildTenGodTable(dayMaster: TianGan): Record<TianGan, string> {
  const table: Record<string, string> = {};
  for (const gan of TIAN_GAN) {
    table[gan] = getTenGod(dayMaster, gan);
  }
  return table;
}

// ==================== 地支藏干十神 ====================

/**
 * 获取某日主对某地支所有藏干的十神
 * 返回 [{藏干: 十神, weight: 权重}] 列表
 */
export function getZhiTenGods(
  dayMaster: TianGan,
  zhi: DiZhi,
): { gan: string; tenGod: string; weight: number }[] {
  const cangGan = ZHI_CANG_GAN[zhi];
  return cangGan.map((gan, i) => ({
    gan,
    tenGod: getTenGod(dayMaster, gan as TianGan),
    weight: i === 0 ? CANG_GAN_WEIGHT.ben_qi : i === 1 ? CANG_GAN_WEIGHT.zhong_qi : CANG_GAN_WEIGHT.yu_qi,
  }));
}

// ==================== 综合关系检测 ====================

export interface GanZhiRelation {
  type: string;        // 关系类型: 合/冲/刑/害/破/三合/三会
  positions: string[]; // 涉及位置: year/month/day/hour
  elements: string[];  // 涉及元素
  result: string;      // 关系结果 (如合化五行)
}

/**
 * 检测两个天干之间的所有关系
 */
export function detectGanRelations(g1: TianGan, g2: TianGan): string[] {
  const rels: string[] = [];
  // 五合
  if (GAN_HE[g1] === g2) rels.push('天干五合');
  // 相冲
  if (GAN_CHONG[g1] === g2) rels.push('天干相冲');
  return rels;
}

/**
 * 检测两个地支之间的所有关系
 */
export function detectZhiRelations(z1: DiZhi, z2: DiZhi): string[] {
  const rels: string[] = [];
  // 六合
  if (ZHI_LIU_HE[z1] === z2) rels.push('地支六合');
  // 六冲
  if (ZHI_LIU_CHONG[z1] === z2) rels.push('地支六冲');
  // 相刑
  if (ZHI_XIANG_XING[z1] === z2) rels.push('地支相刑');
  // 相害
  if (ZHI_XIANG_HAI[z1] === z2) rels.push('地支相害');
  // 相破
  if (ZHI_XIANG_PO[z1] === z2) rels.push('地支相破');
  // 半合
  if (getBanHe(z1, z2)) rels.push('地支半合');
  return rels;
}

// ==================== 用神 ====================

export const YONG_SHEN_LIST = [
  '正官', '七杀', '正印', '偏印', '正财', '偏财',
  '食神', '伤官', '比肩', '劫财',
] as const;
