import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '关于我们 - 生日命理',
};

const FEATURES = [
  {
    icon: '🎯',
    title: '真太阳时精准校正',
    desc: '基于出生地经纬度自动计算真太阳时，排除时区误差，排盘精度达到分钟级',
  },
  {
    icon: '🤖',
    title: 'AI 智能解读',
    desc: '融合传统命理规则与先进大语言模型，多维度深度分析命盘，生成个性化专业报告',
  },
  {
    icon: '🌿',
    title: '五运六气中医健康',
    desc: '基于《黄帝内经》五运六气学说，结合八字命盘分析体质偏性，提供流年流月流日的中医养生建议',
  },
  {
    icon: '📅',
    title: '流年流月流日详解',
    desc: '支持逐年的岁运、司天在泉分析，逐月的主运主气、客运客气推演，逐日的干支五运六气合参',
  },
  {
    icon: '📊',
    title: '规则引擎驱动',
    desc: '内置十神、格局、用神、神煞、大运等专业命理规则库，分析结果可追溯、可验证',
  },
  {
    icon: '🔒',
    title: '隐私安全',
    desc: '用户数据加密存储，不与第三方共享个人信息，尊重并保护用户隐私',
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <section className="text-center mb-16">
        <div className="text-5xl mb-6">☯</div>
        <h1 className="text-3xl md:text-4xl font-bold font-kai text-primary-800 mb-4">
          关于生日命理
        </h1>
        <p className="text-lg text-ink-500 max-w-2xl mx-auto leading-relaxed">
          我们致力于将传统命理学与现代人工智能技术相结合，
          打造专业、精准、易用的八字命理分析平台。
        </p>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl font-bold font-kai text-primary-700 text-center mb-8">
          平台特色
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl bg-white border border-ink-100/80
                         hover:border-ink-200 hover:shadow-md transition-all duration-200"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-ink-800 font-kai text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-ink-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="text-center mb-16">
        <h2 className="text-2xl font-bold font-kai text-primary-700 mb-6">
          我们的理念
        </h2>
        <div className="max-w-2xl mx-auto space-y-4 text-ink-600 leading-relaxed">
          <p>
            八字命理是中国传统文化的重要组成部分，蕴含着先人对天人关系的深邃思考。
            我们相信，借助现代技术可以让这一文化遗产焕发新的生命力。
          </p>
          <p>
            平台独创性地将《黄帝内经》五运六气学说与八字命理深度融合，
            提供从年运、月气到日气的全维度健康推演。每一份健康分析都结合了
            岁运太过不及、司天在泉、主客加临等经典中医理论，为用户提供个性化的体质分析与养生指导。
          </p>
          <p>
            我们的 AI 分析基于严谨的命理规则引擎，每一条结论都有据可循。
            同时，我们始终提醒：命理分析与健康建议仅供参考，人生的选择权和健康管理始终在您手中。
          </p>
        </div>
      </section>

      <section className="text-center">
        <div className="inline-block px-8 py-6 rounded-2xl bg-gradient-to-br from-primary-50 to-gold-50 border border-primary-200/60">
          <p className="text-ink-500 text-sm mb-3">准备好探索命运的密码了吗？</p>
          <a
            href="/"
            className="inline-block px-8 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-white
                       rounded-lg font-kai text-lg shadow-lg hover:shadow-xl transition-all
                       hover:from-gold-600 hover:to-gold-700"
          >
            开始免费排盘
          </a>
        </div>
      </section>
    </div>
  );
}
