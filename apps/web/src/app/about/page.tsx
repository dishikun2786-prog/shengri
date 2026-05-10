import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '关于我们 - 生日命理',
};

const STATS = [
  { value: '100万+', label: '累计排盘' },
  { value: '99.9%', label: '精准度' },
  { value: '4.9分', label: '用户好评' },
  { value: '10+', label: '命理维度' },
];

const FEATURES = [
  {
    icon: '🎯',
    title: '真太阳时精准校正',
    desc: '基于出生地经纬度自动计算真太阳时，排除时区与行政时差，排盘精度达到分钟级。支持全球城市数据库，自动匹配时区与经纬度。',
    tags: ['真太阳时', '经纬度校正', '分钟级精度'],
  },
  {
    icon: '🤖',
    title: 'AI 深度解读',
    desc: '融合传统子平命理与盲派铁口直断，通过先进大语言模型（DeepSeek 深度思考模式）进行多维度分析。每份报告经过规则引擎验证 + AI 双重推演，确保结论专业、精准、可追溯。',
    tags: ['DeepSeek', '深度思考', '双重验证'],
  },
  {
    icon: '🌿',
    title: '五运六气中医健康',
    desc: '独门融合《黄帝内经》运气七篇与八字命盘，从天人合一视角分析先天体质、脏腑强弱、当年运气影响，提供流年/流月/流日的个性化中医养生方案，包含食疗、经络、情志、运动全方位建议。',
    tags: ['黄帝内经', '体质分析', '养生方案'],
  },
  {
    icon: '🔮',
    title: '盲派铁口直断',
    desc: '传承盲派千年师传口诀，覆盖婚姻、事业、财运、健康、凶灾五大维度。做功体系（开库、制用、化用、合用）+ 体用宾主 + 串宫压运，直击命局核心，结论精准果断，非传统含糊其辞的命理分析可比。',
    tags: ['做功体系', '体用宾主', '35条直断口诀'],
  },
  {
    icon: '💍',
    title: '配对/合婚分析',
    desc: '支持5种专业配对类型：性格匹配、事业合作、财运互补、合婚分析、综合配对。基于双方八字的干支生克合冲刑害关系，结合AI深度分析，给出配对评分、优势互补点和潜在风险预警。',
    tags: ['合婚', '事业配对', '5种类型'],
  },
  {
    icon: '📊',
    title: '规则引擎驱动',
    desc: '内置十神、格局、用神、神煞、大运、流年、盲派等22个命理规则模块，覆盖120+条规则。每条AI结论都经过规则引擎验证，确保分析结果可追溯、可验证，而非纯粹AI自由发挥。',
    tags: ['22个模块', '120+规则', '可验证'],
  },
  {
    icon: '📅',
    title: '大运流年流月流日详解',
    desc: '10年大运逐年分析 + 未来10年流年逐岁推演 + 流月流日五运六气合参。标注财运爆发年、桃花年、贵人年、风险年等关键节点，给出每个年份的具体行动建议和健康防范重点。',
    tags: ['逐年分析', '关键节点标注', '行动建议'],
  },
  {
    icon: '🛡️',
    title: '隐私安全保障',
    desc: '用户数据加密存储，不向第三方共享个人信息。AI分析基于命理算法而非用户身份数据，尊重并保护每一位用户的隐私权利。',
    tags: ['数据加密', '隐私优先'],
  },
];

