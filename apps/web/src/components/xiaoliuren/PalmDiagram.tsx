'use client';

// v2 - six-palace grid with liushen

interface PalmPosition {
  position: number;
  name: string;
  wuxing: string;
  liushen: string;
  luckLevel: string;
}

const POSITIONS: PalmPosition[] = [
  { position: 1, name: '大安', wuxing: '木', liushen: '青龙', luckLevel: '大吉' },
  { position: 2, name: '留连', wuxing: '水', liushen: '玄武', luckLevel: '凶' },
  { position: 3, name: '速喜', wuxing: '火', liushen: '朱雀', luckLevel: '中吉' },
  { position: 4, name: '赤口', wuxing: '金', liushen: '白虎', luckLevel: '大凶' },
  { position: 5, name: '小吉', wuxing: '水', liushen: '六合', luckLevel: '小吉' },
  { position: 6, name: '空亡', wuxing: '土', liushen: '勾陈', luckLevel: '大凶' },
];

const LIUSHEN_ICONS: Record<string, string> = {
  '青龙': '🐉', '玄武': '🐢', '朱雀': '🐦', '白虎': '🐯', '六合': '🤝', '勾陈': '🐍',
};

const WUXING_COLORS: Record<string, string> = {
  '木': '#4ade80', '火': '#ef4444', '土': '#f59e0b', '金': '#fbbf24', '水': '#3b82f6',
};

const STEP_COLORS = { month: '#60a5fa', day: '#4ade80', hour: '#fbbf24' };
const STEP_LABELS = { month: '月', day: '日', hour: '时' };

// Grid order: top row (留连, 速喜, 小吉), bottom row (大安, 空亡, 赤口)
const GRID_ORDER = [2, 3, 5, 1, 6, 4];

interface PalmDiagramProps {
  activePosition: number;
  steps?: {
    month: { position: number; name: string; wuxing: string; liushen?: string };
    day: { position: number; name: string; wuxing: string; liushen?: string };
    hour: { position: number; name: string; wuxing: string; liushen?: string };
  } | null;
  path?: { from: string; to: string; label: string }[] | null;
  size?: 'sm' | 'md' | 'lg';
}

