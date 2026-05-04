'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import type { ChatMessage } from '@/hooks/useSocket';

interface ChatWindowProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  userName?: string;
  reportType?: string;
  onSuggest?: (q: string) => void;
  onFeedback?: (messageUuid: string, score: number) => void;
}

function formatTime(ts: string | number | Date) {
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `今天 ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `昨天 ${time}`;
  const diffDays = (now.getTime() - d.getTime()) / 86400000;
  if (diffDays < 7) return `${['周日','周一','周二','周三','周四','周五','周六'][d.getDay()]} ${time}`;
  return `${d.toLocaleDateString('zh-CN')} ${time}`;
}

function shouldShowTimeSeparator(prev: ChatMessage | null, curr: ChatMessage) {
  if (!prev) return true;
  const pTime = new Date(prev.createdAt || Date.now()).getTime();
  const cTime = new Date(curr.createdAt || Date.now()).getTime();
  return cTime - pTime > 5 * 60 * 1000;
}

function FeedbackButtons({ message, onFeedback }: {
  message: ChatMessage;
  onFeedback?: (uuid: string, score: number) => void;
}) {
  const [submitted, setSubmitted] = useState(message.feedbackScore != null);
  const [score, setScore] = useState<number | null>(message.feedbackScore ?? null);

  useEffect(() => {
    if (message.feedbackScore != null) {
      setSubmitted(true);
      setScore(message.feedbackScore);
    }
  }, [message.feedbackScore]);

  if (submitted && score != null) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5 ml-0.5">
        <span className={`text-xs ${score > 0 ? 'text-green-500' : 'text-red-400'}`}>
          {score > 0 ? '👍 已采纳' : '👎 已反馈'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-1.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        className="p-1 rounded hover:bg-green-50 text-ink-300 hover:text-green-500 transition-colors"
        title="分析准确"
        onClick={() => {
          setSubmitted(true);
          setScore(1);
          onFeedback?.(message.uuid, 1);
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
      </button>
      <button
        className="p-1 rounded hover:bg-red-50 text-ink-300 hover:text-red-400 transition-colors"
        title="分析有偏差"
        onClick={() => {
          setSubmitted(true);
          setScore(-1);
          onFeedback?.(message.uuid, -1);
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10zM17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
        </svg>
      </button>
    </div>
  );
}

function MessageBubble({ message, userName, animIndex, shouldAnimate, onFeedback }: {
  message: ChatMessage; userName?: string; animIndex: number; shouldAnimate: boolean;
  onFeedback?: (uuid: string, score: number) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 ${shouldAnimate ? 'animate-slide-up' : ''} group`}
      style={shouldAnimate ? { animationDelay: `${animIndex * 40}ms` } : undefined}
    >
      {!isUser && (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center shrink-0 mr-2.5 mt-1 shadow-sm ring-2 ring-gold-200/30">
          <div className="taiji-mini" />
        </div>
      )}
      <div className={`max-w-[80%] sm:max-w-[75%] ${!isUser ? 'flex flex-col' : ''}`}>
        <div
          className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
            ${isUser
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white border border-ink-100 text-ink-700 shadow-sm'}`}
          style={{
            borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
          }}
        >
          {message.content}
        </div>
        {!isUser && (
          <FeedbackButtons message={message} onFeedback={onFeedback} />
        )}
      </div>
      {isUser && (
        <div className="w-9 h-9 rounded-full bg-ink-200 flex items-center justify-center text-ink-600 text-sm font-kai font-medium shrink-0 ml-2.5 mt-1">
          {(userName || '我')[0]}
        </div>
      )}
    </div>
  );
}

