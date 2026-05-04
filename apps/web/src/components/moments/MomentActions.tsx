'use client';

import { useState } from 'react';
import { type MomentComment, type MomentUser, momentsApi } from '@/lib/api';

interface MomentActionsProps {
  momentId: number;
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
  currentUserId?: number;
  onLikeChange: (isLiked: boolean, likesCount: number) => void;
  onCommentsChange: (count: number) => void;
  onCommentClick: () => void;
}

export function MomentActions({
  momentId,
  isLiked,
  likesCount,
  commentsCount,
  onLikeChange,
  onCommentsChange,
  onCommentClick,
}: MomentActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (isLiked) {
        const res = await momentsApi.unlikeMoment(momentId);
        if (res.data.liked === false) {
          onLikeChange(false, likesCount - 1);
        }
      } else {
        const res = await momentsApi.likeMoment(momentId);
        if (res.data.liked === true) {
          onLikeChange(true, likesCount + 1);
        }
      }
    } catch (err) {
      console.error('Like failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-6 mt-2">
      <button
        onClick={handleLike}
        disabled={loading}
        className={`flex items-center gap-1 text-sm transition-colors ${
          isLiked ? 'text-red-500' : 'text-[#888] hover:text-red-400'
        }`}
      >
        <svg
          className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`}
          viewBox="0 0 24 24"
          fill={isLiked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span>{likesCount > 0 ? likesCount : ''}</span>
      </button>

      <button
        onClick={onCommentClick}
        className="flex items-center gap-1 text-sm text-[#888] hover:text-primary-500 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>{commentsCount > 0 ? commentsCount : ''}</span>
      </button>
    </div>
  );
}
