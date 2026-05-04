'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { chatApi } from '@/lib/api';
import { REPORT_TYPE_LABELS } from '@/lib/constants';

export default function ChatListPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    chatApi.getSessions()
      .then((res) => {
        setSessions(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold font-kai text-primary-700 mb-6">我的对话</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-5 rounded-xl border border-ink-100">
              <div className="w-10 h-10 rounded-full skeleton-shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 rounded skeleton-shimmer" />
                <div className="h-3 w-full rounded skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold font-kai text-primary-700 mb-6">我的对话</h1>

      {sessions.length === 0 ? (
        <div className="text-center py-20 animate-fade-in">
          <div className="text-5xl opacity-20 mb-4">☯</div>
          <p className="text-ink-600 font-kai text-lg">尚无对话记录</p>
          <p className="text-ink-400 text-sm mt-1">生成报告后即可与 AI 顾问对话</p>
          <button className="btn-gold mt-6 text-sm" onClick={() => router.push('/')}>
            开始测算
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session: any, i: number) => (
            <div
              key={session.uuid || session.id}
              className="animate-slide-up group flex items-center gap-4 p-5 rounded-xl
                         bg-white border border-ink-100/80 hover:border-ink-200 hover:shadow-md
                         transition-all duration-200 cursor-pointer"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => {
                const reportUuid = session.report?.uuid;
                if (!reportUuid) return;
                router.push(`/chat/${reportUuid}`);
              }}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-gold-400
                              flex items-center justify-center text-white text-lg shrink-0">
                ☯
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-ink-800 font-kai truncate">
                    {session.title || '测算顾问对话'}
                  </h3>
                  {session.report?.reportType && (
                    <span className="px-2 py-0.5 text-[10px] bg-primary-50 text-primary-600 rounded-full border border-primary-200/60 font-medium shrink-0">
                      {REPORT_TYPE_LABELS[session.report.reportType] || session.report.reportType}
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-400 mt-1 truncate">
                  {session.report?.aiSummary || '命理分析对话'}
                </p>
                <div className="text-xs text-ink-300 mt-1 flex items-center gap-2">
                  {session.lastMessageAt && (
                    <span>最近对话: {new Date(session.lastMessageAt).toLocaleDateString('zh-CN')}</span>
                  )}
                  {session.messageCount > 0 && (
                    <><span className="text-ink-200">·</span><span>{session.messageCount} 条消息</span></>
                  )}
                  {!session.report?.uuid && (
                    <><span className="text-ink-200">·</span><span className="text-red-500">关联报告缺失</span></>
                  )}
                </div>
              </div>

              <svg className="w-5 h-5 text-ink-300 shrink-0 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
