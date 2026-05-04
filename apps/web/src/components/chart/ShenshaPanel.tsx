'use client';

import { type ShenshaEntry } from '@/lib/api';

const PILLAR_LABEL: Record<string, string> = {
  year: '年',
  month: '月',
  day: '日',
  hour: '时',
  multiple: '命',
};

const CATEGORY_CONFIG: Record<string, { label: string; badge: string }> = {
  '吉': {
    label: '吉神',
    badge: 'bg-gold-50 text-gold-700 border border-gold-200',
  },
  '凶': {
    label: '凶煞',
    badge: 'bg-red-50 text-red-700 border border-red-200',
  },
  '中': {
    label: '中性',
    badge: 'bg-ink-50 text-ink-600 border border-ink-200',
  },
};

const CATEGORY_ORDER = ['吉', '凶', '中'] as const;

interface ShenShaPanelProps {
  shenshaList: ShenshaEntry[];
}

export default function ShenshaPanel({ shenshaList }: ShenShaPanelProps) {
  const grouped = shenshaList.reduce<Record<string, ShenshaEntry[]>>((acc, entry) => {
    const cat = entry.category in CATEGORY_CONFIG ? entry.category : '中';
    (acc[cat] ??= []).push(entry);
    return acc;
  }, {});

  if (shenshaList.length === 0) return null;

  return (
    <div className="space-y-4">
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (!items?.length) return null;
        const config = CATEGORY_CONFIG[cat];

        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <h5 className="text-sm font-semibold text-ink-700">{config.label}</h5>
              <span className="text-xs text-ink-400">({items.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((entry, i) => (
                <span
                  key={`${entry.name}-${entry.pillar}-${i}`}
                  className={`inline-flex items-center px-2.5 py-1 text-xs rounded-full font-medium ${config.badge}`}
                >
                  {entry.name}
                  <span className="opacity-60 ml-0.5">
                    ({PILLAR_LABEL[entry.pillar] ?? entry.pillar})
                  </span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
