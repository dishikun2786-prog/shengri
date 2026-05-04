'use client';

const SCORE_LABELS: Record<string, string> = {
  blind_destiny_level: '命局层次',
  blind_life_level: '人生格局',
  blind_wealth_potential: '财富潜力',
  blind_leadership: '领导力',
  blind_authority: '权力格局',
  blind_career_rank: '事业层级',
  blind_creative_wealth: '才华变现',
  blind_body_use_score: '体用平衡',
  blind_host_guest_score: '宾主配置',
  blind_intellect: '才智学识',
  blind_talent_wealth: '技能致富',
  blind_entrepreneur: '创业指数',
  blind_leader: '领导指数',
  blind_marriage_stability: '婚姻稳定',
  blind_noble_help: '贵人运',
  blind_academic_star: '学业运',
};

const WORK_TYPE_LABELS: Record<string, string> = {
  '开库做功': '墓用开库',
  '食伤制杀': '食伤制官杀',
  '杀印相生': '杀印相生',
  '官印相生': '官印相生',
  '食伤生财做功': '食伤生财',
  '合财官做功': '合财合官',
  '比劫制财': '比劫制财',
  '无功': '无功',
  '反局做功': '反局做功',
  '家内取家外': '家内取家外',
};

const LEVEL_STYLES: Record<string, string> = {
  '大人物': 'bg-purple-100 text-purple-700 border-purple-200',
  '富贵命': 'bg-gold-100 text-gold-700 border-gold-200',
  '有势有功': 'bg-green-100 text-green-700 border-green-200',
  '有功无势': 'bg-blue-100 text-blue-700 border-blue-200',
  '有势无功': 'bg-amber-100 text-amber-700 border-amber-200',
  '五行强势': 'bg-red-100 text-red-700 border-red-200',
  '体用相当': 'bg-green-100 text-green-700 border-green-200',
  '体弱用旺': 'bg-amber-100 text-amber-700 border-amber-200',
  '体旺用弱': 'bg-blue-100 text-blue-700 border-blue-200',
  '反局': 'bg-purple-100 text-purple-700 border-purple-200',
  '宾主混杂': 'bg-gray-100 text-gray-600 border-gray-200',
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : value >= 35 ? '#f97316' : '#ef4444';
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-ink-500 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-8 text-right font-mono font-medium" style={{ color }}>{value}</span>
    </div>
  );
}

interface MangpaiInsightCardProps {
  ruleTags?: string[];
  ruleScores?: Record<string, number>;
}

export default function MangpaiInsightCard({ ruleTags, ruleScores }: MangpaiInsightCardProps) {
  const tags = ruleTags || [];
  const scores = ruleScores || {};

  // Extract blind school tags
  const blindTags = tags.filter((t) =>
    Object.keys(WORK_TYPE_LABELS).includes(t) ||
    Object.keys(LEVEL_STYLES).includes(t) ||
    t.startsWith('盲派') ||
    t === '命局层次低'
  );

  // Extract blind school scores
  const blindScores = Object.entries(scores)
    .filter(([key]) => key.startsWith('blind_') && SCORE_LABELS[key])
    .map(([key, val]) => ({ key, label: SCORE_LABELS[key], value: Number(val) || 0 }))
    .sort((a, b) => b.value - a.value);

  if (blindTags.length === 0 && blindScores.length === 0) return null;

  return (
    <div className="card bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/60 border-indigo-200">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🔮</span>
        <h3 className="text-base font-bold font-kai text-indigo-700">盲派命理分析</h3>
      </div>

      {/* Tags */}
      {blindTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {blindTags.map((tag) => {
            const style = LEVEL_STYLES[tag] || 'bg-indigo-50 text-indigo-700 border-indigo-200';
            const label = WORK_TYPE_LABELS[tag] || tag;
            return (
              <span key={tag} className={`px-2.5 py-1 text-xs rounded-full border ${style}`}>
                {label}
              </span>
            );
          })}
        </div>
      )}

      {/* Score bars */}
      {blindScores.length > 0 && (
        <div className="space-y-1.5">
          {blindScores.slice(0, 8).map((s) => (
            <ScoreBar key={s.key} label={s.label} value={s.value} />
          ))}
        </div>
      )}
    </div>
  );
}