export default function PalmDiagram({ activePosition, steps, path, size = 'md' }: PalmDiagramProps) {
  const dims = { sm: 'max-w-[320px]', md: 'max-w-[420px]', lg: 'max-w-[520px]' };

  return (
    <div className={`${dims[size]} mx-auto select-none`}>
      {/* Ink-paper scroll container */}
      <div className="relative rounded-2xl overflow-hidden" style={{
        background: 'linear-gradient(175deg, #fefcf5 0%, #f7f0e0 15%, #ede4cc 50%, #f5ecd8 85%, #faf5e8 100%)',
        boxShadow: '0 2px 24px rgba(80,40,10,0.12), 0 1px 4px rgba(80,40,10,0.08), inset 0 0 60px rgba(180,150,100,0.1)',
        border: '2px solid #d4c0a0',
      }}>
        {/* Paper texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {/* Corner decorations */}
        <CornerDeco className="top-2 left-2" />
        <CornerDeco className="top-2 right-2 flip" />
        <CornerDeco className="bottom-2 left-2 flip-v" />
        <CornerDeco className="bottom-2 right-2 flip-all" />

        {/* Title */}
        <div className="relative text-center pt-5 pb-2">
          <h3 className="text-lg font-bold font-kai tracking-widest" style={{ color: '#4a3520' }}>
            小六壬掌诀图
          </h3>
          <div className="flex justify-center items-center gap-2 mt-0.5">
            <div className="h-px flex-1 max-w-8" style={{ background: 'linear-gradient(to right, transparent, #c4a97d)' }} />
            <span className="text-[10px] tracking-wider" style={{ color: '#8b7355' }}>掐指一算 · 预知吉凶</span>
            <div className="h-px flex-1 max-w-8" style={{ background: 'linear-gradient(to left, transparent, #c4a97d)' }} />
          </div>
        </div>

        {/* Six-palace grid */}
        <div className="relative px-5 pb-4">
          <div className="grid grid-cols-3 gap-2.5">
            {GRID_ORDER.map((posIdx) => {
              const pos = POSITIONS.find(p => p.position === posIdx)!;
              const isResult = posIdx === activePosition;
              const stepType = getStepType(posIdx, steps);

              return (
                <PalaceCell
                  key={posIdx}
                  position={pos}
                  isResult={isResult}
                  stepType={stepType}
                />
              );
            })}
          </div>

          {/* Step indicators & path */}
          {steps && (
            <div className="mt-3 px-2">
              <StepPath path={path} steps={steps} activePosition={activePosition} />
            </div>
          )}
        </div>

        {/* Seal stamp - bottom right */}
        <div className="absolute bottom-3 right-4 opacity-40">
          <div className="w-8 h-8 rounded-sm flex items-center justify-center border-2 rotate-12"
            style={{ borderColor: '#c41e3a', color: '#c41e3a' }}>
            <span className="text-[8px] font-bold font-kai leading-tight text-center">生<br/>辰</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Palace Cell ----

function PalaceCell({ position: pos, isResult, stepType }: {
  position: PalmPosition;
  isResult: boolean;
  stepType: keyof typeof STEP_COLORS | null;
}) {
  const isActive = isResult || !!stepType;

  return (
    <div className={`
      relative rounded-xl p-2.5 text-center transition-all duration-500
      ${isActive ? 'scale-[1.03] z-10' : 'opacity-75 hover:opacity-90'}
    `}
    style={{
      background: isActive
        ? 'linear-gradient(135deg, #fffef9 0%, #fef9e8 100%)'
        : 'linear-gradient(135deg, #faf7ef 0%, #f5efe0 100%)',
      boxShadow: isActive
        ? `0 2px 16px rgba(80,40,10,0.15), 0 0 0 2px ${getStepBorderColor(pos.position, stepType, isResult)}`
        : '0 1px 3px rgba(80,40,10,0.06), 0 0 0 1px rgba(180,150,100,0.2)',
      border: isActive ? '1.5px solid transparent' : '1px solid rgba(180,150,100,0.15)',
    }}
    >
      {/* Step marker dot */}
      {isActive && (
        <div className="absolute -top-1.5 -right-1.5 flex gap-0.5">
          {stepType && (
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
              style={{ backgroundColor: STEP_COLORS[stepType] }}>
              {STEP_LABELS[stepType]}
            </span>
          )}
          {isResult && (
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm animate-pulse"
              style={{ backgroundColor: '#f59e0b' }}>
              局
            </span>
          )}
        </div>
      )}

      {/* Position name */}
      <div className={`text-sm font-bold font-kai tracking-wider ${isActive ? '' : ''}`}
        style={{ color: isActive ? '#3d2914' : '#6b5a44' }}>
        {pos.name}
      </div>

      {/* Liushen icon + name */}
      <div className="flex items-center justify-center gap-1 mt-0.5">
        <span className="text-xs">{LIUSHEN_ICONS[pos.liushen] || ''}</span>
        <span className="text-[10px] font-kai tracking-wide"
          style={{ color: isActive ? '#5d4037' : '#8d7b68' }}>
          {pos.liushen}
        </span>
      </div>

      {/* Wuxing */}
      <div className="mt-1">
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: `${WUXING_COLORS[pos.wuxing]}18`,
            color: WUXING_COLORS[pos.wuxing],
            border: `1px solid ${WUXING_COLORS[pos.wuxing]}30`,
          }}>
          {pos.wuxing}
        </span>
      </div>

      {/* Luck badge */}
      <div className="mt-1">
        <span className="text-[10px] font-kai" style={{ color: getLuckColor(pos.luckLevel) }}>
          {pos.luckLevel}
        </span>
      </div>
    </div>
  );
}

