'use client';

const DEFAULT_QUESTIONS: Record<string, string[]> = {
  free: ['我的命盘有什么特点？', '今年运势如何？', '我适合什么方向发展？', '盲派怎么看我的命局做功方式？'],
  wealth: ['我的财运走势怎样？', '最佳投资时机是什么时候？', '如何提升财运？', '盲派看我的财运层次和获取财富的方式？', '我的体用搭配对财运有何影响？'],
  marriage: ['我的感情运势如何？', '什么时候适合结婚？', '我的另一半是什么类型？', '盲派怎么看我的婚姻宫和财星位置？', '命局中的穿害对婚姻有何影响？'],
  career: ['我适合什么行业？', '事业发展的关键年份？', '如何突破事业瓶颈？', '盲派看我的做功方式对应什么职业？', '我的命局层次适合创业还是稳定工作？'],
  annual: ['今年需要注意什么？', '哪个月运势最好？', '有什么需要避免的？', '今年串宫压运的吉凶星如何分布？', '白虎和朱雀临位该怎么化解？'],
  hehun: ['我们的匹配度如何？', '相处需要注意什么？', '对方的性格特点？', '盲派看我们做功方式是否互补？', '双方的宾主配置是否冲突？'],
  full: ['我的人生全貌如何？', '哪个方向最适合我？', '需要注意哪些方面？', '从盲派角度看我的命局层次和做功效率？', '我的命局有势有功吗？'],
  xiaoliuren: ['这个掌诀对近期运势有什么影响？', '根据六神提示应该注意什么？', '有利的方位和时机是什么？', '如何化解掌诀中的凶兆？', '这个结果对财运/感情有什么预示？'],
};

const FIRST_VISIT_ICONS: Record<string, string> = {
  free: '☰', wealth: '☲', marriage: '☱', career: '☳', annual: '☴', hehun: '☷', full: '✦', xiaoliuren: '☲',
};

interface SuggestedQuestionsProps {
  questions: string[];
  reportType?: string;
  onSelect: (question: string) => void;
  isFirst?: boolean;
}

export default function SuggestedQuestions({
  questions,
  reportType,
  onSelect,
  isFirst,
}: SuggestedQuestionsProps) {
  const displayQuestions = questions.length > 0
    ? questions
    : (isFirst ? (DEFAULT_QUESTIONS[reportType || 'free'] || DEFAULT_QUESTIONS.free) : []);

  if (displayQuestions.length === 0) return null;

  if (isFirst && questions.length === 0) {
    return (
      <div className="px-4 pb-3">
        <div className="space-y-2">
          {displayQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => onSelect(q)}
              className="animate-slide-up w-full text-left flex items-center gap-3 px-4 py-3
                         bg-white/80 backdrop-blur-sm border border-ink-100/80 rounded-xl
                         text-sm text-ink-600 hover:border-primary-200 hover:bg-primary-50/40
                         hover:shadow-sm transition-all duration-200"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="text-gold-500 font-kai text-base shrink-0">
                {FIRST_VISIT_ICONS[reportType || 'free'] || '☰'}
              </span>
              <span>{q}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-3">
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-2 w-max min-h-[32px]">
          {displayQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => onSelect(q)}
              className="animate-slide-up shrink-0 px-3.5 py-2 text-xs
                         bg-white/80 backdrop-blur-sm border border-ink-200/80 text-ink-600
                         rounded-full hover:shadow-sm hover:scale-[1.02] hover:border-primary-300
                         hover:text-primary-600 transition-all duration-200 flex items-center gap-1.5"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="text-gold-500">·</span>
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