const HIGHLIGHTS = [
  {
    icon: '🧠',
    title: 'DeepSeek 深度思考',
    desc: '采用最新的AI推理模型，在生成报告前进行多步骤推理和交叉验证，确保每条论断都有坚实的命理依据。',
  },
  {
    icon: '⚡',
    title: '22个规则引擎模块',
    desc: '涵盖十神、格局、用神、神煞、大运、流年、盲派做功、婚姻、事业、财运、健康、凶灾等全维度分析。',
  },
  {
    icon: '🎓',
    title: '子平 + 盲派双体系',
    desc: '独创传统子平法与盲派铁口直断双体系融合分析，既有格局用神的系统性，又有做功直断的精准性。',
  },
  {
    icon: '🌏',
    title: '天人合一视角',
    desc: '八字命理与五运六气深度融合，从天地运气的大背景中理解个人命运，提供"天时-地利-人和"的全维度分析。',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #fdf8f4 0%, #f5ebe0 30%, #ede0d0 100%)' }}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 text-9xl">☰</div>
          <div className="absolute bottom-10 right-10 text-9xl">☷</div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[16rem]">☯</div>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-6">☯</div>
          <h1 className="text-4xl md:text-5xl font-bold font-kai text-primary-800 mb-5">
            关于 生日命理
          </h1>
          <p className="text-lg md:text-xl text-ink-500 max-w-2xl mx-auto leading-relaxed mb-8">
            将千年命理智慧与前沿人工智能深度融合，
            <br className="hidden md:block" />
            打造专业、精准、易用的八字命理分析平台
          </p>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white/80 backdrop-blur rounded-2xl p-4 border border-ink-100">
                <div className="text-2xl md:text-3xl font-bold text-primary-600 font-kai">{s.value}</div>
                <div className="text-xs text-ink-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Highlights */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl md:text-3xl font-bold font-kai text-primary-700 text-center mb-2">
          为什么选择我们
        </h2>
        <p className="text-center text-ink-400 text-sm mb-10">四大核心优势，重新定义 AI 命理分析</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {HIGHLIGHTS.map((h) => (
            <div
              key={h.title}
              className="group relative bg-white rounded-2xl p-6 border border-ink-100/80
                         hover:border-primary-200 hover:shadow-lg hover:-translate-y-1
                         transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary-50 to-transparent rounded-tr-2xl -z-0" />
              <div className="text-3xl mb-3">{h.icon}</div>
              <h3 className="font-bold text-ink-800 text-base mb-2">{h.title}</h3>
              <p className="text-sm text-ink-500 leading-relaxed">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* All Features */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl md:text-3xl font-bold font-kai text-primary-700 text-center mb-2">
          平台功能全景
        </h2>
        <p className="text-center text-ink-400 text-sm mb-10">8大核心功能模块，覆盖命理分析全维度</p>
        <div className="grid md:grid-cols-2 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="group relative bg-white rounded-2xl p-6 border border-ink-100/80
                         hover:border-gold-200 hover:shadow-lg
                         transition-all duration-300"
            >
              {/* Number badge */}
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-500
                              text-white text-xs font-bold flex items-center justify-center shadow-md">
                {i + 1}
              </div>
              <div className="flex items-start gap-4">
                <div className="text-3xl shrink-0 mt-1">{f.icon}</div>
                <div className="min-w-0">
                  <h3 className="font-bold text-ink-800 text-lg font-kai mb-2">{f.title}</h3>
                  <p className="text-sm text-ink-500 leading-relaxed mb-3">{f.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {f.tags.map((t) => (
                      <span
                        key={t}
                        className="text-xs px-2.5 py-0.5 rounded-full bg-ink-50 text-ink-400 border border-ink-100"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Philosophy */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-ink-100/80 shadow-sm">
          <h2 className="text-2xl font-bold font-kai text-primary-700 text-center mb-8">
            我们的理念
          </h2>
          <div className="space-y-5 text-ink-600 leading-relaxed text-sm md:text-base">
            <p className="border-l-3 border-gold-400 pl-4">
              <strong className="text-ink-800">古今融合：</strong>
              八字命理是中国传统文化的瑰宝，蕴含先人对天人关系的深邃智慧。我们独创性地将传统子平命理与盲派铁口直断双体系融合，让古老的命理智慧借助现代AI技术焕发新的生命力。
            </p>
            <p className="border-l-3 border-gold-400 pl-4">
              <strong className="text-ink-800">天人合一：</strong>
              平台将《黄帝内经》五运六气学说与八字命理深度融合，从"天时—地利—人和"三个维度提供全维度分析。每一份健康分析都结合岁运太过不及、司天在泉、主客加临等经典中医理论，为用户提供个性化的体质分析与养生指导。
            </p>
            <p className="border-l-3 border-gold-400 pl-4">
              <strong className="text-ink-800">严谨可溯：</strong>
              我们的AI分析基于22个专业命理规则引擎模块和120+条验证规则，每一条结论都有据可循、可追溯验证。DeepSeek深度思考模式在生成报告前会进行多步骤交叉验证，确保分析质量达到专业命理师水准。
            </p>
            <p className="border-l-3 border-gold-400 pl-4">
              <strong className="text-ink-800">理性看待：</strong>
              命理分析与健康建议仅供参考，人生的选择权和健康管理始终在您手中。我们鼓励用户以开放、理性的态度看待命理分析，将其作为自我认知和人生规划的有益参考，而非绝对预言。
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-4 pb-20 text-center">
        <div className="bg-gradient-to-br from-primary-50 via-gold-50 to-primary-50 rounded-3xl p-10 border border-primary-200/60 shadow-sm">
          <div className="text-4xl mb-4">🔮</div>
          <h2 className="text-2xl font-bold font-kai text-primary-800 mb-3">
            准备好探索命运的密码了吗？
          </h2>
          <p className="text-ink-500 text-sm mb-8 max-w-md mx-auto">
            免费排盘，体验真太阳时精准校正、五行力量分析、AI智能解读
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-10 py-3.5 bg-gradient-to-r from-gold-500 to-gold-600
                       text-white rounded-xl font-kai text-lg shadow-lg hover:shadow-xl
                       transition-all hover:from-gold-600 hover:to-gold-700 hover:-translate-y-0.5"
          >
            开始免费排盘
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs text-ink-400">
            <span>✅ 注册即可免费排盘</span>
            <span>✅ 真太阳时自动校正</span>
            <span>✅ 五行力量即时展示</span>
          </div>
        </div>
      </section>

      {/* Footer note */}
      <div className="text-center pb-10 text-xs text-ink-300">
        <p>命理分析仅供参考 · 人生选择由您做主</p>
      </div>
    </div>
  );
}
