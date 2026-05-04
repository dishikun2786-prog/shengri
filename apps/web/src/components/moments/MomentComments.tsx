'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { type MomentComment, momentsApi, type MomentUser } from '@/lib/api';

interface MomentCommentsProps {
  momentId: number;
  visible: boolean;
  onClose: () => void;
  onCommentAdded: (comment: MomentComment) => void;
  onCommentDeleted: (commentId: number) => void;
  currentUserId?: number;
}

export function MomentComments({
  momentId,
  visible,
  onClose,
  onCommentAdded,
  onCommentDeleted,
  currentUserId,
}: MomentCommentsProps) {
  const [comments, setComments] = useState<MomentComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<MomentComment | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const loadComments = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await momentsApi.getComments(momentId, { page: pageNum, size: 20 });
      if (pageNum === 1) {
        setComments(res.data.comments);
      } else {
        setComments((prev) => [...prev, ...res.data.comments]);
      }
      setHasMore(pageNum < res.data.totalPages);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  }, [momentId]);

  useEffect(() => {
    if (visible) {
      setPage(1);
      loadComments(1);
    }
  }, [visible, loadComments]);

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await momentsApi.addComment(momentId, {
        content: content.trim(),
        replyToId: replyTo?.id,
      });
      setComments((prev) => [...prev, res.data]);
      onCommentAdded(res.data);
      setContent('');
      setReplyTo(null);
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    try {
      await momentsApi.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCommentDeleted(commentId);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleReply = (comment: MomentComment) => {
    setReplyTo(comment);
    setContent(`回复 @${comment.user.nickname || comment.user.username || '用户'}: `);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getAvatarChar = (user: MomentUser) => {
    return (user.nickname || user.username || 'U')[0].toUpperCase();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl max-h-[70vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-base font-medium text-gray-800">评论</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {comments.length === 0 && !loading && (
            <div className="text-center text-gray-400 text-sm py-8">暂无评论，来抢沙发吧</div>
          )}
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-medium shrink-0">
                {getAvatarChar(comment.user)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#576b95]">
                    {comment.user.nickname || comment.user.username || '用户'}
                  </span>
                  <span className="text-xs text-gray-400">{formatTime(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-800 mt-0.5 leading-relaxed break-all">
                  {comment.content}
                </p>
                {comment.replyTo && (
                  <p className="text-xs text-gray-400 mt-1 border-l-2 border-gray-200 pl-2">
                    回复 @{comment.replyTo.user.nickname || comment.replyTo.user.username || '用户'}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={() => handleReply(comment)}
                    className="text-xs text-gray-400 hover:text-primary-500"
                  >
                    回复
                  </button>
                  {currentUserId === comment.userId && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-center text-gray-400 text-sm py-4">加载中...</div>
          )}
          {hasMore && !loading && (
            <button
              onClick={() => { const next = page + 1; setPage(next); loadComments(next); }}
              className="w-full text-center text-sm text-primary-500 py-2"
            >
              加载更多
            </button>
          )}
        </div>

        <div className="border-t border-gray-100 px-4 py-3">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
              <span>回复 @{replyTo.user.nickname || replyTo.user.username}</span>
              <button onClick={() => { setReplyTo(null); setContent(''); }} className="text-gray-400">×</button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="写评论..."
              className="flex-1 px-3 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/40"
            />
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="px-4 py-2 bg-primary-500 text-white rounded-full text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? '...' : '发送'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
