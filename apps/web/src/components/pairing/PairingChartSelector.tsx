'use client';

import { useState, useEffect } from 'react';
import { userApi } from '@/lib/api';

interface ChartItem {
  id: number;
  name?: string;
  dayGan: string;
  gender: number;
}

interface PairingChartSelectorProps {
  selectedChartId?: number | null;
  onSelect: (chartId: number) => void;
  disabled?: boolean;
}

export function PairingChartSelector({
  selectedChartId,
  onSelect,
  disabled = false,
}: PairingChartSelectorProps) {
  const [charts, setCharts] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCharts = async () => {
      try {
        const res = await userApi.getCharts();
        const raw = res.data as any;
        // API returns either a plain array or { charts: [...] }
        const list = Array.isArray(raw) ? raw : (raw?.charts || []);
        setCharts(list);
      } catch {
        setCharts([]);
      } finally {
        setLoading(false);
      }
    };
    loadCharts();
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (charts.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-400">暂无命盘</p>
        <button
          className="mt-2 text-sm text-primary-500 hover:text-primary-600"
          onClick={() => window.location.href = '/chart'}
        >
          去新建命盘
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {charts.map((chart) => (
        <button
          key={chart.id}
          onClick={() => onSelect(chart.id)}
          disabled={disabled}
          className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all
            ${selectedChartId === chart.id
              ? 'bg-primary-50 border-primary-300 shadow-sm'
              : 'bg-white border-gray-200 hover:border-gray-300'
            }
            ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">
                {chart.name || '未命名命盘'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                日主：{chart.dayGan} · {chart.gender === 1 ? '男' : '女'}
              </p>
            </div>
            {selectedChartId === chart.id && (
              <svg className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
