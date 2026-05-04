'use client';

import { useState, useEffect } from 'react';

const TRIGRAMS = [
  { symbol: '☰', name: '乾', element: '天' },
  { symbol: '☱', name: '兑', element: '泽' },
  { symbol: '☲', name: '离', element: '火' },
  { symbol: '☳', name: '震', element: '雷' },
  { symbol: '☴', name: '巽', element: '风' },
  { symbol: '☵', name: '坎', element: '水' },
  { symbol: '☶', name: '艮', element: '山' },
  { symbol: '☷', name: '坤', element: '地' },
];

const FUN_FACTS = [
  '八字命理源于《周易》，已有三千多年历史',
  '天干地支纪年法是中国独有的时间体系',
  '十神代表了命主与周围人事的关系网络',
  '五行相生相克，维系宇宙万物的平衡',
  '大运每十年一换，影响人生阶段性运势',
  '日主强弱决定了命局用神的取用方向',
  '神煞是对特殊干支组合的古人经验总结',
  '真太阳时校正可提升排盘精准度',
];

interface ReportGeneratingProps {
  progress: number;
  stage: string;
}

export default function ReportGenerating({ progress, stage }: ReportGeneratingProps) {
  const [factIndex, setFactIndex] = useState(0);
  const [factVisible, setFactVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFactVisible(false);
      setTimeout(() => {
        setFactIndex((i) => (i + 1) % FUN_FACTS.length);
        setFactVisible(true);
      }, 500);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const litCount = Math.floor(progress / 12.5);
  const circumference = 2 * Math.PI * 68;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at center, #fdf8f4 0%, #f5ebe0 50%, #ede0d0 100%)' }}>

      {/* Decorative floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `rgba(220, 163, 16, ${0.1 + Math.random() * 0.3})`,
              animation: `float-particle ${6 + Math.random() * 8}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">

        {/* Bagua circle + Taiji center */}
        <div className="relative w-64 h-64 md:w-80 md:h-80">

          {/* SVG progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="68" fill="none" stroke="#e8ddd3" strokeWidth="2" />
            <circle
              cx="80" cy="80" r="68" fill="none"
              stroke="url(#progressGrad)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
            <defs>
              <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#dc5a2e" />
                <stop offset="100%" stopColor="#dca310" />
              </linearGradient>
            </defs>
          </svg>

          {/* 八卦 trigrams */}
          {TRIGRAMS.map((tri, i) => {
            const angle = (i * 45) - 90;
            const rad = (angle * Math.PI) / 180;
            const radius = 42;
            const x = 50 + radius * Math.cos(rad);
            const y = 50 + radius * Math.sin(rad);
            const isLit = i < litCount;

            return (
              <div
                key={tri.name}
                className="absolute flex flex-col items-center transition-all duration-700"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  opacity: isLit ? 1 : 0.25,
                  filter: isLit ? 'drop-shadow(0 0 8px rgba(220, 163, 16, 0.6))' : 'none',
                }}
              >
                <span className={`text-2xl md:text-3xl transition-colors duration-500 ${isLit ? 'text-gold-600' : 'text-ink-300'}`}>
                  {tri.symbol}
                </span>
                <span className={`text-xs mt-0.5 font-kai transition-colors duration-500 ${isLit ? 'text-gold-700' : 'text-ink-300'}`}>
                  {tri.name}
                </span>
              </div>
            );
          })}

          {/* Taiji (Yin-Yang) center */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="taiji-symbol" style={{ animation: 'spin 8s linear infinite' }} />
          </div>
        </div>

        {/* Progress percentage */}
        <div className="mt-6 text-3xl font-bold font-kai text-primary-700">
          {Math.round(progress)}%
        </div>

        {/* Stage text */}
        <div className="mt-3 text-lg text-ink-600 font-kai tracking-wider animate-pulse">
          {stage}
        </div>

        {/* Progress bar */}
        <div className="mt-6 w-64 md:w-80 h-1.5 bg-ink-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 via-gold-500 to-primary-500 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Fun facts */}
        <div className="mt-10 max-w-md text-center h-16 flex items-center justify-center">
          <div className={`transition-opacity duration-500 ${factVisible ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-sm text-ink-400 mb-1">命理小知识</p>
            <p className="text-ink-600 text-sm leading-relaxed">{FUN_FACTS[factIndex]}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
