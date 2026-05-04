'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { chatApi, reportApi } from '@/lib/api';
import { useSocket, type ChatMessage } from '@/hooks/useSocket';
import ChatWindow from '@/components/ChatWindow';
import SuggestedQuestions from '@/components/SuggestedQuestions';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const reportUuid = (params?.reportUuid as string) || '';

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [report, setReport] = useState<any>(null);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [showReportSummary, setShowReportSummary] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [userName, setUserName] = useState<string>('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [lastErrorCode, setLastErrorCode] = useState<string>('');
  const sessionIdRef = useRef<number | null>(null);
  const fallbackBackPath = '/profile?tab=chats';

  const {
    isConnected,
    isStreaming,
    streamingContent,
    messages,
    suggestedQuestions,
    sendMessage,
    sendFeedback,
    loadHistory,
  } = useSocket({
    sessionId,
    onNeedResync: () => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      fetchAndMergeHistory(sid).catch(() => {});
    },
    onError: (err) => {
      setLastErrorCode(err.code);
      if (err.code === 'WS_DISCONNECTED' || err.code === 'WS_CONNECT_ERROR') {
        setError('连接异常，请重试连接');
      } else if (err.code === 'STREAM_TIMEOUT' || err.code === 'STREAM_NO_FIRST_CHUNK' || err.code === 'STREAM_IDLE_TIMEOUT') {
        setError('推演超时，请重试提问');
      } else if (err.code === 'AI_ERROR') {
        setError('服务繁忙，请稍后再试');
      } else {
        setError(err.message || '请求失败，请重试');
      }
    },
  });

  const fetchAndMergeHistory = useCallback(async (targetSessionId: number) => {
    const historyRes = await chatApi.getMessages(targetSessionId, { page: 1, size: 50 });
    const msgs: ChatMessage[] = (historyRes.data.messages || []).map((m: any) => ({
      uuid: m.uuid,
      role: m.role,
      content: m.content,
      metadata: m.metadata,
      feedbackScore: m.feedbackScore ?? null,
      createdAt: m.createdAt,
      source: 'history',
      status: 'committed',
    }));
    loadHistory(msgs);
  }, [loadHistory]);

  useEffect(() => {
    if (!reportUuid) return;
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    try {
      const userRaw = localStorage.getItem('user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        setUserName(u.nickname || u.username || '');
      }
    } catch {}

    async function init() {
      try {
        // Load report first (better error message if it fails)
        const reportRes = await reportApi.get(reportUuid);
        setReport(reportRes.data);

        // Create or get chat session
        const sessionRes = await chatApi.createSessionByReport(reportUuid);
        const sess = sessionRes.data;
        setSessionId(sess.id);
        sessionIdRef.current = sess.id;
        await fetchAndMergeHistory(sess.id);
      } catch (err: any) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message;
        if (msg) {
          setError(msg);
        } else if (status === 404) {
          setError('报告不存在或已被删除');
        } else if (status === 403) {
          setError('无权访问该报告');
        } else if (err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK') {
          setError('网络连接失败，请检查网络后重试');
        } else {
          setError('加载失败，请稍后重试');
        }
      } finally {
        setInitializing(false);
      }
    }
    init();
  }, [reportUuid, router, fetchAndMergeHistory]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || isStreaming) return;
    sendMessage(inputValue);
    setInputValue('');
    inputRef.current?.focus();
  }, [inputValue, isStreaming, sendMessage]);

  const handleSuggest = useCallback((q: string) => {
    if (!isStreaming) sendMessage(q);
  }, [isStreaming, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const parsedReport = (() => {
    if (!report?.aiContent) return null;
    try { return JSON.parse(report.aiContent); } catch { return null; }
  })();

  if (initializing) {
    return (
      <div className="h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-4rem)] flex items-center justify-center"
           style={{ background: 'radial-gradient(circle at 20% 50%, rgba(253,248,244,1), rgba(246,245,243,1))' }}>
        <div className="text-center animate-fade-in">
          <div className="taiji-symbol mx-auto mb-5" style={{ animation: 'spin 3s linear infinite', width: 48, height: 48 }} />
          <p className="text-ink-500 text-sm font-kai">正在连接顾问...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-4rem)] flex flex-col"
         style={{ background: 'radial-gradient(circle at 20% 50%, rgba(253,248,244,1), rgba(246,245,243,1))' }}>
      {/* Header - frosted glass */}
      <div className="shrink-0 bg-white/70 backdrop-blur-lg border-b border-ink-100/80 px-4 py-3 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (reportUuid) {
                  router.push(`/report/${reportUuid}`);
                  return;
                }
                router.push(fallbackBackPath);
              }}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-400
                         hover:bg-ink-100 hover:text-ink-600 transition-all duration-200 active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div>
              <h1 className="text-base font-bold text-ink-800 font-kai">测算顾问</h1>
              <div className="flex items-center gap-1.5 text-xs text-ink-400">
                <span className="relative flex items-center justify-center w-2 h-2">
                  <span className={`absolute inset-0 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-400'}`} />
                  {isConnected && (
                    <span className="absolute inset-0 rounded-full bg-green-500" style={{ animation: 'pulse-ring 2s ease-out infinite' }} />
                  )}
                </span>
                {isConnected ? '在线' : '连接中...'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowReportSummary(!showReportSummary)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-400
                       hover:bg-ink-100 hover:text-ink-600 transition-all duration-200 active:scale-95"
            title={showReportSummary ? '收起摘要' : '展开摘要'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                 className={`transition-transform duration-300 ${showReportSummary ? 'rotate-180' : ''}`}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Report Summary - smooth collapsible */}
      <div
        className="shrink-0 overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: showReportSummary && parsedReport ? 220 : 0 }}
      >
        {parsedReport && (
          <div className="px-4 py-3" style={{ background: 'radial-gradient(ellipse at 30% 20%, #fdf8f4 0%, #f5ebe0 60%, #ede0d0 100%)' }}>
            <div className="max-w-3xl mx-auto">
              <h3 className="text-sm font-bold text-primary-700 font-kai">{parsedReport.title}</h3>
              <p className="text-xs text-ink-500 mt-1 line-clamp-2 leading-relaxed">{parsedReport.overview}</p>
              {parsedReport.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {parsedReport.tags.slice(0, 5).map((tag: string) => (
                    <span key={tag} className="px-2 py-0.5 bg-white/80 text-gold-700 text-[10px] rounded-full border border-gold-200/60">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="max-w-3xl mx-auto mt-2 h-px bg-gradient-to-r from-transparent via-ink-200/40 to-transparent" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="shrink-0 bg-red-50/80 backdrop-blur-sm border-b border-red-100 px-4 py-2 animate-slide-up">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <span className="text-xs text-red-600">{error}</span>
            <div className="flex items-center gap-2">
              {(lastErrorCode === 'WS_DISCONNECTED' || lastErrorCode === 'WS_CONNECT_ERROR' || lastErrorCode === 'STREAM_TIMEOUT' || lastErrorCode === 'STREAM_NO_FIRST_CHUNK' || lastErrorCode === 'STREAM_IDLE_TIMEOUT') && (
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs text-red-600 underline hover:text-red-700"
                >
                  重试连接
                </button>
              )}
              <button onClick={() => setError('')} className="text-xs text-red-400 hover:text-red-600 ml-1">×</button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Window */}
      <div className="flex-1 min-h-0 max-w-3xl w-full mx-auto flex flex-col">
        <ChatWindow
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          reportType={report?.reportType}
          onSuggest={handleSuggest}
          userName={userName}
          onFeedback={sendFeedback}
        />
      </div>

      {/* Suggested Questions - hidden when ChatWindow shows empty state guidance */}
      {messages.length > 0 && (
        <div className="shrink-0 max-w-3xl w-full mx-auto px-4">
          <SuggestedQuestions
            questions={suggestedQuestions}
            reportType={report?.reportType}
            onSelect={handleSuggest}
            isFirst={false}
          />
        </div>
      )}

      {/* Input Area - enhanced */}
      <div className="shrink-0 bg-white/70 backdrop-blur-lg border-t border-ink-100/80 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isStreaming ? 'AI 正在回复...' : '输入你的问题...'}
              disabled={isStreaming || !isConnected}
              rows={1}
              className="w-full px-4 py-2.5 rounded-xl border border-ink-200/80 bg-white/90
                         focus:outline-none focus:ring-2 focus:ring-primary-400/60 focus:border-transparent
                         transition-all duration-200 resize-none text-sm disabled:opacity-50
                         placeholder:text-ink-300"
              style={{ maxHeight: 120 }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                requestAnimationFrame(() => {
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                });
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming || !isConnected}
            className="shrink-0 w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center
                       hover:bg-primary-700 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed
                       shadow-md hover:shadow-lg active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
