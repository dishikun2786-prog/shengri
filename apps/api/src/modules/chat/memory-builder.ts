/**
 * 八字命理画像构建器 & 记忆格式化工具
 * 用于将排盘数据转化为结构化的 Mem0 记忆文本
 */

const WUXING_NAMES: Record<string, string> = {
  wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
  mu: '木', huo: '火', tu: '土', jin: '金', shui: '水',
};

const TEN_GOD_NAMES: Record<string, string> = {
  bijian: '比肩', jiecai: '劫财',
  shishen: '食神', shangguan: '伤官',
  piancai: '偏财', zhengcai: '正财',
  qisha: '七杀', zhengguan: '正官',
  pianyin: '偏印', zhengyin: '正印',
};

/**
 * 八字命理专业术语古籍引用库
 * 引用来源：《滴天髓》、《渊海子平》、《三命通会》、《子平真诠》
 */
export const TEN_GOD_CITATIONS: Record<string, { name: string; source: string; quote: string }> = {
  zhengguan: { name: '正官', source: '《渊海子平》', quote: '正官者，甲见辛之类，乃甲之正气官星。' },
  qisha: { name: '七杀', source: '《渊海子平》', quote: '七杀者，甲见庚之类，犹小人也。' },
  zhengyin: { name: '正印', source: '《滴天髓》', quote: '印绶者，畏临官之运。' },
  pianyin: { name: '偏印', source: '《滴天髓》', quote: '枭神夺食，偏印之性。' },
  zhengcai: { name: '正财', source: '《渊海子平》', quote: '正财者，甲见己之类。' },
  piancai: { name: '偏财', source: '《渊海子平》', quote: '偏财者，甲见戊之类。' },
  shishen: { name: '食神', source: '《渊海子平》', quote: '食神者，甲见丁之类，我生之神。' },
  shangguan: { name: '伤官', source: '《渊海子平》', quote: '伤官者，甲见丙之类。' },
  bijian: { name: '比肩', source: '《渊海子平》', quote: '比肩者，甲见甲之类。' },
  jiecai: { name: '劫财', source: '《渊海子平》', quote: '劫财者，甲见乙之类。' },
};

/**
 * 格局论断古籍引用
 */
export const PATTERN_CITATIONS: Record<string, { name: string; source: string | string[]; quote: string }> = {
  congGe: { name: '从格', source: ['《子平真诠》', '《滴天髓》'], quote: '弃命从财，须要财旺。' },
  huaGe: { name: '化格', source: ['《子平真诠》'], quote: '合而化气，真化为佳。' },
  wangSheng: { name: '身旺', source: ['《滴天髓》'], quote: '日主过旺，必有所倚。' },
  shengWang: { name: '身弱', source: ['《滴天髓》'], quote: '日主无气，难任财官。' },
};

/**
 * 五行生克古籍引用
 */
export const WUXING_CITATIONS: Record<string, { name: string; source: string; quote: string }> = {
  wood: { name: '木', source: '《滴天髓》', quote: '木之成形，必要金之雕琢。' },
  fire: { name: '火', source: '《滴天髓》', quote: '火之过旺，必需水以济之。' },
  earth: { name: '土', source: '《滴天髓》', quote: '土之厚重，载物成形。' },
  metal: { name: '金', source: '《滴天髓》', quote: '金之用事，辨其刚柔。' },
  water: { name: '水', source: '《滴天髓》', quote: '水之流盈，需土以止之。' },
};

/**
 * 神煞古籍引用
 */
export const SHENSHA_CITATIONS: Record<string, { name: string; source: string; quote: string }> = {
  tianyi: { name: '天乙贵人', source: '《三命通会》', quote: '贵人者，尊崇之象，辅翼之星。' },
  guiren: { name: '癸巳', source: '《三命通会》', quote: '贵人临于日支，婚姻有助。' },
  yima: { name: '驿马', source: '《三命通会》', quote: '驿马者，迁徒之神，奔走之象。' },
  wenchang: { name: '文昌', source: '《三命通会》', quote: '文昌者，文采之星，利科举。' },
  huagai: { name: '华盖', source: '《三命通会》', quote: '华盖者，艺术之星，孤高之性。' },
  taohua: { name: '桃花', source: '《三命通会》', quote: '桃花者，姻缘之星，情感之兆。' },
};

/**
 * 获取专业术语的完整引用信息
 * @param termType 术语类型：tenGod | pattern | wuxing | shensha
 * @param termKey 术语键名
 */
