'use client';

import { HealthSuggestion, HealthWarning } from '@/lib/api';

interface HealthSuggestionCardProps {
  suggestions: HealthSuggestion | null;
  warnings: HealthWarning[];
  loading?: boolean;
}

interface OrganSuggestion {
  器官?: string;
  建议?: string;
  禁忌?: string;
  情志?: string;
  运动方式?: string;
}

function SuggestionSection({
  title,
  icon,
  items,
  colorClass,
}: {
  title: string;
  icon: string;
  items: OrganSuggestion[];
  colorClass: string;
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h4 className={`text-sm font-bold font-kai ${colorClass}`}>{title}</h4>
      </div>
      <div className="space-y-1">
        {items.slice(0, 5).map((item, i) => {
          const suggestionText = item.建议 || item.情志 || item.运动方式 || '';
          return (
            <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <span className="text-gray-400 mt-0.5">·</span>
              <span className="text-gray-700 font-kai flex-1">
                {item.器官 && <span className="font-bold text-ink-800">{item.器官}：</span>}
                {suggestionText}
              </span>
              {item.禁忌 && (
                <span className="text-xs text-red-500 font-kai ml-2">忌：{item.禁忌}</span>
              )}
            </div>
          );
        })}
        {items.length > 5 && (
          <div className="text-xs text-gray-400 font-kai">...等{items.length}项建议</div>
        )}
      </div>
    </div>
  );
}

function WarningBadge({ warning }: { warning: HealthWarning }) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    高: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    中: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    低: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  };
  const colors = colorMap[warning.严重程度] || colorMap.中;

  return (
    <div className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-bold font-kai text-ink-800">{warning.器官}</span>
          <span
            className={`ml-2 text-xs px-1.5 rounded ${
              warning.严重程度 === '高'
                ? 'bg-red-100 text-red-700'
                : warning.严重程度 === '中'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {warning.严重程度}风险
          </span>
        </div>
        <span className={`text-xs ${colors.text}`}>{warning.五行}行</span>
      </div>
      <p className="text-sm text-gray-600 mt-1 font-kai">{warning.描述}</p>
      <p className="text-xs text-gray-500 mt-1 font-kai italic">调理：{warning.建议}</p>
    </div>
  );
}

export default function HealthSuggestionCard({
  suggestions,
  warnings,
  loading,
}: HealthSuggestionCardProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 健康预警 */}
      {warnings && warnings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-ink-700 font-kai flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            健康预警
            <span className="text-xs font-normal text-gray-500 ml-1">({warnings.length}项)</span>
          </h3>
          <div className="space-y-2">
            {warnings.slice(0, 6).map((w, i) => (
              <WarningBadge key={i} warning={w} />
            ))}
            {warnings.length > 6 && (
              <p className="text-sm text-gray-500 font-kai text-center">
                还有{warnings.length - 6}项预警...
              </p>
            )}
          </div>
        </div>
      )}

      {/* 重点关注 */}
      {suggestions?.重点关注 && (
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
          <h3 className="text-base font-bold text-green-700 font-kai mb-3">调理重点</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 font-kai">虚弱脏腑（宜补）</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {(suggestions.重点关注.虚弱器官 || []).map((org, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-sm font-kai"
                  >
                    {org}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 font-kai">过旺脏腑（宜泄）</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {(suggestions.重点关注.过旺器官 || []).map((org, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-sm font-kai"
                  >
                    {org}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-green-200">
            <div className="text-xs text-gray-500 font-kai">调理原则</div>
            <div className="text-sm font-bold text-green-700 font-kai mt-1">
              {suggestions.重点关注.调理原则 || '整体调养，平衡五行'}
            </div>
          </div>
        </div>
      )}

      {/* 饮食调理 */}
      {suggestions?.饮食调理 && (
        <SuggestionSection
          title="饮食调理"
          icon="🍽️"
          items={suggestions.饮食调理.items || []}
          colorClass="text-orange-700"
        />
      )}

      {/* 起居调养 */}
      {suggestions?.起居调养 && (
        <SuggestionSection
          title="起居调养"
          icon="🌙"
          items={suggestions.起居调养.items || []}
          colorClass="text-indigo-700"
        />
      )}

      {/* 情志调摄 */}
      {suggestions?.情志调摄 && (
        <SuggestionSection
          title="情志调摄"
          icon="🧘"
          items={suggestions.情志调摄.items || []}
          colorClass="text-purple-700"
        />
      )}

      {/* 运动建议 */}
      {suggestions?.运动建议 && (
        <SuggestionSection
          title="运动建议"
          icon="🏃"
          items={suggestions.运动建议.items || []}
          colorClass="text-cyan-700"
        />
      )}

      {/* 节气养生 */}
      {suggestions?.节气养生 && Object.keys(suggestions.节气养生).length > 0 && (
        <div className="card bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100">
          <h3 className="text-base font-bold text-amber-700 font-kai mb-3 flex items-center gap-2">
            <span>🌿</span> 节气养生指导
          </h3>
          <div className="space-y-2">
            {Object.entries(suggestions.节气养生).map(([key, value]) => (
              <div key={key} className="flex items-start gap-2">
                <span className="text-xs font-bold text-amber-600 font-kai min-w-16">{key}</span>
                <span className="text-sm text-gray-700 font-kai">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}