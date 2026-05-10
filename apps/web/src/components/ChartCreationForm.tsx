'use client';

import { useState, useMemo } from 'react';
import { type ChartRequest } from '@/lib/api';
import CityPicker, { type CitySelection } from '@/components/CityPicker';

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const labels = [
    '子时(23-01)', '丑时(01-03)', '丑时(01-03)', '寅时(03-05)', '寅时(03-05)',
    '卯时(05-07)', '卯时(05-07)', '辰时(07-09)', '辰时(07-09)', '巳时(09-11)',
    '巳时(09-11)', '午时(11-13)', '午时(11-13)', '未时(13-15)', '未时(13-15)',
    '申时(15-17)', '申时(15-17)', '酉时(17-19)', '酉时(17-19)', '戌时(19-21)',
    '戌时(19-21)', '亥时(21-23)', '亥时(21-23)', '子时(23-01)',
  ];
  return { value: i, label: `${i.toString().padStart(2, '0')}:00 ${labels[i]}` };
});

const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const LUNAR_MONTH_NAMES = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月',
];

interface ChartCreationFormProps {
  onSubmit: (payload: ChartRequest) => Promise<any>;
  onSuccess?: (chartId: number) => void;
  initialValues?: Partial<ChartRequest>;
  compact?: boolean;
  submitLabel?: string;
}

