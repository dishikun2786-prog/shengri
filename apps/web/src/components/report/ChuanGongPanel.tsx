'use client';

const ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const ZHI_MONTH_LABELS: Record<string, string> = {
  '子': '十一月', '丑': '十二月', '寅': '正月', '卯': '二月',
  '辰': '三月', '巳': '四月', '午': '五月', '未': '六月',
  '申': '七月', '酉': '八月', '戌': '九月', '亥': '十月',
};

const TWELVE_STARS = [
  { name: '太岁', type: 'neutral', emoji: '⚪' },
  { name: '青龙', type: 'good', emoji: '🟢' },
  { name: '丧门', type: 'minor_bad', emoji: '🟡' },
  { name: '六合', type: 'good', emoji: '🟢' },
  { name: '官符', type: 'neutral', emoji: '⚪' },
  { name: '小耗', type: 'minor_bad', emoji: '🟡' },
  { name: '大耗', type: 'major_bad', emoji: '🔴' },
  { name: '朱雀', type: 'major_bad', emoji: '🔴' },
  { name: '白虎', type: 'major_bad', emoji: '🔴' },
  { name: '贵神', type: 'good', emoji: '🟢' },
  { name: '吊客', type: 'minor_bad', emoji: '🟡' },
  { name: '病符', type: 'minor_bad', emoji: '🟡' },
];

const STAR_DESC: Record<string, string> = {
  '太岁': '遇吉则吉遇凶则凶', '青龙': '喜事财运贵人',
  '丧门': '地丧孝服小病', '六合': '和美婚姻合作',
  '官符': '红鸾星动喜事', '小耗': '小偷破小财',
  '大耗': '大破财大凶', '朱雀': '口舌是非官灾',
  '白虎': '血光横祸丧服', '贵神': '贵人逢凶化吉',
  '吊客': '吊唁阴气不祥', '病符': '疾病体弱住院',
};

function yearToZhi(year: number): string {
  const zhiMap: Record<number, string> = {
    0: '申', 1: '酉', 2: '戌', 3: '亥', 4: '子', 5: '丑',
    6: '寅', 7: '卯', 8: '辰', 9: '巳', 10: '午', 11: '未',
  };
  return zhiMap[(year % 12 + 12) % 12] || '子';
}

function computeStars(year: number) {
  const yearZhi = yearToZhi(year);
  const startIdx = ZHI_ORDER.indexOf(yearZhi);
  return ZHI_ORDER.map((zhi, i) => {
    const starIdx = (i - startIdx + 12) % 12;
    const star = TWELVE_STARS[starIdx];
    return { branch: zhi, monthLabel: ZHI_MONTH_LABELS[zhi], ...star };
  });
}

interface ChuanGongPanelProps { year?: number }

export default function ChuanGongPanel({ year }: ChuanGongPanelProps) {
  const currentYear = year || new Date().getFullYear();
  const yearZhi = yearToZhi(currentYear);
  const stars = computeStars(currentYear);

  const goodCount = stars.filter((s) => s.type === 'good').length;
  const majorCount = stars.filter((s) => s.type === 'major_bad').length;
  const majorWarnings = stars.filter((s) => s.type === 'major_bad');

  let overall: string;
  if (majorCount >= 3) overall = '大凶之年，诸事谨慎';
  else if (majorCount >= 2) overall = '凶多吉少，保守行事';
  else if (goodCount >= 4) overall = '大吉之年，百事顺遂';
  else if (goodCount >= 2) overall = '吉多凶少，有利发展';
  else overall = '平运之年，吉凶参半';

  const overallColor = majorCount >= 2 ? 'text-red-600' : goodCount >= 2 ? 'text-green-600' : 'text-ink-600';

  return (
    <div className="card bg-gradient-to-br from-red-50/40 via-white to-amber-50/40 border-red-200">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎋</span>
        <h3 className="text-base font-bold font-kai text-red-700">
          盲派串宫压运 · {currentYear}（{yearZhi}年）
        </h3>
      </div>

      <p className={`text-sm font-bold font-kai mb-4 ${overallColor}`}>
        总体判断：{overall}
      </p>

      {/* Star grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 mb-3">
        {stars.map((s) => {
          const bgColor =
            s.type === 'major_bad' ? 'bg-red-100 border-red-300' :
            s.type === 'minor_bad' ? 'bg-amber-50 border-amber-200' :
            s.type === 'good' ? 'bg-green-50 border-green-200' :
            'bg-gray-50 border-gray-200';

          return (
            <div key={s.branch} className={`rounded-lg border p-1.5 text-center ${bgColor}`}>
              <div className="text-[10px] text-ink-400">{s.monthLabel}</div>
              <div className="text-xs font-bold font-kai mt-0.5">{s.name}</div>
              <div className="text-[10px] text-ink-400 mt-0.5 leading-tight">{STAR_DESC[s.name]}</div>
            </div>
          );
        })}
      </div>

      {/* Major warnings */}
      {majorWarnings.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs font-bold text-red-600 mb-1">⚠ 重大警示</p>
          <ul className="space-y-0.5">
            {majorWarnings.map((s, i) => (
              <li key={i} className="text-xs text-red-600">
                {s.name}临{s.branch}月：{STAR_DESC[s.name]}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
