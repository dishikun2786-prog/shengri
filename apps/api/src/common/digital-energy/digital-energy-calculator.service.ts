import { Injectable } from '@nestjs/common';

// ─── 八星 8 Stars ───
export interface StarInfo {
  name: string;
  luck: string;
  wuxing: string;
  level: number;
  pairs: string[];
  mainAffair: string;
  desc: string;
}

export const EIGHT_STARS: Record<string, StarInfo> = {
  '天医': {
    name: '天医', luck: '大吉', wuxing: '土', level: 1,
    pairs: ['13', '31'], mainAffair: '正财·婚姻·健康',
    desc: '天医为财星之首，主正财运、良好婚姻和健康体魄。数字能量极强，能化解周围凶星。',
  },
  '天医2': {
    name: '天医', luck: '大吉', wuxing: '土', level: 2,
    pairs: ['68', '86'], mainAffair: '正财·婚姻·健康',
    desc: '天医二级能量，财运稳定，婚姻和谐，健康良好。',
  },
  '天医3': {
    name: '天医', luck: '大吉', wuxing: '土', level: 3,
    pairs: ['49', '94'], mainAffair: '正财·婚姻·健康',
    desc: '天医三级能量，财运有起伏但总体向好，婚姻需用心经营。',
  },
  '天医4': {
    name: '天医', luck: '大吉', wuxing: '土', level: 4,
    pairs: ['27', '72'], mainAffair: '正财·婚姻·健康',
    desc: '天医四级能量，财运偏弱需努力，婚姻和健康需多加注意。',
  },
  '生气': {
    name: '生气', luck: '大吉', wuxing: '木', level: 1,
    pairs: ['14', '41'], mainAffair: '贵人·人缘·活力',
    desc: '生气为贵人之星，主贵人相助、人缘极佳、充满活力。',
  },
  '生气2': {
    name: '生气', luck: '大吉', wuxing: '木', level: 2,
    pairs: ['67', '76'], mainAffair: '贵人·人缘·活力',
    desc: '生气二级能量，人缘好，常有贵人相助，精力充沛。',
  },
  '生气3': {
    name: '生气', luck: '大吉', wuxing: '木', level: 3,
    pairs: ['39', '93'], mainAffair: '贵人·人缘·活力',
    desc: '生气三级能量，贵人运一般，需主动拓展人际。',
  },
  '生气4': {
    name: '生气', luck: '大吉', wuxing: '木', level: 4,
    pairs: ['28', '82'], mainAffair: '贵人·人缘·活力',
    desc: '生气四级能量，贵人运偏弱，需靠自己努力。',
  },
  '延年': {
    name: '延年', luck: '中吉', wuxing: '金', level: 1,
    pairs: ['19', '91'], mainAffair: '事业·领导力·长寿',
    desc: '延年为事业之星，主事业有成、领导能力强、寿命绵长。',
  },
  '延年2': {
    name: '延年', luck: '中吉', wuxing: '金', level: 2,
    pairs: ['78', '87'], mainAffair: '事业·领导力·长寿',
    desc: '延年二级能量，事业稳定上升，有管理才能。',
  },
  '延年3': {
    name: '延年', luck: '中吉', wuxing: '金', level: 3,
    pairs: ['34', '43'], mainAffair: '事业·领导力·长寿',
    desc: '延年三级能量，事业需努力打拼，领导力一般。',
  },
  '延年4': {
    name: '延年', luck: '中吉', wuxing: '金', level: 4,
    pairs: ['26', '62'], mainAffair: '事业·领导力·长寿',
    desc: '延年四级能量，事业需加倍努力，缺少助力。',
  },
  '伏位': {
    name: '伏位', luck: '小吉', wuxing: '木', level: 1,
    pairs: ['11', '22'], mainAffair: '等待·蓄势·稳定',
    desc: '伏位为蓄势之星，主等待时机、积蓄力量、稳中求进。',
  },
  '伏位2': {
    name: '伏位', luck: '小吉', wuxing: '木', level: 2,
    pairs: ['33', '44'], mainAffair: '等待·蓄势·稳定',
    desc: '伏位二级能量，需耐心等待，不可急于求成。',
  },
  '伏位3': {
    name: '伏位', luck: '小吉', wuxing: '木', level: 3,
    pairs: ['66', '77'], mainAffair: '等待·蓄势·稳定',
    desc: '伏位三级能量，等待时间较长，需要有足够耐心。',
  },
  '伏位4': {
    name: '伏位', luck: '小吉', wuxing: '木', level: 4,
    pairs: ['88', '99'], mainAffair: '等待·蓄势·稳定',
    desc: '伏位四级能量，宜静不宜动，等待最佳时机。',
  },
  '绝命': {
    name: '绝命', luck: '大凶', wuxing: '金', level: 1,
    pairs: ['12', '21'], mainAffair: '破财·投资·血光',
    desc: '绝命为破财之星，主投资风险、破财损利、需防意外血光。',
  },
  '绝命2': {
    name: '绝命', luck: '大凶', wuxing: '金', level: 2,
    pairs: ['69', '96'], mainAffair: '破财·投资·血光',
    desc: '绝命二级能量，投资需谨慎，有小破财风险。',
  },
  '绝命3': {
    name: '绝命', luck: '大凶', wuxing: '金', level: 3,
    pairs: ['48', '84'], mainAffair: '破财·投资·血光',
    desc: '绝命三级能量，破财风险中等，不宜大额投资。',
  },
  '绝命4': {
    name: '绝命', luck: '大凶', wuxing: '金', level: 4,
    pairs: ['37', '73'], mainAffair: '破财·投资·血光',
    desc: '绝命四级能量，破财风险较小，但仍需注意。',
  },
  '五鬼': {
    name: '五鬼', luck: '大凶', wuxing: '火', level: 1,
    pairs: ['18', '81'], mainAffair: '血光·官非·变动',
    desc: '五鬼为变动之星，主突发变故、官非口舌、需防意外血光。',
  },
  '五鬼2': {
    name: '五鬼', luck: '大凶', wuxing: '火', level: 2,
    pairs: ['79', '97'], mainAffair: '血光·官非·变动',
    desc: '五鬼二级能量，变动频繁，需稳定心性。',
  },
  '五鬼3': {
    name: '五鬼', luck: '大凶', wuxing: '火', level: 3,
    pairs: ['36', '63'], mainAffair: '血光·官非·变动',
    desc: '五鬼三级能量，小变动常有，需灵活应对。',
  },
  '五鬼4': {
    name: '五鬼', luck: '大凶', wuxing: '火', level: 4,
    pairs: ['24', '42'], mainAffair: '血光·官非·变动',
    desc: '五鬼四级能量，变动较少，相对稳定。',
  },
  '六煞': {
    name: '六煞', luck: '凶', wuxing: '水', level: 1,
    pairs: ['16', '61'], mainAffair: '桃花·人际·情绪',
    desc: '六煞为桃花之星，主人际复杂、桃花劫扰、情绪波动大。',
  },
  '六煞2': {
    name: '六煞', luck: '凶', wuxing: '水', level: 2,
    pairs: ['47', '74'], mainAffair: '桃花·人际·情绪',
    desc: '六煞二级能量，桃花较多，需理性对待感情。',
  },
  '六煞3': {
    name: '六煞', luck: '凶', wuxing: '水', level: 3,
    pairs: ['38', '83'], mainAffair: '桃花·人际·情绪',
    desc: '六煞三级能量，人际有小摩擦，情绪需自控。',
  },
  '六煞4': {
    name: '六煞', luck: '凶', wuxing: '水', level: 4,
    pairs: ['29', '92'], mainAffair: '桃花·人际·情绪',
    desc: '六煞四级能量，桃花较弱，人际较为平顺。',
  },
  '祸害': {
    name: '祸害', luck: '凶', wuxing: '土', level: 1,
    pairs: ['17', '71'], mainAffair: '口舌·疾病·小人',
    desc: '祸害为口舌之星，主口舌是非、小人是非、需防疾病。',
  },
  '祸害2': {
    name: '祸害', luck: '凶', wuxing: '土', level: 2,
    pairs: ['89', '98'], mainAffair: '口舌·疾病·小人',
    desc: '祸害二级能量，易有口舌之争，需谨言慎行。',
  },
  '祸害3': {
    name: '祸害', luck: '凶', wuxing: '土', level: 3,
    pairs: ['46', '64'], mainAffair: '口舌·疾病·小人',
    desc: '祸害三级能量，小人是非较少，但仍需留意。',
  },
  '祸害4': {
    name: '祸害', luck: '凶', wuxing: '土', level: 4,
    pairs: ['23', '32'], mainAffair: '口舌·疾病·小人',
    desc: '祸害四级能量，影响较小，注意言行即可。',
  },
};

