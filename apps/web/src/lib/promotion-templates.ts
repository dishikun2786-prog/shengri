/** 推广员等级 */
export const DISTRIBUTOR_LEVELS: Record<number, { name: string; rate: string; upgradeReq: string }> = {
  1: { name: '普通推广员', rate: '产品默认佣金', upgradeReq: '注册即可' },
  2: { name: '金牌推广员', rate: 'L1佣金+5%', upgradeReq: '团队≥10人 或 收益≥¥5000' },
  3: { name: '钻石推广员', rate: 'L1+10%+L2+5%', upgradeReq: '团队≥50人 或 收益≥¥20000' },
};

/** 佣金状态标签 */
export const COMMISSION_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: '待结算', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  1: { label: '已结算', color: 'text-green-600 bg-green-50 border-green-200' },
  2: { label: '已提现', color: 'text-blue-600 bg-blue-50 border-blue-200' },
};

/** 推广攻略 */
export const PROMOTION_TIPS = [
  {
    title: '如何推广更高效',
    content: '将推广链接分享到朋友圈、微信群、知乎等平台，配上自己的真实体验和使用心得，转化率会更高。建议优先分享免费排盘链接，降低好友的体验门槛。',
  },
  {
    title: '佣金说明',
    content: '好友通过你的专属链接注册后，后续所有消费你都可以获得一级佣金。如果你的好友也成为推广员，他的推广收益你还能获得二级佣金，实现被动收入。',
  },
  {
    title: '提现规则',
    content: '佣金结算后自动进入待结算余额，点击"提现到余额"即可转入账户余额。余额可用于购买平台任意产品或通过卡密提现。提现后佣金记录状态变为"已结算"。',
  },
];