function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-start mb-4 animate-fade-in">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center shrink-0 mr-2.5 mt-1 shadow-sm ring-2 ring-gold-200/30">
        <div className="taiji-mini" style={{ animation: 'spin 2s linear infinite' }} />
      </div>
      <div
        className="max-w-[80%] sm:max-w-[75%] px-4 py-3 bg-white border border-ink-100 text-ink-700 text-sm leading-relaxed shadow-sm"
        style={{ borderRadius: '4px 18px 18px 18px' }}
      >
        {content ? (
          <>
            <span className="whitespace-pre-wrap">{content}</span>
            <span className="inline-block w-0.5 h-[1.1em] bg-primary-500 ml-0.5 animate-pulse align-text-bottom" />
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 py-0.5">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-primary-400 border-t-transparent" style={{ animation: 'spin 1s linear infinite' }} />
            <span className="text-ink-400 text-xs ml-1">正在推演...</span>
          </span>
        )}
      </div>
    </div>
  );
}

function TimeSeparator({ time }: { time: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-ink-200/60 to-transparent" />
      <span className="text-xs text-ink-300 shrink-0">{time}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-ink-200/60 to-transparent" />
    </div>
  );
}

const DEFAULT_HINTS = [
  '我的命盘有什么特点？',
  '今年的运势如何？',
  '哪些方面需要注意？',
];

export default function ChatWindow({
  messages,
  isStreaming,
  streamingContent,
  onLoadMore,
  hasMore,
  userName,
  reportType,
  onSuggest,
  onFeedback,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  useEffect(() => {
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, isNearBottom]);

  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsNearBottom(distanceFromBottom < 100);
    setIsScrolled(scrollTop > 80);

    if (onLoadMore && hasMore && scrollTop < 50) {
      onLoadMore();
    }
  };

  const enrichedMessages = useMemo(() => {
    return messages.map((msg, i) => ({
      msg,
      showTime: shouldShowTimeSeparator(i > 0 ? messages[i - 1] : null, msg),
    }));
  }, [messages]);

  const isEmpty = messages.length === 0 && !isStreaming;
  const [isScrolled, setIsScrolled] = useState(false);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4"
      style={{ willChange: 'transform' }}
    >
      {/* Top fade indicator when scrolled down */}
      {isScrolled && (
        <div className="sticky top-0 z-10 pt-2 pb-1 bg-gradient-to-b from-ink-50/95 to-transparent pointer-events-none">
          <div className="text-center">
            <span className="text-xs text-ink-300">上滑查看更多</span>
          </div>
        </div>
      )}

      <div className="pt-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 animate-fade-in">
          <div
            className="taiji-symbol mb-6 opacity-25"
            style={{ width: 56, height: 56, animation: 'spin 12s linear infinite' }}
          />
          <p className="text-ink-600 font-kai text-lg mb-1.5">命理咨询顾问</p>
          <p className="text-ink-400 text-sm mb-8 max-w-xs">
            基于你的{reportType ? `「${reportType}」` : '测算'}报告，为你解答命理疑问
          </p>

          <div className="w-full max-w-sm space-y-2.5">
            {DEFAULT_HINTS.map((q, i) => (
              <button
                key={i}
                className="animate-slide-up w-full text-left px-4 py-3 rounded-xl bg-white/80
                           border border-ink-100/80 text-sm text-ink-600 hover:border-primary-200
                           hover:bg-primary-50/40 transition-all duration-200 flex items-center gap-2.5"
                style={{ animationDelay: `${i * 100 + 200}ms` }}
                onClick={() => onSuggest?.(q)}
              >
                <span className="text-gold-500 shrink-0">·</span>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {enrichedMessages.map(({ msg, showTime }, i) => {
        const shouldAnimate = i >= enrichedMessages.length - 5;
        return (
          <div key={msg.uuid}>
            {showTime && msg.createdAt && (
              <TimeSeparator time={formatTime(msg.createdAt)} />
            )}
            <MessageBubble
              message={msg}
              userName={userName}
              animIndex={i}
              shouldAnimate={shouldAnimate}
              onFeedback={onFeedback}
            />
          </div>
        );
      })}

      {isStreaming && <StreamingBubble content={streamingContent} />}

      <div ref={bottomRef} />
      </div>
    </div>
  );
}
