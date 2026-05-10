import { Injectable } from '@nestjs/common';

export interface XiaoliurenResult {
  position: number;
  name: string;
  wuxing: string;
  liushen: string;
  luckLevel: string;
  direction: string;
  mainAffair: string;
  bodyAffair: string;
  travelAffair: string;
  seekingAffair: string;
  lostAffair: string;
  detailedText: string;
}

export interface XiaoliurenCalculationResult {
  result: XiaoliurenResult;
  steps: {
    month: XiaoliurenResult;
    day: XiaoliurenResult;
    hour: XiaoliurenResult;
  };
  path: { from: string; to: string; label: string }[];
}

interface PalmPosition {
  position: number;
  name: string;
  wuxing: string;
  liushen: string;
  luckLevel: string;
  direction: string;
  mainAffair: string;
  bodyAffair: string;
  travelAffair: string;
  seekingAffair: string;
  lostAffair: string;
  detailedText: string;
}

const PALM_POSITIONS: Record<number, PalmPosition> = {
  1: {
    position: 1, name: '大安', wuxing: '木', liushen: '青龙', luckLevel: '大吉', direction: '东方',
    mainAffair: '求谋顺遂，事事昌隆',
    bodyAffair: '身体安康，病者无妨',
    travelAffair: '行人未动，来者平安',
    seekingAffair: '诸事可成，失物不远',
    lostAffair: '失物未去远，急寻可得',
    detailedText: '大安事事昌，求谋在东方，失物不远去，宅舍保安康，行人身未动，病者主无妨，将军回田野，仔细与推详。大安为青龙之位，属木，主静止、心安、吉祥。凡谋事主一、五、七。',
  },
  2: {
    position: 2, name: '留连', wuxing: '水', liushen: '玄武', luckLevel: '凶', direction: '北方',
    mainAffair: '诸事难成，去者未归',
    bodyAffair: '病者缠绵，须防反复',
    travelAffair: '行人迟归，音信渺茫',
    seekingAffair: '急讨方得，官事宜缓',
    lostAffair: '失物南方见，急讨方称心',
    detailedText: '留连事难成，求谋日不明，官事只宜缓，去者未回程，失物南方见，急讨方称心，更须防口舌，人口且平平。留连为玄武之位，属水，主喑昧不明、拖延纠缠。凡谋事主二、八、十。',
  },
  3: {
    position: 3, name: '速喜', wuxing: '火', liushen: '朱雀', luckLevel: '中吉', direction: '南方',
    mainAffair: '喜事来临，快速可成',
    bodyAffair: '病者无碍，康复迅速',
    travelAffair: '行人即至，喜信在途',
    seekingAffair: '求财向南，逢人报喜',
    lostAffair: '失物申午未时方向寻找',
    detailedText: '速喜喜来临，求财向南行，失物申午未，逢人路上寻，官事有福德，病者无祸侵，田宅六畜吉，行人有信音。速喜为朱雀之位，属火，主喜事迅速、马到成功。凡谋事主三、六、九。',
  },
  4: {
    position: 4, name: '赤口', wuxing: '金', liushen: '白虎', luckLevel: '大凶', direction: '西方',
    mainAffair: '口舌是非，官非破财',
    bodyAffair: '病者沉重，须防加重',
    travelAffair: '行人惊慌，路途中阻',
    seekingAffair: '诸事不宜，谨防口舌',
    lostAffair: '失物急去寻，恐有争讼',
    detailedText: '赤口主口舌，官非切要防，失物急去寻，行人有惊慌，鸡犬多作怪，病者出西方，更须防诅咒，恐怕染瘟癀。赤口为白虎之位，属金，主口舌官非、破败损伤。凡谋事主四、七、十。',
  },
  5: {
    position: 5, name: '小吉', wuxing: '水', liushen: '六合', luckLevel: '小吉', direction: '北方',
    mainAffair: '凡事和合，好运将至',
    bodyAffair: '病者将愈，诚心祷祝',
    travelAffair: '行人立便至，音信即来',
    seekingAffair: '交易顺畅，诸事可成',
    lostAffair: '失物在坤方，寻之可得',
    detailedText: '小吉最吉昌，路上好商量，阴人来报喜，失物在坤方，行人立便至，交易甚是强，凡事皆和合，病者祷上苍。小吉为六合之位，属水，主和合喜事、万事顺遂。凡谋事主一、五、七。',
  },
  6: {
    position: 6, name: '空亡', wuxing: '土', liushen: '勾陈', luckLevel: '大凶', direction: '中央',
    mainAffair: '谋事落空，徒劳无功',
    bodyAffair: '病者沉重，宜祈福禳解',
    travelAffair: '行人杳无音信',
    seekingAffair: '求财无利，行人灾殃',
    lostAffair: '失物寻不见，宜速报案',
    detailedText: '空亡事不长，阴人小乘张，求财无利益，行人有灾殃，失物寻不见，官事主刑伤，病人逢暗鬼，禳解保安康。空亡为勾陈之位，属土，主谋事落空、徒劳无功。凡谋事主三、六、九。',
  },
};

