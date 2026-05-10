import { Injectable } from '@nestjs/common';

export interface DirectionInfo {
  direction: string; trigram: string; star: string; luck: string;
  wuxing: string; mainAffair: string; desc: string;
}

export interface BazhaiResult {
  birthYear: number; gender: number; genderLabel: string;
  kuaNumber: number; trigram: string; trigramSymbol: string;
  group: string; groupLabel: string;
  directions: DirectionInfo[];
  summary: string;
}

// 大游年歌诀：每个命卦(伏位)对应8个方位的吉凶星
// 顺序: 北/东北/东/东南/南/西南/西/西北 → 对应八卦方位
// 参考: 八宅明镜 阳宅三要 大游年歌诀
const DA_YOU_NIAN: Record<number, string[]> = {
  1: ['伏位','五鬼','天医','生气','延年','绝命','祸害','六煞'], // 坎命
  2: ['绝命','生气','祸害','五鬼','六煞','伏位','天医','延年'], // 坤命
  3: ['天医','六煞','伏位','延年','生气','祸害','绝命','五鬼'], // 震命
  4: ['生气','绝命','延年','伏位','天医','五鬼','六煞','祸害'], // 巽命
  6: ['六煞','天医','五鬼','祸害','绝命','延年','生气','伏位'], // 乾命
  7: ['祸害','延年','绝命','六煞','五鬼','天医','伏位','生气'], // 兑命
  8: ['五鬼','伏位','六煞','绝命','祸害','生气','延年','天医'], // 艮命
  9: ['延年','祸害','生气','天医','伏位','六煞','五鬼','绝命'], // 离命
};

const DIRECTION_INFO: Record<string, { direction: string; trigram: string; symbol: string }> = {
  '北': { direction: '北', trigram: '坎', symbol: '☵' },
  '东北': { direction: '东北', trigram: '艮', symbol: '☶' },
  '东': { direction: '东', trigram: '震', symbol: '☳' },
  '东南': { direction: '东南', trigram: '巽', symbol: '☴' },
  '南': { direction: '南', trigram: '离', symbol: '☲' },
  '西南': { direction: '西南', trigram: '坤', symbol: '☷' },
  '西': { direction: '西', trigram: '兑', symbol: '☱' },
  '西北': { direction: '西北', trigram: '乾', symbol: '☰' },
};

const STAR_INFO: Record<string, { luck: string; wuxing: string; mainAffair: string; desc: string }> = {
  '生气': { luck: '上吉', wuxing: '木', mainAffair: '旺丁旺财·事业昌盛', desc: '生气为第一吉星，主旺丁旺财、事业昌盛、生机勃勃。宜安大门、卧室、书房。木性生发，利于创业和求财。' },
  '天医': { luck: '上吉', wuxing: '土', mainAffair: '健康·康复·财运', desc: '天医为第二吉星，主身体健康、疾病康复、财运稳定。宜安卧室、厨房。土性厚重，利于养病和积蓄。' },
  '延年': { luck: '中吉', wuxing: '金', mainAffair: '长寿·婚姻·人际', desc: '延年为第三吉星，主长寿健康、婚姻和谐、人际关系良好。宜安卧室、客厅。金性刚毅，利于婚姻和领导。' },
  '伏位': { luck: '次吉', wuxing: '木', mainAffair: '稳定·平和·蓄势', desc: '伏位为第四吉星，主平稳安定、家庭和睦。宜安书房、佛堂。木性柔韧，利于学习修行。' },
  '祸害': { luck: '次凶', wuxing: '土', mainAffair: '口舌·是非·疾病', desc: '祸害为第一凶星，主口舌是非、小人暗算。不宜安大门、卧室。宜安厕所、杂物间。可用金属物品化解土性。' },
  '六煞': { luck: '中凶', wuxing: '水', mainAffair: '桃花·婚姻·人际', desc: '六煞为第二凶星，主桃花劫扰、婚姻不顺。不宜安卧室。宜安厕所、浴室。可用土性物品化解水性。' },
  '五鬼': { luck: '大凶', wuxing: '火', mainAffair: '灾祸·官非·血光', desc: '五鬼为第三凶星，主突发灾祸、官非口舌。不宜安大门、卧室、厨房。宜安厕所。可用水属性化解火性。' },
  '绝命': { luck: '大凶', wuxing: '金', mainAffair: '破财·疾病·意外', desc: '绝命为第四凶星，主破财损丁、重大疾病。最凶之星，不宜任何重要空间。宜安厕所。可用火属性化解金性。' },
};

