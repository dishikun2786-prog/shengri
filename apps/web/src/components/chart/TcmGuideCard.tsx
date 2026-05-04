'use client';

interface TcmGuideCardProps {
  hasDayun: boolean;
  hasLiunian: boolean;
  hasLiuyue: boolean;
  hasLiuri: boolean;
}

const STEPS = [
  { key: 'dayun', label: '大运', desc: '选择大运周期' },
  { key: 'liunian', label: '流年', desc: '选择流年太岁' },
  { key: 'liuyue', label: '流月', desc: '选择流月' },
  { key: 'liuri', label: '流日', desc: '查看当日分析' },
] as const;

export default function TcmGuideCard({ hasDayun, hasLiunian, hasLiuyue, hasLiuri }: TcmGuideCardProps) {
  const completed = [hasDayun, hasLiunian, hasLiuyue, hasLiuri].filter(Boolean).length;
  const allDone = completed === 4;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-green-200/80"
         style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 40%, #f0fdf4 100%)' }}>
      {/* Decorative bg pattern */}
      <div className="absolute top-0 right-0 opacity-[0.06] text-8xl select-none pointer-events-none">⚕</div>

      <div className="relative px-6 py-5">
        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">
            🌿
          </div>
          <div>
            <h3 className="text-base font-bold text-green-800 font-kai">中医五运六气 · 健康养生</h3>
            <p className="text-xs text-green-600">
              {allDone
                ? '已选择完整时间链，右侧查看健康分析'
                : '逐步选择大运 → 流年 → 流月 → 流日，查看当日中医健康分析建议'}
            </p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((step, i) => {
            const done = [hasDayun, hasLiunian, hasLiuyue, hasLiuri][i];
            return (
              <div key={step.key} className="flex items-center gap-1.5">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all duration-300 ${
                  done
                    ? 'bg-green-100 border-green-300 text-green-700'
                    : 'bg-white/60 border-green-200/60 text-ink-400'
                }`}>
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    done
                      ? 'bg-green-500 text-white'
                      : 'bg-ink-100 text-ink-400'
                  }`}>
                    {done ? '✓' : i + 1}
                  </span>
                  <span className="font-medium text-xs whitespace-nowrap">{step.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <svg className={`w-4 h-4 shrink-0 ${done ? 'text-green-400' : 'text-ink-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-green-200/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(completed / 4) * 100}%` }}
            />
          </div>
          <span className="text-xs text-green-600 font-medium">{completed}/4</span>
        </div>

        {/* Hint when fully selected */}
        {allDone && (
          <p className="mt-3 text-xs text-green-700 bg-green-100/60 rounded-lg px-3 py-2">
            ✅ 已选择大运+流年+流月+流日，右侧健康面板将展示当日的五运六气分析与中医调养建议
          </p>
        )}
      </div>
    </div>
  );
}
