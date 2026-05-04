/** 报告类型对应的显示名称，与产品页 PRODUCTS 保持一致 */
export const REPORT_TYPE_LABELS: Record<string, string> = {
  free: '免费排盘',
  basic: '基础命理分析',
  wealth: '财运深度分析',
  marriage: '婚姻感情分析',
  career: '事业发展分析',
  annual: '流年大运分析',
  hehun: '合婚配对分析',
  partner: '合伙人匹配分析',
  enterprise: '企业发展周期分析',
  full: '全方位深度分析',
  pairing: '配对分析',
};

/** 分享页面转化文案 */
export const SHARE_PAGE = {
  sharerSuffix: '分享了这份命理报告',
  title: '命理报告分享',
  description: '查看朋友分享的八字命理分析报告',
  primaryCTA: '免费生成我的命理报告',
  secondaryCTA: '查看完整报告',
  lockedHint: '解锁查看完整报告',
  viewCountPrefix: '已有 ',
  viewCountSuffix: ' 人查看过这份报告',
  platformStats: '已有 50,000+ 位用户生成命理报告',
  platformIntro: '八字命理专业平台',
  platformDesc: 'AI + 古典命理，精准解读人生密码',
  privacyNote: '严格数据保密 · 专业大师团队',
  footer: '© 2026 生辰 ShengRi',
  notFound: '该分享链接已不存在或已失效',
  notFoundCTA: '免费生成我的报告',
  expiredTitle: '分享链接已过期',
  limitedTime: '限时免费查看',
};

/** 分享弹窗文案 */
export const SHARE_MODAL = {
  title: '分享报告',
  copyButton: '复制链接',
  copied: '已复制',
  wechatHint1: '长按二维码 → 识别图中二维码',
  wechatHint2: '或点击右上角 ··· 分享给朋友',
  scanTip: '扫一扫分享给微信好友',
};

/** 平台统计数据 */
export const PLATFORM_STATS = {
  totalUsers: '50,000+',
  totalReports: '200,000+',
};