// ---- Step Path ----

function StepPath({ path, steps, activePosition }: {
  path?: { from: string; to: string; label: string }[] | null;
  steps: NonNullable<PalmDiagramProps['steps']>;
  activePosition: number;
}) {
  if (!path) return null;

  const stepData = [
    { key: 'month' as const, label: '月上起日', position: steps.month.position, color: STEP_COLORS.month },
    { key: 'day' as const, label: '日上起时', position: steps.day.position, color: STEP_COLORS.day },
    { key: 'hour' as const, label: '时上定局', position: steps.hour.position, color: STEP_COLORS.hour },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      {/* Path chain */}
      <div className="flex items-center justify-center gap-1 flex-wrap text-[11px] font-kai">
        {path.map((p, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded font-medium"
              style={{
                backgroundColor: 'rgba(180,150,100,0.15)',
                color: '#5d4037',
                border: '1px solid rgba(180,150,100,0.3)',
              }}>
              {p.from}
            </span>
            <svg className="w-3 h-3" style={{ color: '#b8956e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[10px]" style={{ color: '#9b8c7a' }}>{p.label}</span>
            <svg className="w-3 h-3" style={{ color: '#b8956e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {i === path.length - 1 && (
              <span className={`px-1.5 py-0.5 rounded font-bold ${
                (() => {
                  const pos = POSITIONS.find(x => x.name === p.to);
                  const lvl = pos?.luckLevel || '';
                  if (lvl.includes('吉')) return 'text-green-700';
                  if (lvl.includes('凶')) return 'text-red-600';
                  return '';
                })()
              }`} style={{
                backgroundColor: (() => {
                  const pos = POSITIONS.find(x => x.name === p.to);
                  const lvl = pos?.luckLevel || '';
                  if (lvl.includes('吉')) return 'rgba(34,197,94,0.12)';
                  if (lvl.includes('凶')) return 'rgba(239,68,68,0.12)';
                  return 'rgba(180,150,100,0.15)';
                })(),
              }}>
                {p.to}
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Step details: month/day/hour → 掌诀 + 六神 */}
      <div className="grid grid-cols-3 gap-2">
        {stepData.map((step) => {
          const posInfo = POSITIONS.find(p => p.position === step.position)!;
          return (
            <div key={step.key} className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
              style={{ backgroundColor: `${step.color}10`, border: `1px solid ${step.color}30` }}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                style={{ backgroundColor: step.color }}>
                {STEP_LABELS[step.key]}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-bold font-kai truncate" style={{ color: '#4a3520' }}>
                  {posInfo.name}
                </div>
                <div className="text-[9px] truncate" style={{ color: '#8b7355' }}>
                  {LIUSHEN_ICONS[posInfo.liushen]} {posInfo.liushen}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Helpers ----

function getStepType(posIdx: number, steps?: PalmDiagramProps['steps']): keyof typeof STEP_COLORS | null {
  if (!steps) return null;
  if (steps.hour?.position === posIdx) return 'hour';
  if (steps.day?.position === posIdx) return 'day';
  if (steps.month?.position === posIdx) return 'month';
  return null;
}

function getStepBorderColor(posIdx: number, stepType: keyof typeof STEP_COLORS | null, isResult: boolean): string {
  if (stepType) return STEP_COLORS[stepType];
  if (isResult) return '#f59e0b';
  return 'transparent';
}

function getLuckColor(level: string): string {
  if (level.includes('大吉')) return '#16a34a';
  if (level.includes('中吉') || level.includes('小吉')) return '#65a30d';
  if (level.includes('大凶')) return '#dc2626';
  return '#ea580c';
}

// ---- Corner Decoration ----

function CornerDeco({ className }: { className: string }) {
  return (
    <svg className={`absolute w-3.5 h-3.5 ${className}`} viewBox="0 0 14 14" fill="none">
      <path d="M1 13V5a4 4 0 014-4h8" stroke="#c4a97d" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export { POSITIONS };