export function getTermCitation(termType: string, termKey: string): string {
  let citation: { name: string; source: string | string[]; quote: string } | undefined;

  switch (termType) {
    case 'tenGod':
      citation = TEN_GOD_CITATIONS[termKey];
      break;
    case 'pattern':
      citation = PATTERN_CITATIONS[termKey];
      break;
    case 'wuxing':
      citation = WUXING_CITATIONS[termKey];
      break;
    case 'shensha':
      citation = SHENSHA_CITATIONS[termKey];
      break;
  }

  if (!citation) return '';

  if (Array.isArray(citation.source)) {
    // 格局类有多个出处
    return `${citation.name}（出处：${citation.source.join('、')}）"${citation.quote}"`;
  }

  return `${citation.name}（出处：${citation.source}）"${citation.quote}"`;
}

/**
 * 规范化十神名称并附带引用信息
 */
export function getTenGodWithCitation(key: string): string {
  const name = normalizeTenGod(key);
  const citation = getTermCitation('tenGod', key);
  if (!citation) return name;
  return `${name}（${citation}）`;
}

function normalizeWuxing(key: string): string {
  if (typeof key !== 'string') return '';
  return WUXING_NAMES[key.toLowerCase()] || key || '';
}

function normalizeTenGod(key: string): string {
  if (typeof key !== 'string') return '';
  return TEN_GOD_NAMES[key.toLowerCase()] || key || '';
}

/**
 * 构建用户 User 层命理画像记忆文本（永久记忆）
 */
export function buildProfileMemory(chart: any, report?: any): string {
  if (!chart) return '';

  const parts: string[] = [];

  // 基础四柱信息
  const fourPillars = `${chart.yearGan || ''}${chart.yearZhi || ''} ${chart.monthGan || ''}${chart.monthZhi || ''} ${chart.dayGan || ''}${chart.dayZhi || ''} ${chart.hourGan || ''}${chart.hourZhi || ''}`.trim();
  parts.push(`【四柱】${fourPillars}`);
  parts.push(`【日主】${chart.dayGan || ''}（${chart.strengthLevel || '未知'}）`);

  // 格局
  if (chart.patternName || chart.patternType) {
    parts.push(`【格局】${chart.patternName || chart.patternType}${chart.patternScore ? `（${chart.patternScore}分）` : ''}`);
  }

  // 喜用神/忌神 - 命理分析的核心依据
  if (chart.yongShen) parts.push(`【用神】${chart.yongShen}`);
  if (chart.xiShen) parts.push(`【喜神】${chart.xiShen}`);
  if (chart.jiShen) {
    const jiList = Array.isArray(chart.jiShen) ? chart.jiShen.join('、') : String(chart.jiShen);
    parts.push(`【忌神】${jiList}`);
  }

  // 五行评分
  if (chart.wuxingScore && typeof chart.wuxingScore === 'object') {
    const scores = Object.entries(chart.wuxingScore)
      .map(([k, v]) => `${normalizeWuxing(k)}${v}`)
      .join(' ');
    parts.push(`【五行评分】${scores}`);
  }

  // 五行个数
  if (chart.wuxingCounts && typeof chart.wuxingCounts === 'object') {
    const counts = Object.entries(chart.wuxingCounts)
      .map(([k, v]) => `${normalizeWuxing(k)}${v}个`)
      .join(' ');
    parts.push(`【五行个数】${counts}`);
  }

  // 十神关系
  if (chart.tenGodsMap && typeof chart.tenGodsMap === 'object') {
    let godEntries: Array<[string, string]>;
    if (Array.isArray(chart.tenGodsMap)) {
      godEntries = chart.tenGodsMap.map((item: any) => {
        const pos = item.position || item.pillar || item.gan || '';
        const tg = item.ten_god || item.tenGod || '';
        return [pos, tg] as [string, string];
      });
    } else {
      godEntries = Object.entries(chart.tenGodsMap) as [string, string][];
    }
    const gods = godEntries
      .map(([k, v]) => `${k}→${normalizeTenGod(v)}`)
      .join('、');
    parts.push(`【十神】${gods}`);
  }

  // 纳音
  const nayins: string[] = [];
  if (chart.yearNayin) nayins.push(`年柱${chart.yearNayin}`);
  if (chart.monthNayin) nayins.push(`月柱${chart.monthNayin}`);
  if (chart.dayNayin) nayins.push(`日柱${chart.dayNayin}`);
  if (chart.hourNayin) nayins.push(`时柱${chart.hourNayin}`);
  if (nayins.length > 0) parts.push(`【纳音】${nayins.join('、')}`);

  // 神煞
  if (chart.shenshaList && Array.isArray(chart.shenshaList) && chart.shenshaList.length > 0) {
    const shenshaNames = chart.shenshaList
      .map((s: any) => (typeof s === 'string' ? s : s?.name || ''))
      .filter(Boolean);
    if (shenshaNames.length > 0) {
      parts.push(`【神煞】${shenshaNames.join('、')}`);
    }
  }

  // 大运信息
  if (chart.dayunList && Array.isArray(chart.dayunList) && chart.dayunList.length > 0) {
    const currentYear = new Date().getFullYear();
    const currentDayun = chart.dayunList.find((d: any) =>
      d.start_year <= currentYear && d.end_year >= currentYear
    );
    if (currentDayun) {
      parts.push(`【当前大运】${currentDayun.gan || ''}${currentDayun.zhi || ''}（${currentDayun.start_year}-${currentDayun.end_year}年）`);
    }

    const futureDayuns = chart.dayunList
      .filter((d: any) => d.start_year > currentYear)
      .slice(0, 2);
    if (futureDayuns.length > 0) {
      const futureStr = futureDayuns
        .map((d: any) => `${d.gan || ''}${d.zhi || ''}(${d.start_year}-${d.end_year})`)
        .join('、');
      parts.push(`【后续大运】${futureStr}`);
    }
  }

  // 性别
  if (chart.gender) {
    parts.push(`【性别】${chart.gender === 1 ? '男' : '女'}`);
  }

  return parts.join('\n');
}

