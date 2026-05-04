'use client';

import { type GanZhiRelation } from '@/lib/api';

type CategoryKey = '合' | '冲' | '刑' | '害' | 'other';

const TAG_STYLES: Record<CategoryKey, string> = {
  '合': 'bg-green-50 text-green-700 border-green-200',
  '冲': 'bg-red-50 text-red-700 border-red-200',
  '刑': 'bg-orange-50 text-orange-700 border-orange-200',
  '害': 'bg-purple-50 text-purple-700 border-purple-200',
  other: 'bg-ink-50 text-ink-600 border-ink-200',
};

const CATEGORY_ORDER: CategoryKey[] = ['合', '冲', '刑', '害', 'other'];

function getCategory(type: string): CategoryKey {
  for (const cat of ['合', '冲', '刑', '害'] as const) {
    if (type.includes(cat)) return cat;
  }
  return 'other';
}

interface RelationsDisplayProps {
  relations: GanZhiRelation[];
}

export default function RelationsDisplay({ relations }: RelationsDisplayProps) {
  if (!relations.length) return null;

  const grouped = relations.reduce<Record<CategoryKey, GanZhiRelation[]>>((acc, rel) => {
    const cat = getCategory(rel.type);
    (acc[cat] ??= []).push(rel);
    return acc;
  }, {} as Record<CategoryKey, GanZhiRelation[]>);

  return (
    <div className="space-y-3">
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (!items?.length) return null;
        const style = TAG_STYLES[cat];

        return (
          <div key={cat} className="flex flex-wrap gap-2">
            {items.map((rel, i) => (
              <span
                key={`${rel.type}-${rel.elements.join('')}-${i}`}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border font-medium ${style}`}
              >
                <span>{rel.elements.join('')}</span>
                <span className="opacity-60">{rel.type.replace('地支', '').replace('天干', '')}</span>
                {rel.result && <span className="font-semibold">{rel.result}</span>}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