// ─── 数字0与各数字组合的效应分析 ───
// 0的作用：隐藏、潜伏、减弱。0压制相邻数字的能量使其无法充分发挥，但能量未消失只是被抑制。
const DIGIT_ZERO_EFFECT: Record<string, { effect: string; desc: string; associatedStars: string[] }> = {
  '0': { effect: '双零空亡', desc: '双0叠加，能量完全空亡，如坠虚空。此位能量极度薄弱，需特别注意对应宫位的事务。', associatedStars: [] },
  '1': { effect: '才能潜伏', desc: '0压制1的领导力与独立性，才能被埋没、志向难伸。原本1所关联的天医(正财)、延年(事业)、生气(贵人)等能量均被削弱约50%，如同明珠蒙尘。', associatedStars: ['天医', '延年', '生气', '六煞', '绝命', '五鬼', '祸害'] },
  '2': { effect: '沟通闭塞', desc: '0压制2的合作与沟通能力，表达不畅、人际受阻。2在伏位、祸害等星中主沟通连结，0使其陷入沉默与隔阂。', associatedStars: ['伏位', '祸害', '绝命', '五鬼'] },
  '3': { effect: '行动迟滞', desc: '0压制3的行动力与冲动，想做却迟迟无法行动，机会从指缝中流失。3在天医、生气、延年等吉星中的正能量被冻结。', associatedStars: ['天医', '生气', '延年', '伏位', '祸害', '六煞', '绝命'] },
  '4': { effect: '智慧蒙蔽', desc: '0压制4的策划力与理智，思维混乱、判断失误。4在生气、延年等星中主智慧谋略，0使其如雾里看花。', associatedStars: ['生气', '延年', '伏位', '绝命', '六煞', '五鬼', '祸害'] },
  '6': { effect: '财运潜伏', desc: '0压制6的智慧与财运，财富机会存在但无法把握。6在天医、绝命等星中主财富智慧，0使这些能量处于"看得到吃不到"的状态。', associatedStars: ['天医', '生气', '延年', '伏位', '绝命', '五鬼', '六煞', '祸害'] },
  '7': { effect: '口才受抑', desc: '0压制7的口才与人际，能言善辩变成沉默寡言，社交能力大幅减弱。7在祸害、六煞等星中的表达能力被冻结。', associatedStars: ['祸害', '天医', '延年', '伏位', '六煞', '绝命', '五鬼'] },
  '8': { effect: '权力潜伏', desc: '0压制8的权力与责任感，领导才能被抑制，事业难有大成。8在天医、延年、五鬼等星中的强势能量转为隐忍。', associatedStars: ['天医', '延年', '五鬼', '伏位', '生气', '绝命', '祸害', '六煞'] },
  '9': { effect: '机会错失', desc: '0压制9的眼界与机会，贵人近在眼前却无法把握，机会总是擦肩而过。9在延年、生气等星中主远见与机遇。', associatedStars: ['延年', '生气', '天医', '伏位', '绝命', '五鬼', '六煞', '祸害'] },
};

