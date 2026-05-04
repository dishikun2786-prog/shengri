'use client';

import { type ChartResponse, type PillarData } from '@/lib/api';

const WUXING_COLORS: Record<string, string> = {
  '金': 'text-yellow-600 bg-yellow-50 border-yellow-300',
  '木': 'text-green-600 bg-green-50 border-green-300',
  '水': 'text-blue-600 bg-blue-50 border-blue-300',
  '火': 'text-red-600 bg-red-50 border-red-300',
  '土': 'text-amber-700 bg-amber-50 border-amber-300',
};

const TAI_SUI_COLORS: Record<string, string> = {
  '值太岁': 'bg-red-100 text-red-700 border-red-300',
  '冲太岁': 'bg-red-100 text-red-700 border-red-300',
  '刑太岁': 'bg-orange-100 text-orange-700 border-orange-300',
  '害太岁': 'bg-orange-100 text-orange-700 border-orange-300',
  '破太岁': 'bg-amber-100 text-amber-700 border-amber-300',
  '合太岁': 'bg-green-100 text-green-700 border-green-300',
};

function PillarBox({ label, pillar, kongWang }: { label: string; pillar: PillarData; kongWang?: string[] }) {
  const ganColor = WUXING_COLORS[pillar.gan_wuxing] || 'text-ink-800 bg-ink-50 border-ink-200';
  const zhiColor = WUXING_COLORS[pillar.zhi_wuxing] || 'text-ink-800 bg-ink-50 border-ink-200';
  const isKongWang = kongWang?.includes(pillar.zhi);

  return (
    <div className="flex flex-col items-center min-w-[72px]">
      <span className="text-xs text-ink-400 mb-2">{label}</span>
      <div className={`pillar-box ${ganColor}`}>
        <span className="gan-text">{pillar.gan}</span>
        <div className="w-full border-t border-current opacity-20 my-1" />
        <span className={`zhi-text ${zhiColor.split(' ')[0]}`}>{pillar.zhi}</span>
      </div>
      <div className="mt-2 text-xs text-ink-400">
        {pillar.hidden_gan?.join(' ') || ''}
      </div>
      {pillar.nayin && (
        <span className="text-xs text-ink-300 mt-1">{pillar.nayin}</span>
      )}
      {pillar.chang_sheng && (
        <span className="text-xs text-purple-500 mt-0.5">{pillar.chang_sheng}</span>
      )}
      {isKongWang && (
        <span className="text-xs px-1.5 py-0.5 mt-1 bg-ink-100 text-ink-500 rounded">空</span>
      )}
    </div>
  );
}

function WuxingBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = WUXING_COLORS[label]?.split(' ')[0] || 'text-ink-600';
  return (
    <div className="flex items-center gap-2">
      <span className={`w-8 text-center font-bold ${color}`}>{label}</span>
      <div className="flex-1 bg-ink-100 rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm text-ink-500 w-10 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

function RelationTag({ type, elements, result }: { type: string; elements: string[]; result: string }) {
  const isPositive = type.includes('合');
  const color = isPositive
    ? 'bg-green-50 text-green-700 border-green-200'
    : 'bg-red-50 text-red-700 border-red-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${color}`}>
      <span>{elements.join('')}</span>
      <span className="opacity-60">{type.replace('地支', '').replace('天干', '')}</span>
      {result && <span className="font-medium">{result}</span>}
    </span>
  );
}