/**
 * 构建规则引擎摘要（从报告的 ruleResults 和 ruleTags 提取）
 */
export function buildRuleSummary(report: any): string {
  if (!report) return '';

  const parts: string[] = [];

  // 规则标签
  if (report.ruleTags && Array.isArray(report.ruleTags) && report.ruleTags.length > 0) {
    parts.push(`【分析标签】${report.ruleTags.join('、')}`);
  }

  // 规则结果摘要
  if (report.ruleResults && Array.isArray(report.ruleResults)) {
    const summaries = report.ruleResults
      .filter((r: any) => r.text || r.summary)
      .slice(0, 5)
      .map((r: any) => {
        const tag = r.tags?.[0] || r.module || '';
        const text = (r.summary || r.text || '').slice(0, 100);
        return tag ? `[${tag}] ${text}` : text;
      });

    if (summaries.length > 0) {
      parts.push(`【规则分析要点】\n${summaries.join('\n')}`);
    }
  }

  return parts.join('\n');
}

/**
 * 构建报告上下文摘要（用于 system prompt）
 */
export function buildReportContext(report: any): string {
  if (!report) return '';

  const parts: string[] = [];

  try {
    const parsed = JSON.parse(report.aiContent || '{}');
    if (parsed.title) parts.push(`标题: ${parsed.title}`);
    if (parsed.overview) parts.push(`概述: ${parsed.overview}`);
    if (parsed.sections && Array.isArray(parsed.sections)) {
      parts.push(`章节: ${parsed.sections.map((s: any) => s.title).join('、')}`);
    }
    if (parsed.overallScore) parts.push(`综合评分: ${parsed.overallScore}`);
    if (parsed.tags && Array.isArray(parsed.tags)) {
      parts.push(`标签: ${parsed.tags.join('、')}`);
    }
  } catch {
    if (report.aiSummary) {
      parts.push(report.aiSummary);
    } else if (report.aiContent) {
      parts.push(report.aiContent.slice(0, 500));
    }
  }

  return parts.join('\n');
}

/**
 * 增强搜索 query，添加命理实体关键词
 */