const HOUR_TO_BRANCH: { branch: string; index: number }[] = [
  { branch: '子', index: 0 },  // 23:00-01:00
  { branch: '丑', index: 1 },  // 01:00-03:00
  { branch: '寅', index: 2 },  // 03:00-05:00
  { branch: '卯', index: 3 },  // 05:00-07:00
  { branch: '辰', index: 4 },  // 07:00-09:00
  { branch: '巳', index: 5 },  // 09:00-11:00
  { branch: '午', index: 6 },  // 11:00-13:00
  { branch: '未', index: 7 },  // 13:00-15:00
  { branch: '申', index: 8 },  // 15:00-17:00
  { branch: '酉', index: 9 },  // 17:00-19:00
  { branch: '戌', index: 10 }, // 19:00-21:00
  { branch: '亥', index: 11 }, // 21:00-23:00
];

@Injectable()
export class XiaoliurenCalculatorService {
  /**
   * 根据农历月、日、时辰推算小六壬掌诀位置
   *
   * 算法：
   * 1. 从寅位（大安=1）起正月，顺数至当月
   * 2. 从当月位置起初一，顺数至当日
   * 3. 从当日位置起子时，顺数至当时
   */
  calculateByTime(month: number, day: number, hour: number): XiaoliurenCalculationResult {
    const hourBranchIdx = this.hourToBranchIndex(hour);

    // 月：从寅位(大安=0)起正月，顺数
    const monthPos = (month - 1) % 6;
    // 日：从月位起初一，顺数
    const dayPos = (monthPos + day - 1) % 6;
    // 时：从日位起子时(index=0)，顺数至当前时辰
    const hourPos = (dayPos + hourBranchIdx) % 6;

    const monthResult = { ...PALM_POSITIONS[monthPos + 1] };
    const dayResult = { ...PALM_POSITIONS[dayPos + 1] };
    const hourResult = { ...PALM_POSITIONS[hourPos + 1] };

    return {
      result: { ...PALM_POSITIONS[hourPos + 1] },
      steps: {
        month: monthResult,
        day: dayResult,
        hour: hourResult,
      },
      path: [
        { from: '大安', to: monthResult.name, label: `正月起·${month}月` },
        { from: monthResult.name, to: dayResult.name, label: `初一起·${day}日` },
        { from: dayResult.name, to: hourResult.name, label: `子时起·${this.hourToBranchName(hour)}时` },
      ],
    };
  }

  /**
   * 根据3个随机数推算小六壬掌诀位置
   */
  calculateByRandom(r1: number, r2: number, r3: number): XiaoliurenCalculationResult {
    const p1 = (r1 - 1) % 6;
    const p2 = (p1 + r2 - 1) % 6;
    const p3 = (p2 + r3 - 1) % 6;

    const s1 = { ...PALM_POSITIONS[p1 + 1] };
    const s2 = { ...PALM_POSITIONS[p2 + 1] };
    const s3 = { ...PALM_POSITIONS[p3 + 1] };

    return {
      result: { ...PALM_POSITIONS[p3 + 1] },
      steps: { month: s1, day: s2, hour: s3 },
      path: [
        { from: '大安', to: s1.name, label: `上数 ${r1}` },
        { from: s1.name, to: s2.name, label: `中数 ${r2}` },
        { from: s2.name, to: s3.name, label: `下数 ${r3}` },
      ],
    };
  }

  /** 获取掌诀属性（通过位置或名称） */
  getPalmPosition(positionOrName: number | string): XiaoliurenResult | null {
    if (typeof positionOrName === 'number') {
      return PALM_POSITIONS[positionOrName] || null;
    }
    const found = Object.values(PALM_POSITIONS).find(p => p.name === positionOrName);
    return found || null;
  }

  /** 获取所有掌诀位置 */
  getAllPositions(): XiaoliurenResult[] {
    return Object.values(PALM_POSITIONS);
  }

  /** 24小时制 → 时辰地支索引 */
  hourToBranchIndex(hour: number): number {
    const idx = Math.floor((hour + 1) / 2) % 12;
    return idx;
  }

  /** 24小时制 → 时辰地支名称 */
  hourToBranchName(hour: number): string {
    return HOUR_TO_BRANCH[this.hourToBranchIndex(hour)].branch;
  }

  /** 获取时辰列表（供前端下拉选择） */
  getHourBranchOptions(): { label: string; value: number; index: number }[] {
    return HOUR_TO_BRANCH.map((h, i) => ({
      label: `${h.branch}时 (${i * 2}:00-${(i * 2 + 2) % 24}:00)`,
      value: i * 2,
      index: i,
    }));
  }
}