// ─── 数字5与各数字组合的效应分析 ───
// 5的作用：显化、加强、连接。5放大相邻数字的能量，让隐藏的特质更加明显。
const DIGIT_FIVE_EFFECT: Record<string, { effect: string; desc: string }> = {
  '5': { effect: '双五并显', desc: '双5叠加如同双刃剑——吉则更吉、凶则更凶。能量极度放大，需结合周围数字判断利弊。' },
  '1': { effect: '领导彰显', desc: '5放大1的领导力和独立性，使人在人群中脱颖而出。权威感增强，但也可能变得强势独断。' },
  '2': { effect: '沟通强化', desc: '5放大2的沟通与合作能力，口才变好、人缘增强。但过度时易变得话多失言。' },
  '3': { effect: '行动爆发', desc: '5放大3的行动力，执行力大幅提升，想到就做。但冲动也随之增强，需防急躁误事。' },
  '4': { effect: '智慧显现', desc: '5放大4的策划力与理智，思维缜密、计划周全。过度时可能思虑过多、优柔寡断。' },
  '6': { effect: '财运显化', desc: '5放大6的智慧与财运，财富机会更加明显，赚钱灵感源源不断。但需防贪婪冒进。' },
  '7': { effect: '口才显现', desc: '5放大7的表达能力，口才出众、社交活跃。但祸从口出的风险也随之增加。' },
  '8': { effect: '权力放大', desc: '5放大8的权力与责任感，事业心和领导力更强。但压力也随之增加，需防过劳。' },
  '9': { effect: '机会显现', desc: '5放大9的眼界与机会捕捉力，能看到更多可能性。但选择太多反而容易犹豫不决。' },
};

