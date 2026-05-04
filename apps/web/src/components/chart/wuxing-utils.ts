export const WUXING_COLORS: Record<string, string> = {
  '木': 'text-wx-wood',
  '火': 'text-wx-fire',
  '土': 'text-wx-earth',
  '金': 'text-wx-metal',
  '水': 'text-wx-water',
};

export const GAN_WUXING: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

export const ZHI_WUXING: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

export function wxColor(char: string): string {
  return WUXING_COLORS[GAN_WUXING[char] || ZHI_WUXING[char] || ''] || '';
}