export function enhanceSearchQuery(
  userMessage: string,
  reportType?: string,
  chart?: any,
): string {
  const terms: string[] = [userMessage];

  if (reportType) {
    terms.push(reportType);
  }

  // 提取命理关键词：检查用户消息中是否包含命理术语
  const baziKeywords = [
    // 人生维度
    '财运', '事业', '感情', '婚姻', '健康', '学业', '桃花', '子息',
    '官运', '人际关系', '出行', '购房', '购车',
    // 大运流年
    '大运', '流年', '流月', '流日', '、本运',
    // 十神
    '财星', '官星', '印星', '食伤', '比劫',
    '正官', '七杀', '正印', '偏印', '正财', '偏财',
    '食神', '伤官', '比肩', '劫财',
    // 喜忌
    '喜用神', '忌神', '用神', '调候',
    // 格局强弱
    '五行', '格局', '日主', '身强', '身弱', '从格', '化格',
    // 纳音神煞
    '纳音', '神煞', '贵人', '驿马', '文昌', '华盖',
    // 其他命理
    '合盘', '配偶', '桃花运', '事业运', '财运', '健康运',
  ];

  const lowerMsg = userMessage;
  const found = baziKeywords.filter((kw) => lowerMsg.includes(kw));
  if (found.length > 0) {
    terms.push(...found.slice(0, 6)); // 最多追加6个关键词，避免 query 过长
  }

  // 识别用户意图模式
  const intentPatterns = [
    { pattern: /今年|明年|去年|近几年/, intent: '流年分析' },
    { pattern: /十年|大运|接下来/, intent: '大运分析' },
    { pattern: /婚|恋|对象|另一半|伴侣/, intent: '婚姻感情' },
    { pattern: /钱|收入|投资|理财|破财/, intent: '财富分析' },
    { pattern: /工作|升职|跳槽|创业|合作/, intent: '事业分析' },
    { pattern: /健康|身体|疾病|手术/, intent: '健康分析' },
  ];

  for (const { pattern, intent } of intentPatterns) {
    if (pattern.test(userMessage)) {
      terms.push(intent);
    }
  }

  // 如果用户问到运势但没有具体关键词，补充当前大运信息
  if (chart && (userMessage.includes('运势') || userMessage.includes('运气'))) {
    if (chart.yongShen) terms.push(`用神${chart.yongShen}`);
    if (chart.patternName) terms.push(`格局${chart.patternName}`);
    if (chart.dayunList && chart.dayunList.length > 0) {
      const currentYear = new Date().getFullYear();
      const currentDayun = chart.dayunList.find((d: any) =>
        d.start_year <= currentYear && d.end_year >= currentYear
      );
      if (currentDayun) {
        terms.push(`当前大运${currentDayun.gan || ''}${currentDayun.zhi || ''}`);
      }
    }
  }

  return terms.join(' ');
}

export type MemoryTTL = 'permanent' | 'medium' | 'short';

/**
 * 计算记忆过期日期
 */
export function getExpirationDate(ttl: MemoryTTL, chart?: any): string | null {
  switch (ttl) {
    case 'permanent':
      return null; // 永不过期

    case 'medium': {
      // 中期：当前大运结束时间，或默认 10 年
      if (chart?.dayunList && Array.isArray(chart.dayunList)) {
        const currentYear = new Date().getFullYear();
        const currentDayun = chart.dayunList.find((d: any) =>
          d.start_year <= currentYear && d.end_year >= currentYear
        );
        if (currentDayun?.end_year) {
          return new Date(currentDayun.end_year, 11, 31).toISOString();
        }
      }
      const tenYears = new Date();
      tenYears.setFullYear(tenYears.getFullYear() + 10);
      return tenYears.toISOString();
    }

    case 'short': {
      // 短期：2-4 周后
      const threeWeeks = new Date();
      threeWeeks.setDate(threeWeeks.getDate() + 21);
      return threeWeeks.toISOString();
    }

    default:
      return null;
  }
}

/**
 * 格式化记忆分区文本（用于注入 system prompt）
 */
export function formatLayeredMemories(layered: {
  userMemories: any[];
  agentMemories: any[];
  sessionMemories: any[];
}): string {
  const sections: string[] = [];

  if (layered.userMemories.length > 0) {
    const items = layered.userMemories
      .map((m: any) => `- ${m.memory || m.text || JSON.stringify(m)}`)
      .join('\n');
    sections.push(`### 用户画像记忆（长期）\n${items}`);
  }

  if (layered.agentMemories.length > 0) {
    const items = layered.agentMemories
      .map((m: any) => `- ${m.memory || m.text || JSON.stringify(m)}`)
      .join('\n');
    sections.push(`### 顾问行为学习\n${items}`);
  }

  if (layered.sessionMemories.length > 0) {
    const items = layered.sessionMemories
      .map((m: any) => `- ${m.memory || m.text || JSON.stringify(m)}`)
      .join('\n');
    sections.push(`### 本次会话记忆\n${items}`);
  }

  if (sections.length === 0) {
    return '暂无历史记忆';
  }

  return sections.join('\n\n');
}