export interface StarMatch {
  pair: string;
  star: string;
  luck: string;
  wuxing: string;
  level: number;
  mainAffair: string;
  desc: string;
  position: string;
  isZeroAffected?: boolean;
  isFiveAffected?: boolean;
  zeroEffect?: string;
  fiveEffect?: string;
}

export interface DigitalEnergyResult {
  phone: string;
  tailNumber: string;
  groups: StarMatch[];
  lastFour: StarMatch[];
  stats: {
    totalStars: number;
    luckyCount: number;
    unluckyCount: number;
    luckyPercent: number;
    wuxingDistribution: Record<string, number>;
    dominantStar: string;
    dominantWuxing: string;
    zeroCount: number;
    fiveCount: number;
    zeroPairs: number;
    fivePairs: number;
  };
  hasSpecialZero: boolean;
  hasSpecialFive: boolean;
  specialDigits: { digit: string; meaning: string; position: number }[];
  zeroAnalysis: string;
  fiveAnalysis: string;
  summary: string;
  suggestion: string;
}

const PAIR_LOOKUP: Record<string, StarInfo> = {};
for (const star of Object.values(EIGHT_STARS)) {
  for (const pair of star.pairs) {
    PAIR_LOOKUP[pair] = star;
  }
}

@Injectable()
export class DigitalEnergyCalculatorService {
  private readonly POSITION_LABELS = ['末2位', '次2位', '中2位', '前2位', '首2位'];

