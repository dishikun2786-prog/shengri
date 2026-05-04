'use client';

import { useState } from 'react';

interface PairButtonProps {
  targetUserId: number;
  targetUserName: string;
  onPair: () => void;
  className?: string;
}

export function PairButton({ targetUserId, targetUserName, onPair, className = '' }: PairButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onPair}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
        bg-gradient-to-r from-primary-50 to-amber-50 text-primary-600
        border border-primary-200 hover:from-primary-100 hover:to-amber-100
        hover:border-primary-300 transition-all duration-200
        shadow-sm hover:shadow-md ${className}`}
      title={`与 ${targetUserName} 配对分析`}
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0 4 4 0 000 5.656l1.414 1.414m2.828-2.828l1.414-1.414a4 4 0 000-5.656 4 4 0 00-5.656 0" />
      </svg>
      {hovered ? '配对分析' : '配对'}
    </button>
  );
}