export default function ChartCreationForm({
  onSubmit,
  onSuccess,
  initialValues,
  compact = false,
  submitLabel = '立即排盘',
}: ChartCreationFormProps) {
  const [form, setForm] = useState<ChartRequest>({
    year: initialValues?.year ?? 1990,
    month: initialValues?.month ?? 1,
    day: initialValues?.day ?? 1,
    hour: initialValues?.hour ?? 12,
    minute: initialValues?.minute ?? 0,
    gender: initialValues?.gender ?? 1,
    city: initialValues?.city ?? '',
    calendar_type: initialValues?.calendar_type ?? 'solar',
    name: initialValues?.name ?? '',
  });
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [midnightRule, setMidnightRule] = useState<'early' | 'late'>('early');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isLunar = form.calendar_type === 'lunar';
  const maxDay = isLunar ? 30 : 31;

  const lunarMonthOptions = useMemo(() => {
    const options: { value: number; label: string; isLeap: boolean }[] = [];
    for (let i = 1; i <= 12; i++) {
      options.push({ value: i, label: LUNAR_MONTH_NAMES[i - 1], isLeap: false });
    }
    return options;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload: ChartRequest = {
        ...form,
        midnight_rule: midnightRule,
      };
      if (isLunar) {
        payload.is_leap_month = isLeapMonth;
      }
      const res = await onSubmit(payload);
      const id = res.data?.id || res.data?.chart?.id;
      if (id && onSuccess) onSuccess(id);
    } catch (err: any) {
      const data = err.response?.data;
      const msg =
        (typeof data?.message === 'string' && data.message) ||
        (Array.isArray(data?.message) && data.message.join(' ')) ||
        data?.detail;
      setError(msg || '排盘失败，请检查输入或稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const gridCols = compact ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <form onSubmit={handleSubmit} className={`${compact ? 'space-y-3' : 'space-y-4'}`}>
      {/* Calendar Type Toggle */}
      <div className="flex justify-center mb-2">
        <div className="inline-flex rounded-xl border-2 border-ink-200 overflow-hidden">
          <button
            type="button"
            className={`px-5 py-1.5 text-sm font-medium transition-all ${
              !isLunar ? 'bg-primary-500 text-white' : 'bg-white text-ink-500 hover:bg-ink-50'
            }`}
            onClick={() => {
              setForm({ ...form, calendar_type: 'solar' });
              setIsLeapMonth(false);
            }}
          >
            阳历
          </button>
          <button
            type="button"
            className={`px-5 py-1.5 text-sm font-medium transition-all ${
              isLunar ? 'bg-primary-500 text-white' : 'bg-white text-ink-500 hover:bg-ink-50'
            }`}
            onClick={() => setForm({ ...form, calendar_type: 'lunar' })}
          >
            农历
          </button>
        </div>
      </div>

      {/* Name + Gender */}
      <div className={`grid ${gridCols} gap-3`}>
        <div>
          <label className="block text-sm text-ink-500 mb-1">姓名</label>
          <input
            type="text"
            className="input-field w-full"
            placeholder="选填"
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={20}
          />
        </div>
        <div className={compact ? '' : 'col-span-2'}>
          <label className="block text-sm text-ink-500 mb-1">性别</label>
          <div className="flex gap-2 mt-0.5">
            <button
              type="button"
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                form.gender === 1
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-ink-200 text-ink-500'
              }`}
              onClick={() => setForm({ ...form, gender: 1 })}
            >
              男(乾造)
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                form.gender === 2
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-ink-200 text-ink-500'
              }`}
              onClick={() => setForm({ ...form, gender: 2 })}
            >
              女(坤造)
            </button>
          </div>
        </div>
      </div>

      {/* Year / Month / Day */}
      <div className={`grid ${gridCols} gap-3`}>
        <div>
          <label className="block text-sm text-ink-500 mb-1">
            {isLunar ? '农历年' : '出生年'}
          </label>
          <input
            type="number"
            className="input-field"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: +e.target.value })}
            min={1900} max={2100}
          />
        </div>
        <div>
          <label className="block text-sm text-ink-500 mb-1">
            {isLunar ? '农历月' : '月'}
          </label>
          <select
            className="input-field"
            value={form.month}
            onChange={(e) => setForm({ ...form, month: +e.target.value })}
          >
            {isLunar
              ? lunarMonthOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))
              : Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}月</option>
                ))}
          </select>
          {isLunar && (
            <label className="flex items-center gap-1.5 mt-1.5 text-xs text-ink-400">
              <input
                type="checkbox"
                className="rounded border-ink-300"
                checked={isLeapMonth}
                onChange={(e) => setIsLeapMonth(e.target.checked)}
              />
              闰月
            </label>
          )}
        </div>
        <div>
          <label className="block text-sm text-ink-500 mb-1">
            {isLunar ? '农历日' : '日'}
          </label>
          <select
            className="input-field"
            value={form.day}
            onChange={(e) => setForm({ ...form, day: +e.target.value })}
          >
            {Array.from({ length: maxDay }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}日</option>
            ))}
          </select>
        </div>
      </div>

      {/* Hour / Minute (only in normal mode; compact hides to save space) */}
      {!compact && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-ink-500 mb-1">出生时辰</label>
            <select
              className="input-field"
              value={form.hour}
              onChange={(e) => setForm({ ...form, hour: +e.target.value })}
            >
              {HOURS.map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-ink-500 mb-1">分钟</label>
            <select
              className="input-field"
              value={form.minute}
              onChange={(e) => setForm({ ...form, minute: +e.target.value })}
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>{m.toString().padStart(2, '0')}分</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* City picker */}
      <div>
        <label className="block text-sm text-ink-500 mb-1">出生城市（真太阳时校正）</label>
        <CityPicker
          value={form.city}
          onChange={(selection: CitySelection) => setForm({ ...form, city: selection.name })}
        />
      </div>

      {/* Advanced Settings */}
      {!compact && (
        <div>
          <button
            type="button"
            className="text-xs text-ink-400 hover:text-ink-600 transition-colors flex items-center gap-1"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span className={`transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>▸</span>
            高级设置
          </button>
          {showAdvanced && (
            <div className="mt-2 p-3 bg-ink-50 rounded-xl space-y-2">
              <div>
                <label className="block text-xs text-ink-500 mb-1">子时规则</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                      midnightRule === 'early'
                        ? 'border-primary-400 bg-primary-50 text-primary-700'
                        : 'border-ink-200 text-ink-400'
                    }`}
                    onClick={() => setMidnightRule('early')}
                  >
                    早子时（23时换日柱）
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                      midnightRule === 'late'
                        ? 'border-primary-400 bg-primary-50 text-primary-700'
                        : 'border-ink-200 text-ink-400'
                    }`}
                    onClick={() => setMidnightRule('late')}
                  >
                    晚子时（0时换日柱）
                  </button>
                </div>
                <p className="text-xs text-ink-400 mt-1">
                  * 早子时：23:00后日柱切换到次日。多数命理流派采用此规则。
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`${compact ? 'py-2.5 text-sm' : 'text-lg'} btn-primary w-full`}
      >
        {loading ? '排盘中...' : submitLabel}
      </button>
    </form>
  );
}