  analyze(phone: string): DigitalEnergyResult {
    const clean = phone.replace(/\D/g, '');
    if (!/^1\d{10}$/.test(clean)) {
      throw new Error('请输入有效的11位中国大陆手机号');
    }

    const tail = clean.slice(-10);
    const groups: StarMatch[] = [];
    let pos = tail.length;

    for (let i = 0; i < 5; i++) {
      pos -= 2;
      const pair = tail.substring(pos, pos + 2);
      const star = PAIR_LOOKUP[pair];

      if (star) {
        // Standard pair — found in 八星
        groups.push({
          pair, star: star.name, luck: star.luck, wuxing: star.wuxing,
          level: star.level, mainAffair: star.mainAffair, desc: star.desc,
          position: this.POSITION_LABELS[i],
        });
      } else if (pair.includes('0')) {
        // 0-affected pair — apply zero effect analysis
        groups.push(this.analyzeZeroPair(pair, i));
      } else if (pair.includes('5')) {
        // 5-affected pair — apply five effect analysis
        groups.push(this.analyzeFivePair(pair, i));
      } else {
        // Truly unknown pair
        groups.push({
          pair, star: '未知', luck: '中性', wuxing: '未知', level: 0,
          mainAffair: '无标准对应', desc: `数字${pair}不在传统八星体系中。`,
          position: this.POSITION_LABELS[i],
        });
      }
    }

    const lastFour = groups.slice(0, 2).map(g => ({ ...g }));
    const luckyCount = groups.filter(g => g.luck.includes('吉')).length;
    const unluckyCount = groups.filter(g => g.luck.includes('凶')).length;
    const wuxingDist: Record<string, number> = {};
    groups.forEach(g => { if (g.wuxing !== '未知') wuxingDist[g.wuxing] = (wuxingDist[g.wuxing] || 0) + 1; });
    const dominantStar = this.getDominant(groups.map(g => g.star).filter(s => s !== '未知' && !s.startsWith('0藏') && !s.startsWith('5显')));
    const dominantWuxing = Object.entries(wuxingDist).sort((a, b) => b[1] - a[1])[0]?.[0] || '未知';

    // Special digits analysis
    const specialDigits: DigitalEnergyResult['specialDigits'] = [];
    let zeroDigitCount = 0, fiveDigitCount = 0;
    for (let i = 0; i < tail.length; i++) {
      const ch = tail[i];
      if (ch === '0') {
        zeroDigitCount++;
        specialDigits.push({ digit: '0', meaning: '隐藏·潜伏·减弱能量', position: 10 - i });
      }
      if (ch === '5') {
        fiveDigitCount++;
        specialDigits.push({ digit: '5', meaning: '显化·加强·连接能量', position: 10 - i });
      }
    }

    const zeroPairs = groups.filter(g => g.isZeroAffected).length;
    const fivePairs = groups.filter(g => g.isFiveAffected).length;
    const zeroAnalysis = this.buildZeroAnalysis(groups, tail);
    const fiveAnalysis = this.buildFiveAnalysis(groups, tail);

    return {
      phone: clean,
      tailNumber: tail,
      groups,
      lastFour,
      stats: {
        totalStars: groups.length,
        luckyCount, unluckyCount,
        luckyPercent: Math.round((luckyCount / groups.length) * 100),
        wuxingDistribution: wuxingDist,
        dominantStar: dominantStar || '未知',
        dominantWuxing,
        zeroCount: zeroDigitCount,
        fiveCount: fiveDigitCount,
        zeroPairs,
        fivePairs,
      },
      hasSpecialZero: tail.includes('0'),
      hasSpecialFive: tail.includes('5'),
      specialDigits,
      zeroAnalysis,
      fiveAnalysis,
      summary: this.buildSummary(groups, lastFour, dominantStar, zeroPairs, fivePairs),
      suggestion: this.buildSuggestion(groups, dominantStar, zeroPairs),
    };
  }

  /** Analyze a pair containing digit 0 */
  private analyzeZeroPair(pair: string, positionIndex: number): StarMatch {
    const nonZeroDigit = pair[0] === '0' ? pair[1] : pair[0];
    const effect = DIGIT_ZERO_EFFECT[nonZeroDigit] || DIGIT_ZERO_EFFECT['0'];
    const isLeadingZero = pair[0] === '0';

    // Determine the primary star of the suppressed digit
    const primaryStar = effect.associatedStars[0] || '未知';

    return {
      pair,
      star: `0藏${nonZeroDigit}`,
      luck: '中性偏弱',
      wuxing: '隐',
      level: 0,
      mainAffair: effect.effect,
      desc: `${effect.desc}（${isLeadingZero ? '0在前，抑制后方能量' : '0在后，吸收前方能量'}）`,
      position: this.POSITION_LABELS[positionIndex],
      isZeroAffected: true,
      zeroEffect: effect.effect,
    };
  }

  /** Analyze a pair containing digit 5 */
  private analyzeFivePair(pair: string, positionIndex: number): StarMatch {
    const nonFiveDigit = pair[0] === '5' ? pair[1] : pair[0];
    const effect = DIGIT_FIVE_EFFECT[nonFiveDigit] || DIGIT_FIVE_EFFECT['5'];

    return {
      pair,
      star: `5显${nonFiveDigit}`,
      luck: '中性偏强',
      wuxing: '显',
      level: 0,
      mainAffair: effect.effect,
      desc: effect.desc,
      position: this.POSITION_LABELS[positionIndex],
      isFiveAffected: true,
      fiveEffect: effect.effect,
    };
  }

