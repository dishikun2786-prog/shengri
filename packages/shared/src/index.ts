// ShengRi Shared Types

export interface Pillar {
  gan: string;
  zhi: string;
  gan_wuxing: string;
  zhi_wuxing: string;
  nayin: string;
  hidden_gan: string[];
  chang_sheng: string;
}

export interface TenGodEntry {
  gan: string;
  ten_god: string;
  position: string;
}

export interface DaYun {
  index: number;
  start_age: number;
  end_age: number;
  gan: string;
  zhi: string;
  ten_god_gan: string;
  ten_god_zhi: string;
  nayin: string;
  chang_sheng: string;
  start_year: number;
  end_year: number;
}

export interface LiuNian {
  year: number;
  gan: string;
  zhi: string;
  ten_god_gan: string;
  ten_god_zhi: string;
  nayin: string;
  chang_sheng: string;
  tai_sui: string;
}

export interface ShenshaEntry {
  name: string;
  pillar: string;
  category: string;
}

export interface LiuYue {
  month: number;
  gan: string;
  zhi: string;
  ten_god_gan: string;
  ten_god_zhi: string;
  nayin: string;
  jieqi_name: string;
}

export interface LiuRi {
  day: number;
  solar_date: string;
  gan: string;
  zhi: string;
  ten_god_gan: string;
  ten_god_zhi: string;
  nayin: string;
}

export interface GanZhiRelation {
  type: string;
  positions: string[];
  elements: string[];
  result: string;
}

export interface BaziChart {
  year_pillar: Pillar;
  month_pillar: Pillar;
  day_pillar: Pillar;
  hour_pillar: Pillar;
  day_master: string;
  day_master_wuxing: string;
  day_master_strength: number;
  strength_level: string;
  wuxing_counts: Record<string, number>;
  wuxing_score: Record<string, number>;
  ten_gods: TenGodEntry[];
  shensha_list: ShenshaEntry[];
  kong_wang: string[];
  chang_sheng: Record<string, string>;
  tai_yuan: string;
  ming_gong: string;
  shen_gong: string;
  tai_xi: string;
  relations: GanZhiRelation[];
  pattern_type: string;
  pattern_name: string;
  pattern_score: number;
  yong_shen: string;
  xi_shen: string;
  ji_shen: string;
  chou_shen: string;
  tiaohuo_need: string;
  dayun_direction: number;
  dayun_start_age: number;
  dayun_list: DaYun[];
  liunian_list: LiuNian[];
  lunar_date: string;
  true_solar_time: string;
  time_correction_min: number;
  jieqi_info: string;
  midnight_rule: string;
  gender: number;
  lunar_input?: {
    year: number;
    month: number;
    day: number;
    isLeapMonth: boolean;
  };
}

export interface Product {
  id: number;
  productCode: string;
  name: string;
  subtitle?: string;
  category: string;
  reportType?: string;
  originalPrice: number;
  currentPrice: number;
}

export interface Order {
  id: number;
  orderNo: string;
  userId: number;
  productId: number;
  paidAmount: number;
  status: number;
  paymentMethod?: string;
}

export interface AnalysisReport {
  id: number;
  uuid: string;
  reportType: string;
  aiContent?: string;
  aiSummary?: string;
  ruleTags?: string[];
  ruleScores?: Record<string, number>;
  upsellHook?: string;
  isPaid: boolean;
}

export { WUXING_LIST, TIAN_GAN, DI_ZHI, type WuXing, type TianGan, type DiZhi } from './bazi-primitives';
export * from './bazi-constants';

export const REPORT_TYPES = {
  free: '免费速断',
  wealth: '财运分析',
  marriage: '婚姻分析',
  career: '事业分析',
  annual: '流年大运',
  hehun: '合婚分析',
  partner: '合伙人匹配',
  enterprise: '企业分析',
  pairing: '配对分析',
  xiaoliuren: '小六壬占卜',
  digital_energy: '数字能量',
  bazhai: '八宅风水',
} as const;

export type ReportType = keyof typeof REPORT_TYPES;

// ==================== 小六壬 ====================

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

export interface XiaoliurenInput {
  inputType: 'time' | 'random';
  month?: number;
  day?: number;
  hour?: number;
  random1?: number;
  random2?: number;
  random3?: number;
  question?: string;
}

export interface XiaoliurenRecord {
  id: number;
  uuid: string;
  userId: number;
  inputType: string;
  inputDetail: any;
  resultPosition: number;
  resultName: string;
  question?: string;
  createdAt: string;
}

export const ORDER_STATUS = {
  0: '待支付',
  1: '已支付',
  2: '已完成',
  3: '退款中',
  4: '已退款',
  5: '已取消',
} as const;

// ==================== 配对系统 ====================

export const PAIRING_TYPES = {
  personality: '性格匹配',
  career: '事业合作',
  wealth: '财运互补',
  hehun: '合婚分析',
  comprehensive: '综合配对',
} as const;

export type PairingType = keyof typeof PAIRING_TYPES;

export const PAIRING_STATUS: Record<number, string> = {
  0: '等待同意',
  1: '已同意',
  2: '已拒绝',
  3: '配置中',
  4: '分析中',
  5: '已完成',
  6: '已取消',
};

export interface PairingRequest {
  uuid: string;
  pairingType: string;
  status: number;
  message?: string;
  initiator: {
    id: number;
    nickname: string | null;
    username: string | null;
    avatarUrl: string | null;
    bio?: string | null;
  };
  receiver: {
    id: number;
    nickname: string | null;
    username: string | null;
    avatarUrl: string | null;
    bio?: string | null;
  };
  initiatorChart?: {
    id: number;
    name?: string;
    dayGan: string;
    gender: number;
  };
  receiverChart?: {
    id: number;
    name?: string;
    dayGan: string;
    gender: number;
  };
  initiatorConfigured: boolean;
  receiverConfigured: boolean;
  report?: {
    uuid: string;
    aiContent?: string;
    aiSummary?: string;
    ruleScores?: Record<string, number>;
    ruleTags?: string[];
    ruleResults?: any;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: number;
  uuid: string;
  type: string;
  title: string;
  body?: string;
  refType?: string;
  refId?: string;
  isRead: boolean;
  createdAt: string;
}

export const VIP_LEVELS = {
  0: '免费版',
  1: '基础VIP',
  2: '高级VIP',
  3: '企业VIP',
} as const;
