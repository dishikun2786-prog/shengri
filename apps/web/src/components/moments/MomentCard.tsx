'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { type Moment, type MomentComment, type MomentUser, momentsApi } from '@/lib/api';
import { MomentImageGrid } from './MomentImageGrid';
import { MomentActions } from './MomentActions';
import { PairButton } from '../pairing/PairButton';

interface MomentCardProps {
  moment: Moment;
  currentUserId?: number;
  onDelete?: (momentId: number) => void;
  onImageClick?: (index: number) => void;
  onPairRequest?: (userId: number, userName: string) => void;
}

function getAvatarChar(user: MomentUser): string {
  return (user.nickname || user.username || 'U')[0].toUpperCase();
}

function getImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return url;
}

export function MomentCard({ moment, currentUserId, onDelete, onImageClick, onPairRequest }: MomentCardProps) {
  const [isLiked, setIsLiked] = useState(moment.isLiked);
  const [likesCount, setLikesCount] = useState(moment.likesCount);
  const [comments, setComments] = useState<MomentComment[]>([]);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<MomentComment | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);

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
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const loadComments = async () => {
    if (moment.commentsCount === 0) return;
    setLoadingComments(true);
    try {
      const res = await momentsApi.getComments(moment.id, { page: 1, size: 20 });
      setComments(res.data.comments);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (moment.commentsCount > 0) {
      loadComments();
    }
  }, [moment.id, moment.commentsCount]);

  const handleLikeChange = (liked: boolean, count: number) => {
    setIsLiked(liked);
    setLikesCount(count);
  };

  const handleDelete = async () => {
    if (!confirm('确定删除这条动态？')) return;
    try {
      await momentsApi.deleteMoment(moment.id);
      onDelete?.(moment.id);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('删除删除');
    }
  };

  const handleReply = (comment: MomentComment) => {
    setReplyTo(comment);
    setCommentText(`回复 @${comment.user.nickname || comment.user.username || '用户'}：`);

  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await momentsApi.addComment(moment.id, {
        content: commentText.trim(),
        replyToId: replyTo?.id,
      });
      setComments((prev) => [...prev, res.data]);
      setCommentText('');
      setReplyTo(null);
      setShowCommentInput(false);
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await momentsApi.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const avatarUrl = moment.user.avatarUrl;
  const showDelete = currentUserId === moment.user.id;

  return (
    <>
      <div className="bg-white">
        <div className="px-4 py-3 flex gap-3">
          {/* Avatar */}
          <div className="shrink-0">
            {avatarUrl ? (
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <Image
                  src={avatarUrl}
                  alt={moment.user.nickname || '用户'}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white font-medium text-base">
                {getAvatarChar(moment.user)}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[#576b95] text-sm font-medium">
                  {moment.user.nickname || moment.user.username || '用户'}
                </span>
                {currentUserId && currentUserId !== moment.user.id && (
                  <PairButton
                    targetUserId={moment.user.id}
                    targetUserName={moment.user.nickname || moment.user.username || '用户'}
                    onPair={() => onPairRequest?.(moment.user.id, moment.user.nickname || moment.user.username || '用户')}
                  />
                )}
              </div>
              <span className="text-xs text-gray-400">{formatTime(moment.createdAt)}</span>
            </div>

            {moment.user.bio && (
              <p className="text-xs text-gray-500 mt-0.5">{moment.user.bio}</p>
            )}

            {moment.content && (
              <p className="text-sm text-gray-800 mt-1.5 leading-relaxed whitespace-pre-wrap break-all">
                {moment.content}
              </p>
            )}

            <MomentImageGrid
              images={moment.images}
              onImageClick={onImageClick}
            />

            <MomentActions
              momentId={moment.id}
              isLiked={isLiked}
              likesCount={likesCount}
              commentsCount={moment.commentsCount}
              currentUserId={currentUserId}
              onLikeChange={handleLikeChange}
              onCommentsChange={() => setShowCommentInput(!showCommentInput)}
              onCommentClick={() => setShowCommentInput(!showCommentInput)}
            />

            {/* WeChat style: inline likes */}
            {likesCount > 0 && (
              <div className="mt-2 bg-[#f7f7f7] rounded p-2">
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
                  <svg className="w-3.5 h-3.5 fill-red-500 text-red-500 mt-0.5 shrink-0" viewBox="0 0 24 24">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span className="text-[#576b95]">{likesCount} 赞</span>
                </div>
              </div>
            )}

            {/* WeChat style: inline comments */}
            {comments.length > 0 && (
              <div className="mt-1 bg-[#f7f7f7] rounded p-2 space-y-1">
                {comments.map((comment) => (
                  <div key={comment.id} className="text-xs leading-relaxed">
                    <span className="text-[#576b95] font-medium">
                      {comment.user.nickname || comment.user.username || '用户'}
                      {comment.replyTo && (
                        <span className="text-gray-500">
                          {' '}回复@
                          {comment.replyTo.user.nickname || comment.replyTo.user.username || '用户'}
                        </span>
                      )}
                      ：
                    </span>
                    <span className="text-gray-800">{comment.content}</span>
                    {currentUserId === comment.userId && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="ml-1.5 text-gray-400 hover:text-red-500 text-[10px]"
                      >
                        删除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Comment input - WeChat style inline */}
            {showCommentInput && (
              <div className="mt-2 flex gap-2 items-center">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                  placeholder={replyTo ? `回复 @${replyTo.user.nickname || replyTo.user.username}` : '写评论...'}
                  className="flex-1 px-3 py-1.5 bg-[#f7f7f7] rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-primary-400/40"
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || submitting}
                  className="px-3 py-1.5 bg-primary-500 text-white rounded-full text-xs font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors"
                >
                  {submitting ? '...' : '发送'}
                </button>
                {replyTo && (
                  <button
                    onClick={() => { setReplyTo(null); setCommentText(''); }}
                    className="text-gray-400 hover:text-gray-600 text-xs"
                  >
                    取消
                  </button>
                )}
              </div>
            )}
          </div>

          {showDelete && (
            <button
              onClick={handleDelete}
              className="shrink-0 text-gray-300 hover:text-red-400 text-xs self-start"
              title="删除"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="mx-4 border-b border-gray-100" />
      </div>

    </>
  );
}
