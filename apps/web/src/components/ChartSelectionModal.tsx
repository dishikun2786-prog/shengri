'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userApi } from '@/lib/api';

interface ChartItem {
  id: number;
  uuid?: string;
  name?: string;
  gender?: number;
  yearGan?: string;
  yearZhi?: string;
  monthGan?: string;
  monthZhi?: string;
  dayGan?: string;
  dayZhi?: string;
  hourGan?: string;
  hourZhi?: string;
  createdAt?: string;
}

interface ChartSelectionModalProps {
  reportType: string;
  isPaid: boolean;
  orderNo?: string;
  onSelect: (chartId: number) => void;
  onCancel: () => void;
}

const GAN_WUXING_COLOR: Record<string, string> = {
  '甲': 'text-green-700', '乙': 'text-green-600',
  '丙': 'text-red-600', '丁': 'text-red-500',
  '戊': 'text-amber-700', '己': 'text-amber-600',
  '庚': 'text-yellow-600', '辛': 'text-yellow-500',
  '壬': 'text-blue-600', '癸': 'text-blue-500',
};

export default function ChartSelectionModal({
  reportType,
  isPaid,
  onSelect,
  onCancel,
}: ChartSelectionModalProps) {
  const router = useRouter();
  const [charts, setCharts] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChartId, setSelectedChartId] = useState<number | null>(null);

  useEffect(() => {
    userApi.getCharts()
      .then((res) => {
        const data = res.data;
        setCharts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setCharts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreateNew = () => {
    onCancel();
    router.push(`/?redirect=buy&type=${reportType}`);
  };

  const handleConfirm = () => {
    if (selectedChartId) {
      onSelect(selectedChartId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-xl animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b border-ink-100"
          style={{ background: 'linear-gradient(135deg, #fdf8f4 0%, #f5ebe0 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center text-white text-lg">
              ☰
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink-800 font-kai">选择命盘</h2>
              <p className="text-sm text-ink-500">请选择一个命盘来生成分析报告</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded-xl skeleton-shimmer" />
              ))}
            </div>
          ) : charts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-ink-50 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl opacity-30">☯</span>
              </div>
              <p className="text-ink-500 font-kai">暂无保存的命盘</p>
              <p className="text-sm text-ink-400 mt-1">请创建一个新命盘</p>
            </div>
          ) : (
            <div className="space-y-3">
              {charts.map((chart) => {
                const chartId = Number(chart.id);
                const isSelected = selectedChartId === chartId;
                return (
                  <button
                    key={chart.id}
                    onClick={() => setSelectedChartId(chartId)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'border-ink-100 hover:border-primary-200 hover:bg-primary-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-ink-800 font-kai">
                            {chart.name || '我的命盘'}
                          </h3>
                          <span className="text-xs text-ink-400">
                            {chart.gender === 1 ? '♂ 乾造' : '♀ 坤造'}
                          </span>
                        </div>

                        {/* 四柱展示 */}
                        <div className="flex gap-2 mt-2">
                          {[
                            { label: '年', gan: chart.yearGan, zhi: chart.yearZhi },
                            { label: '月', gan: chart.monthGan, zhi: chart.monthZhi },
                            { label: '日', gan: chart.dayGan, zhi: chart.dayZhi },
                            { label: '时', gan: chart.hourGan, zhi: chart.hourZhi },
                          ].map((p) => (
                            <div
                              key={p.label}
                              className="flex-1 text-center py-1.5 rounded-lg bg-white/60 border border-ink-100/50"
                            >
                              <div className="text-[10px] text-ink-300 mb-0.5">{p.label}柱</div>
                              <div
                                className={`text-sm font-kai font-bold ${
                                  GAN_WUXING_COLOR[p.gan || ''] || 'text-ink-700'
                                }`}
                              >
                                {p.gan || '?'}{p.zhi || '?'}
                              </div>
                            </div>
                          ))}
                        </div>

                        {chart.createdAt && (
                          <p className="text-xs text-ink-300 mt-2">
                            {new Date(chart.createdAt).toLocaleDateString('zh-CN')} 创建
                          </p>
                        )}
                      </div>

                      {/* Radio indicator */}
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ml-3 transition-all ${
                          isSelected
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-ink-300'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ink-100 bg-ink-50/50 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-ink-200 text-ink-500 hover:bg-white hover:border-ink-300 transition-all text-sm font-medium"
          >
            取消
          </button>
          <button
            onClick={handleCreateNew}
            className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-all text-sm font-medium"
          >
            创建新命盘
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedChartId}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white hover:from-gold-600 hover:to-gold-700 transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            确认生成
          </button>
        </div>
      </div>
    </div>
  );
}