'use client';

import { WuYunDetail } from '@/lib/api';

interface WuyunLiuqiPanelProps {
  wuyunData: WuYunDetail | null;
  loading?: boolean;
  targetDate: string;
}

const WUXING_ICONS: Record<string, string> = {
  木: '🪵',
  火: '🔥',
  土: '🌍',
  金: '⚪',
  水: '💧',
};

const LIUQI_NAMES: Record<string, { color: string; desc: string }> = {
  厥阴风木: { color: '#4CAF50', desc: '风木之气，易动易散' },
  少阴君火: { color: '#F44336', desc: '君火之气，温和而热' },
  少阳相火: { color: '#FF9800', desc: '相火之气，热而速' },
  太阴湿土: { color: '#795548', desc: '湿土之气，黏滞重浊' },
  阳明燥金: { color: '#9E9E9E', desc: '燥金之气，干燥清肃' },
  太阳寒水: { color: '#2196F3', desc: '寒水之气，收藏凝寒' },
};

function ZhiqiCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ 节气: string; 名称: string; 月份: string; 类型: string }>;
}) {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-ink-700 font-kai flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-ink-400" />
        {title}
      </h4>
      <div className="grid grid-cols-3 gap-2">
        {safeItems.map((item, i) => {
          const liuqiInfo = LIUQI_NAMES[item.名称];
          const isKe = item.类型 === '客气';
          return (
            <div
              key={i}
              className={`p-2 rounded-lg border ${
                isKe ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="text-xs text-gray-500 font-kai">{item.节气}</div>
              <div
                className="text-sm font-bold font-kai mt-1"
                style={{ color: liuqiInfo?.color || '#666' }}
              >
                {item.名称}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{item.月份}</div>
              {isKe && (
                <span className="inline-block mt-1 text-[10px] px-1 rounded bg-amber-100 text-amber-700">
                  客气
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YunCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ 运次: string; 五行: string; 音律: string; 节气: string; 主运: string; 太过不及: string; 影响脏腑: string }>;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-ink-700 font-kai flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-ink-400" />
        {title}
      </h4>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: _getWuxingColor(item.五行) }}
            >
              {WUXING_ICONS[item.五行] || '⚪'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-kai text-ink-800">{item.运次}</span>
                <span className="text-xs text-gray-500">{item.音律}</span>
                <span
                  className={`text-xs px-1 rounded ${
                    item.太过不及 === '太过' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {item.太过不及}
                </span>
              </div>
              <div className="text-xs text-gray-500 font-kai">{item.节气}</div>
            </div>
            <div className="text-xs text-gray-400">{item.影响脏腑}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function _getWuxingColor(wx: string): string {
  const map: Record<string, string> = { 木: '#4CAF50', 火: '#F44336', 土: '#FF9800', 金: '#9E9E9E', 水: '#2196F3' };
  return map[wx] || '#9E9E9E';
}

export default function WuyunLiuqiPanel({ wuyunData, loading, targetDate }: WuyunLiuqiPanelProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!wuyunData) {
    return (
      <div className="text-center py-8 text-gray-400 font-kai">
        选择日期查看五运六气详情
      </div>
    );
  }

  const {
    年干,
    年支,
    天干化运,
    运之太过不及,
    地支化气_司天,
    地支化气_在泉,
    主气,
    客气,
    当年五运,
    当年六气,
  } = wuyunData;

  const sitianInfo = 地支化气_司天 ? LIUQI_NAMES[地支化气_司天] : undefined;
  const zaiquanInfo = 地支化气_在泉 ? LIUQI_NAMES[地支化气_在泉] : undefined;

  return (
    <div className="space-y-6">
      {/* 年度概览 */}
      <div className="card">
        <h3 className="text-base font-bold text-ink-700 mb-3 font-kai">年运概览</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
            <div className="text-xs text-amber-600 font-kai">天干化运</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-amber-800">{WUXING_ICONS[天干化运 || ''] || '⚪'}</span>
              <div>
                <div className="text-sm font-bold text-amber-800 font-kai">{天干化运}运</div>
                <span
                  className={`text-xs px-1.5 rounded ${
                    运之太过不及 === '太过' ? 'bg-red-200 text-red-800' : 'bg-blue-200 text-blue-800'
                  }`}
                >
                  {运之太过不及}
                </span>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
            <div className="text-xs text-purple-600 font-kai">年支</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-purple-800">{年支}</span>
              <div>
                <div className="text-sm font-bold text-purple-800 font-kai">{地支化气_司天}</div>
                <div className="text-xs text-purple-600">司天</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-xs text-gray-500">司天（上半年）</div>
              <div
                className="text-sm font-bold font-kai mt-1"
                style={{ color: sitianInfo?.color || '#666' }}
              >
                {地支化气_司天}
              </div>
            </div>
            <div className="flex-1 mx-4 h-px bg-gradient-to-r from-amber-300 via-purple-300 to-cyan-300" />
            <div className="text-center">
              <div className="text-xs text-gray-500">在泉（下半年）</div>
              <div
                className="text-sm font-bold font-kai mt-1"
                style={{ color: zaiquanInfo?.color || '#666' }}
              >
                {地支化气_在泉}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 当日主运客气 */}
      <div className="card">
        <h3 className="text-base font-bold text-ink-700 mb-3 font-kai">当日运气</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border-2 border-green-200 bg-green-50">
            <div className="text-xs text-green-600 font-kai">主运</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-3xl font-bold" style={{ color: _getWuxingColor(wuyunData.当日主运) }}>
                {WUXING_ICONS[wuyunData.当日主运 || ''] || '⚪'}
              </span>
              <div>
                <div className="text-lg font-bold text-green-800 font-kai">{wuyunData.当日主运}行</div>
                <div className="text-xs text-green-600">当日主令</div>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg border-2 border-amber-200 bg-amber-50">
            <div className="text-xs text-amber-600 font-kai">客气</div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-3xl font-bold"
                style={{ color: LIUQI_NAMES[wuyunData.当日客气]?.color || '#666' }}
              >
                {wuyunData.当日客气 ? wuyunData.当日客气.slice(-2, -1) : '⚪'}
              </span>
              <div>
                <div className="text-sm font-bold text-amber-800 font-kai">{wuyunData.当日客气}</div>
                <div className="text-xs text-amber-600">客气当令</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
          <div className="text-xs text-blue-600 font-kai mb-1">养生重点</div>
          <div className="text-sm text-blue-800 font-kai">
            {wuyunData.养生重点?.调养建议 || '顺应天时，调养脏腑'}
          </div>
          {/* 主运养生详细 */}
          {wuyunData.养生重点?.主运养生 && (
            <div className="mt-3 space-y-2">
              <div className="p-2 rounded bg-green-50 border border-green-100">
                <div className="text-xs text-green-600 font-kai font-bold">主运养生</div>
                <div className="text-sm text-green-800 font-kai mt-1">{wuyunData.养生重点.主运养生}</div>
                {wuyunData.养生重点.主运饮食 && (
                  <div className="text-xs text-green-700 font-kai mt-1">饮食：{wuyunData.养生重点.主运饮食}</div>
                )}
                {wuyunData.养生重点.主运经络 && (
                  <div className="text-xs text-green-700 font-kai">经络：{wuyunData.养生重点.主运经络}</div>
                )}
                {wuyunData.养生重点.主运情志 && (
                  <div className="text-xs text-green-700 font-kai">情志：{wuyunData.养生重点.主运情志}</div>
                )}
                {wuyunData.养生重点.主运时辰 && (
                  <div className="text-xs text-green-700 font-kai">时辰：{wuyunData.养生重点.主运时辰}</div>
                )}
              </div>
              {/* 客气养生详细 */}
              {wuyunData.养生重点.客气养生 && (
                <div className="p-2 rounded bg-amber-50 border border-amber-100">
                  <div className="text-xs text-amber-600 font-kai font-bold">客气养生</div>
                  <div className="text-sm text-amber-800 font-kai mt-1">{wuyunData.养生重点.客气养生}</div>
                  {wuyunData.养生重点.客气调理 && (
                    <div className="text-xs text-amber-700 font-kai mt-1">调理：{wuyunData.养生重点.客气调理}</div>
                  )}
                  {wuyunData.养生重点.客气易患 && (
                    <div className="text-xs text-amber-700 font-kai">易患：{wuyunData.养生重点.客气易患}</div>
                  )}
                  {wuyunData.养生重点.客气预防 && (
                    <div className="text-xs text-amber-700 font-kai">预防：{wuyunData.养生重点.客气预防}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 主气客气详细 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <ZhiqiCard title="主气（恒定六步）" items={主气 || []} />
        </div>
        <div className="card">
          <ZhiqiCard title="客气（逐年变化）" items={客气 || []} />
        </div>
      </div>

      {/* 五运详细 */}
      {当年五运 && 当年五运.length > 0 && (
        <div className="card">
          <YunCard title="当年五运" items={当年五运} />
        </div>
      )}

      {/* 六气详细 */}
      {当年六气 && 当年六气.length > 0 && (
        <div className="card">
          <h4 className="text-sm font-bold text-ink-700 font-kai flex items-center gap-2 mb-3">
            <span className="w-1 h-4 rounded-full bg-ink-400" />
            当年六气
          </h4>
          <div className="space-y-2">
            {(当年六气 as Array<{
              节气序号: number;
              节气: string;
              客气名称: string;
              节气范围: string;
              对应脏腑: string;
              对应腑: string;
              当令: string;
            }>).map((item, i) => {
              const liuqiInfo = LIUQI_NAMES[item.客气名称];
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    item.当令 === '司天' ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: liuqiInfo?.color || '#666' }}
                  >
                    {item.节气序号}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-kai text-ink-800">{item.节气}</span>
                      <span
                        className="text-sm font-kai"
                        style={{ color: liuqiInfo?.color || '#666' }}
                      >
                        {item.客气名称}
                      </span>
                      {item.当令 === '司天' && (
                        <span className="text-[10px] px-1 rounded bg-purple-200 text-purple-800">
                          司天
                        </span>
                      )}
                      {item.当令 === '在泉' && (
                        <span className="text-[10px] px-1 rounded bg-cyan-200 text-cyan-800">
                          在泉
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 font-kai">
                      {item.节气范围} · {item.对应脏腑}{item.对应腑 ? `/${item.对应腑}` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}