export default function ChartDisplay({ chart, onBuyReport }: { chart: ChartResponse; onBuyReport?: (type: string) => void }) {
  const maxScore = Math.max(...Object.values(chart.wuxing_score || {}), 1);

  return (
    <div className="space-y-8">
      {/* 四柱展示 */}
      <div className="card">
        <h3 className="text-xl font-bold text-center mb-6 font-kai text-primary-700">
          {chart.gender === 1 ? '乾造' : '坤造'}命盘
        </h3>

        <div className="text-center text-sm text-ink-400 mb-4 space-y-1">
          {chart.lunar_date && (
            <p>
              农历：{chart.lunar_date}
              {chart.time_correction_min !== 0 && (
                <span className="ml-2">
                  真太阳时校正：{chart.time_correction_min > 0 ? '+' : ''}{chart.time_correction_min}分钟
                </span>
              )}
            </p>
          )}
          {chart.jieqi_info && (
            <p className="text-ink-300">{chart.jieqi_info}</p>
          )}
        </div>

        <div className="flex justify-center gap-4 md:gap-8">
          <PillarBox label="年柱" pillar={chart.year_pillar} kongWang={chart.kong_wang} />
          <PillarBox label="月柱" pillar={chart.month_pillar} kongWang={chart.kong_wang} />
          <PillarBox label="日柱" pillar={chart.day_pillar} kongWang={chart.kong_wang} />
          <PillarBox label="时柱" pillar={chart.hour_pillar} kongWang={chart.kong_wang} />
        </div>

        {/* 日主信息 */}
        <div className="mt-6 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-full">
            <span className="text-sm text-ink-500">日主</span>
            <span className="text-lg font-bold text-primary-700">{chart.day_master}</span>
            <span className="text-sm text-ink-500">({chart.day_master_wuxing})</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              chart.day_master_strength >= 55
                ? 'bg-green-100 text-green-700'
                : chart.day_master_strength >= 45
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-orange-100 text-orange-700'
            }`}>
              {chart.strength_level} ({chart.day_master_strength}分)
            </span>
          </span>
        </div>

        {/* 胎元/命宫/身宫 + 空亡 */}
        <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-ink-500">
          {chart.tai_yuan && (
            <span className="px-3 py-1.5 bg-ink-50 rounded-lg">胎元：<strong className="text-ink-700">{chart.tai_yuan}</strong></span>
          )}
          {chart.ming_gong && (
            <span className="px-3 py-1.5 bg-ink-50 rounded-lg">{chart.ming_gong}</span>
          )}
          {chart.shen_gong && (
            <span className="px-3 py-1.5 bg-ink-50 rounded-lg">{chart.shen_gong}</span>
          )}
          {chart.kong_wang?.length > 0 && (
            <span className="px-3 py-1.5 bg-ink-50 rounded-lg">
              空亡：<strong className="text-ink-700">{chart.kong_wang.join(' ')}</strong>
            </span>
          )}
        </div>
      </div>

      {/* 干支关系 */}
      {chart.relations?.length > 0 && (
        <div className="card">
          <h4 className="font-bold mb-4 text-primary-700">干支关系</h4>
          <div className="flex flex-wrap gap-2">
            {chart.relations.map((rel, i) => (
              <RelationTag key={i} type={rel.type} elements={rel.elements} result={rel.result} />
            ))}
          </div>
        </div>
      )}

      {/* 格局/用神 + 五行力量 */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h4 className="font-bold mb-4 text-primary-700">五行力量分布</h4>
          <div className="space-y-3">
            {['木', '火', '土', '金', '水'].map((wx) => (
              <WuxingBar
                key={wx}
                label={wx}
                value={chart.wuxing_score?.[wx] || 0}
                max={maxScore}
              />
            ))}
          </div>
        </div>

        <div className="card space-y-4">
          {/* 格局 */}
          {chart.pattern_name && (
            <div>
              <h4 className="font-bold mb-3 text-primary-700">格局分析</h4>
              <div className="p-3 bg-primary-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary-700 font-kai">{chart.pattern_name}</span>
                  {chart.pattern_score > 0 && (
                    <span className="text-xs px-2 py-1 bg-primary-100 text-primary-600 rounded-full">
                      {chart.pattern_score}分
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 用神 */}
          {chart.yong_shen && (
            <div>
              <h4 className="font-bold mb-3 text-primary-700">用神喜忌</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-green-50 rounded-lg text-center">
                  <span className="text-xs text-green-600">用神</span>
                  <span className={`block text-lg font-bold mt-1 ${WUXING_COLORS[chart.yong_shen]?.split(' ')[0] || ''}`}>
                    {chart.yong_shen}
                  </span>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg text-center">
                  <span className="text-xs text-blue-600">喜神</span>
                  <span className={`block text-lg font-bold mt-1 ${WUXING_COLORS[chart.xi_shen]?.split(' ')[0] || ''}`}>
                    {chart.xi_shen}
                  </span>
                </div>
                <div className="p-2 bg-red-50 rounded-lg text-center">
                  <span className="text-xs text-red-600">忌神</span>
                  <span className={`block text-lg font-bold mt-1 ${WUXING_COLORS[chart.ji_shen]?.split(' ')[0] || ''}`}>
                    {chart.ji_shen}
                  </span>
                </div>
                <div className="p-2 bg-orange-50 rounded-lg text-center">
                  <span className="text-xs text-orange-600">仇神</span>
                  <span className={`block text-lg font-bold mt-1 ${WUXING_COLORS[chart.chou_shen]?.split(' ')[0] || ''}`}>
                    {chart.chou_shen}
                  </span>
                </div>
              </div>
              {chart.tiaohuo_need && (
                <p className="mt-2 text-xs text-ink-400">
                  调候用神：<strong className="text-ink-600">{chart.tiaohuo_need}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 十神 & 神煞 */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h4 className="font-bold mb-4 text-primary-700">十神分布</h4>
          <div className="grid grid-cols-2 gap-2">
            {chart.ten_gods?.filter((t) => !t.position.includes('hidden')).map((tg, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-ink-50 rounded-lg">
                <span className="text-sm font-medium">{tg.gan}</span>
                <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                  {tg.ten_god}
                </span>
              </div>
            ))}
          </div>
        </div>

        {chart.shensha_list?.length > 0 && (
          <div className="card">
            <h4 className="font-bold mb-4 text-primary-700">神煞</h4>
            <div className="flex flex-wrap gap-2">
              {chart.shensha_list.map((ss, idx) => (
                <span key={`${ss.name}-${ss.pillar}-${idx}`} className="px-2.5 py-1.5 bg-gold-50 text-gold-700 text-xs rounded-full border border-gold-200 font-medium">
                  {ss.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 大运 */}
      {chart.dayun_list?.length > 0 && (
        <div className="card">
          <h4 className="font-bold mb-4 text-primary-700">
            大运走势
            {chart.dayun_start_age > 0 && (
              <span className="text-xs font-normal text-ink-400 ml-2">
                ({chart.dayun_start_age}岁起运，{chart.dayun_direction === 1 ? '顺行' : '逆行'})
              </span>
            )}
          </h4>
          <div className="overflow-x-auto">
            <div className="flex gap-3 min-w-max pb-2">
              {chart.dayun_list.map((dy) => (
                <div
                  key={dy.index}
                  className="flex flex-col items-center p-3 rounded-xl border border-ink-200 hover:border-primary-300 hover:bg-primary-50 transition-all min-w-[88px]"
                >
                  <span className="text-xs text-ink-400">{dy.start_age}-{dy.end_age}岁</span>
                  <span className="text-lg font-bold font-kai mt-1">{dy.gan}{dy.zhi}</span>
                  <div className="flex gap-1 mt-1">
                    <span className="text-xs text-primary-600">{dy.ten_god_gan}</span>
                    {dy.ten_god_zhi && (
                      <span className="text-xs text-ink-400">{dy.ten_god_zhi}</span>
                    )}
                  </div>
                  {dy.chang_sheng && (
                    <span className="text-xs text-purple-500 mt-0.5">{dy.chang_sheng}</span>
                  )}
                  {dy.nayin && (
                    <span className="text-xs text-ink-300 mt-0.5">{dy.nayin}</span>
                  )}
                  <span className="text-xs text-ink-300 mt-0.5">{dy.start_year}-{dy.end_year}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 流年 */}
      {chart.liunian_list?.length > 0 && (
        <div className="card">
          <h4 className="font-bold mb-4 text-primary-700">近十年流年</h4>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {chart.liunian_list.map((ln) => (
              <div
                key={ln.year}
                className={`text-center p-2 rounded-lg border transition-all ${
                  ln.tai_sui
                    ? TAI_SUI_COLORS[ln.tai_sui] || 'border-ink-100'
                    : 'border-ink-100 hover:border-primary-300'
                }`}
              >
                <span className="block text-xs text-ink-400">{ln.year}</span>
                <span className="block font-bold font-kai">{ln.gan}{ln.zhi}</span>
                <span className="block text-xs text-primary-500">{ln.ten_god_gan}</span>
                {ln.chang_sheng && (
                  <span className="block text-xs text-purple-400">{ln.chang_sheng}</span>
                )}
                {ln.tai_sui && (
                  <span className="block text-xs font-medium mt-0.5">{ln.tai_sui}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="card bg-gradient-to-br from-primary-50 to-gold-50 border-primary-200">
        <div className="text-center">
          <h4 className="text-lg font-bold text-primary-700 mb-2">想要深入了解您的命盘？</h4>
          <p className="text-ink-500 text-sm mb-4">
            AI智能分析可以为您提供2000字以上的专业解读，包括财运、事业、婚姻等多维度深度分析
          </p>
          <div className="flex justify-center gap-4">
            <button className="btn-primary" onClick={() => onBuyReport?.('free')}>
              ¥9.9 基础报告
            </button>
            <button className="btn-gold" onClick={() => onBuyReport?.('wealth')}>
              ¥199 深度分析
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