const DIR_ORDER = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];

@Injectable()
export class BazhaiCalculatorService {
  /** 计算命卦 */
  calculateKua(year: number, gender: number): number {
    // Sum digits of year
    let sum = 0;
    let y = year;
    while (y > 0) { sum += y % 10; y = Math.floor(y / 10); }
    while (sum >= 10) {
      let s = 0;
      while (sum > 0) { s += sum % 10; sum = Math.floor(sum / 10); }
      sum = s;
    }
    const x = sum;

    let kua: number;
    if (year < 2000) {
      kua = gender === 1 ? (11 - x) : (x + 4);
    } else {
      kua = gender === 1 ? (10 - x) : (x + 3);
    }
    while (kua >= 10) {
      kua = (kua % 10) + Math.floor(kua / 10);
    }
    if (kua === 5) kua = gender === 1 ? 2 : 8;
    return kua;
  }

  /** 命卦→八卦+符号 */
  getTrigram(kua: number): { trigram: string; symbol: string } {
    const map: Record<number, { trigram: string; symbol: string }> = {
      1: { trigram: '坎', symbol: '☵' },
      2: { trigram: '坤', symbol: '☷' },
      3: { trigram: '震', symbol: '☳' },
      4: { trigram: '巽', symbol: '☴' },
      6: { trigram: '乾', symbol: '☰' },
      7: { trigram: '兑', symbol: '☱' },
      8: { trigram: '艮', symbol: '☶' },
      9: { trigram: '离', symbol: '☲' },
    };
    return map[kua] || { trigram: '未知', symbol: '?' };
  }

  /** 命卦→东四命/西四命 */
  getGroup(kua: number): string {
    return [1, 3, 4, 9].includes(kua) ? 'east' : 'west';
  }

  /** 主分析 */
  analyze(year: number, gender: number): BazhaiResult {
    if (year < 1900 || year > 2100) throw new Error('请输入有效的出生年份（1900-2100）');
    if (gender !== 1 && gender !== 2) throw new Error('性别参数错误');

    const kua = this.calculateKua(year, gender);
    const { trigram, symbol } = this.getTrigram(kua);
    const group = this.getGroup(kua);
    const stars = DA_YOU_NIAN[kua] || DA_YOU_NIAN[1];

    const directions: DirectionInfo[] = DIR_ORDER.map((dir, i) => {
      const star = stars[i];
      const info = STAR_INFO[star];
      const dInfo = DIRECTION_INFO[dir];
      return { direction: dir, trigram: dInfo.trigram, star, luck: info.luck, wuxing: info.wuxing, mainAffair: info.mainAffair, desc: info.desc };
    });

    const luckyDirs = directions.filter(d => d.luck.includes('吉'));
    const bestDir = luckyDirs.find(d => d.star === '生气') || luckyDirs[0];

    return {
      birthYear: year, gender, genderLabel: gender === 1 ? '男' : '女',
      kuaNumber: kua, trigram, trigramSymbol: symbol,
      group, groupLabel: group === 'east' ? '东四命' : '西四命',
      directions,
      summary: `命卦：${kua}${trigram}${symbol}，属${group === 'east' ? '东四命' : '西四命'}。最佳吉方为${bestDir.direction}方（${bestDir.star}），${bestDir.mainAffair}。${group === 'east' ? '宜住东四宅（坐北朝南/坐南朝北/坐东朝西/坐东南朝西北）' : '宜住西四宅（坐西南朝东北/坐西北朝东南/坐西朝东/坐东北朝西南）'}。`,
    };
  }
}