  /** Build comprehensive 0-digit analysis text */
  private buildZeroAnalysis(groups: StarMatch[], tail: string): string {
    const zeroPairs = groups.filter(g => g.isZeroAffected);
    if (zeroPairs.length === 0) return '';

    const details = zeroPairs.map(g =>
      `${g.position}「${g.pair}」→ ${g.mainAffair}：${g.desc}`
    ).join('；');

    const zeroPositions: number[] = [];
    for (let i = 0; i < tail.length; i++) {
      if (tail[i] === '0') zeroPositions.push(10 - i);
    }

    const summary = zeroPairs.length >= 3
      ? `号码中含${zeroPairs.length}组0-组合（位置${zeroPositions.join('、')}），0的能量大量潜伏，整体能量被显著压制。0如同"能量静音器"，使号码中的吉星能量减半、凶星能量潜伏不发。`
      : zeroPairs.length >= 1
      ? `号码中含${zeroPairs.length}组0-组合（位置${zeroPositions.join('、')}），部分能量受到0的压制而潜伏。`
      : `号码中有${zeroPositions.length}个0（位置${zeroPositions.join('、')}），虽未直接成对，但散布的0也会对周围数字产生减弱作用。`;

    return `${summary}\n详细分析：${details}`;
  }

  /** Build 5-digit analysis text */
  private buildFiveAnalysis(groups: StarMatch[], tail: string): string {
    const fivePairs = groups.filter(g => g.isFiveAffected);
    if (fivePairs.length === 0) return '';

    const details = fivePairs.map(g =>
      `${g.position}「${g.pair}」→ ${g.mainAffair}：${g.desc}`
    ).join('；');

    return `号码中含${fivePairs.length}组5-组合。5为"显化"之数，能将隐藏能量放大显现。详细：${details}`;
  }

  private getDominant(stars: string[]): string {
    const count: Record<string, number> = {};
    stars.forEach(s => { count[s] = (count[s] || 0) + 1; });
    return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || '未知';
  }

  private buildSummary(
    groups: StarMatch[], lastFour: StarMatch[], dominant: string,
    zeroPairs: number, fivePairs: number,
  ): string {
    const luckyTotal = groups.filter(g => g.luck.includes('吉')).length;
    const badTotal = groups.filter(g => g.luck.includes('凶')).length;
    const lastFourStars = lastFour.map(g => g.star).join('、');
    const zeroNote = zeroPairs > 0 ? `，含${zeroPairs}组0-潜伏组合` : '';
    const fiveNote = fivePairs > 0 ? `，含${fivePairs}组5-显化组合` : '';

    if (luckyTotal >= 4) return `此号码为大吉之数，吉星占${luckyTotal}/5，主星${dominant}，财运事业人际俱佳${zeroNote}${fiveNote}。末4位核心能量：${lastFourStars}。`;
    if (luckyTotal >= 2) return `此号码吉凶平衡，吉星${luckyTotal}颗、凶星${badTotal}颗，主星${dominant}${zeroNote}${fiveNote}。末4位核心能量：${lastFourStars}。`;
    return `此号码凶星较多（${badTotal}/5颗），主星${dominant}${zeroNote}${fiveNote}。末4位：${lastFourStars}。建议更换或搭配化解方案。`;
  }

  private buildSuggestion(groups: StarMatch[], dominant: string, zeroPairs: number): string {
    const hasBad = groups.some(g => g.luck.includes('凶'));
    const hasZero = zeroPairs > 0;

    if (!hasBad && !hasZero) return '此号码能量配置优良，无需特别化解。保持积极心态，顺势而为即可。';

    const parts: string[] = [];
    if (hasBad) {
      parts.push(`建议在号码中添加天医（13/31/68/86）或延年（19/91/78/87）数组以增强吉星能量，化解${dominant}的不利影响`);
    }
    if (hasZero) {
      parts.push('0的潜伏能量可通过佩戴金属饰品（金克木破0之滞）或红色饰品（火生土通0之塞）来激活被压制的好运');
    }
    return parts.join('。') + '。';
  }
}
