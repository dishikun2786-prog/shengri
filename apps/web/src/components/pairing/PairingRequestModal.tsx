'use client';

import { useState } from 'react';
import { pairingApi, baziApi, userApi } from '@/lib/api';
import { PairingChartSelector } from './PairingChartSelector';
import ChartCreationForm from '@/components/ChartCreationForm';

const PAIRING_TYPES: Record<string, string> = {
  personality: '性格匹配',
  career: '事业合作',
  wealth: '财运互补',
  hehun: '合婚分析',
  comprehensive: '综合配对',
};

interface PairingRequestModalProps {
  visible: boolean;
  targetUserId: number;
  targetUserName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PairingRequestModal({
  visible,
  targetUserId,
  targetUserName,
  onClose,
  onSuccess,
}: PairingRequestModalProps) {
  const [selectedType, setSelectedType] = useState('comprehensive');
  const [selectedChartId, setSelectedChartId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showNewChart, setShowNewChart] = useState(false);
  const [chartsRefreshKey, setChartsRefreshKey] = useState(0);

  if (!visible) return null;

  const handleSend = async () => {
    if (!selectedChartId) {
      setError('请选择用于配对的命盘');
      return;
    }
    setError('');
    setSending(true);
    try {
      await pairingApi.sendRequest({
        receiverId: targetUserId,
        pairingType: selectedType,
        message: message.trim() || undefined,
        chartId: selectedChartId,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || '发送配对请求失败');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md mx-auto p-6
        animate-slide-up shadow-xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">发起配对</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          与 <span className="font-medium text-gray-700">{targetUserName}</span> 进行配对分析
        </p>

        {/* Pairing Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">配对类型</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PAIRING_TYPES).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedType(key)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all
                  ${selectedType === key
                    ? 'bg-primary-50 border-primary-300 text-primary-700 shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Selection - required */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              选择命盘 <span className="text-red-400">*</span>
            </label>
            {!showNewChart && (
              <button
                type="button"
                onClick={() => setShowNewChart(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-500 text-white
                  rounded-lg text-xs font-medium hover:bg-primary-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新建命盘
              </button>
            )}
          </div>

          {showNewChart ? (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
              <ChartCreationForm
                compact
                submitLabel="创建并选择"
                onSubmit={(payload) => baziApi.saveChart(payload)}
                onSuccess={(id) => {
                  setSelectedChartId(id);
                  setShowNewChart(false);
                  setChartsRefreshKey(k => k + 1);
                  setError('');
                }}
              />
            </div>
          ) : (
            <PairingChartSelector
              key={chartsRefreshKey}
              selectedChartId={selectedChartId}
              onSelect={(id) => { setSelectedChartId(id); setError(''); }}
              disabled={sending}
              onCreateNew={() => setShowNewChart(true)}
            />
          )}
        </div>

        {/* Message */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            留言 <span className="text-gray-400 font-normal">（选填）</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="给对方留个言吧..."
            maxLength={200}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm
              focus:ring-2 focus:ring-primary-200 focus:border-primary-300
              placeholder-gray-400 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/200</p>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium
              text-gray-600 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !selectedChartId}
            className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium
              hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {sending ? '发送中...' : '发送配对请求'}
          </button>
        </div>
      </div>
    </div>
  );
}
