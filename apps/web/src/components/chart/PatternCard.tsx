'use client';

const SHEN_CONFIG = [
  { key: 'yongShen', label: '用神', accent: 'bg-gold-50 text-gold-700 border-gold-200' },
  { key: 'xiShen', label: '喜神', accent: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'jiShen', label: '忌神', accent: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'chouShen', label: '仇神', accent: 'bg-orange-50 text-orange-700 border-orange-200' },
] as const;

interface PatternCardProps {
  patternName: string;
  patternType: string;
  patternScore: number;
  yongShen: string;
  xiShen: string;
  jiShen: string;
  chouShen: string;
  tiaohuoNeed?: string;
}

export default function PatternCard({
  patternName,
  patternType,
  patternScore,
  yongShen,
  xiShen,
  jiShen,
  chouShen,
  tiaohuoNeed,
}: PatternCardProps) {
  const shenValues: Record<string, string> = { yongShen, xiShen, jiShen, chouShen };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-primary-50 rounded-xl">
        <div>
          <span className="text-xs text-ink-400 block">格局</span>
          <span className="text-lg font-bold text-primary-700 font-kai">{patternName}</span>
          {patternType && (
            <span className="ml-2 text-xs text-ink-500">({patternType})</span>
          )}
        </div>
        {patternScore > 0 && (
          <span className="px-2.5 py-1 text-xs font-medium bg-primary-100 text-primary-600 rounded-full">
            {patternScore}分
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {SHEN_CONFIG.map(({ key, label, accent }) => {
          const value = shenValues[key];
          if (!value) return null;
          return (
            <div
              key={key}
              className={`p-3 rounded-lg border text-center ${accent}`}
            >
              <span className="block text-xs opacity-70">{label}</span>
              <span className="block text-lg font-bold mt-0.5">{value}</span>
            </div>
          );
        })}
      </div>

      {tiaohuoNeed && (
        <div className="px-3 py-2 bg-ink-50 rounded-lg text-xs text-ink-500">
          调候用神：<strong className="text-ink-700">{tiaohuoNeed}</strong>
        </div>
      )}
    </div>
  );
}
