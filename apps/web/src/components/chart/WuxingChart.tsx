'use client';

const WUXING_ORDER = ['木', '火', '土', '金', '水'] as const;

const WUXING_BAR_COLORS: Record<string, string> = {
  '木': 'bg-wx-wood',
  '火': 'bg-wx-fire',
  '土': 'bg-wx-earth',
  '金': 'bg-wx-metal',
  '水': 'bg-wx-water',
};

const WUXING_TEXT_COLORS: Record<string, string> = {
  '木': 'text-wx-wood',
  '火': 'text-wx-fire',
  '土': 'text-wx-earth',
  '金': 'text-wx-metal',
  '水': 'text-wx-water',
};

interface WuxingChartProps {
  wuxingScore: Record<string, number>;
  wuxingCounts: Record<string, number>;
  dayMaster: string;
  dayMasterWuxing: string;
  strength: number;
  strengthLevel: string;
}

export default function WuxingChart({
  wuxingScore,
  wuxingCounts,
  dayMaster,
  dayMasterWuxing,
  strength,
  strengthLevel,
}: WuxingChartProps) {
  const maxScore = Math.max(...WUXING_ORDER.map((wx) => wuxingScore[wx] ?? 0), 1);

  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        {WUXING_ORDER.map((wx) => {
          const score = wuxingScore[wx] ?? 0;
          const pct = Math.min(100, (score / maxScore) * 100);
          return (
            <div key={wx} className="flex items-center gap-2.5">
              <span className={`w-7 text-center text-sm font-bold ${WUXING_TEXT_COLORS[wx]}`}>
                {wx}
              </span>
              <div className="flex-1 h-5 bg-ink-100 rounded overflow-hidden">
                <div
                  className={`h-full rounded transition-all duration-700 ease-out ${WUXING_BAR_COLORS[wx]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-12 text-right text-sm tabular-nums text-ink-600">
                {score.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3 p-3 bg-primary-50 rounded-xl">
        <span className="text-sm text-ink-500">日主</span>
        <span className={`text-lg font-bold ${WUXING_TEXT_COLORS[dayMasterWuxing] ?? 'text-ink-800'}`}>
          {dayMaster}
        </span>
        <span className="text-sm text-ink-400">({dayMasterWuxing})</span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            strength >= 55
              ? 'bg-green-100 text-green-700'
              : strength >= 45
                ? 'bg-blue-100 text-blue-700'
                : 'bg-orange-100 text-orange-700'
          }`}
        >
          {strengthLevel} {strength}%
        </span>
      </div>

      <div className="flex justify-center gap-4 text-xs text-ink-500">
        {WUXING_ORDER.map((wx) => (
          <span key={wx} className="flex items-center gap-1">
            <span className={`font-medium ${WUXING_TEXT_COLORS[wx]}`}>{wx}</span>
            <span>{wuxingCounts[wx] ?? 0}个</span>
          </span>
        ))}
      </div>
    </div>
  );
}
