// 八字基础类型 — 天干地支字面量, 不依赖任何其他模块

export const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export type TianGan = typeof TIAN_GAN[number];

export const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export type DiZhi = typeof DI_ZHI[number];

export const WUXING_LIST = ['金', '木', '水', '火', '土'] as const;
export type WuXing = typeof WUXING_LIST[number];
