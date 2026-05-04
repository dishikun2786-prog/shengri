'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { pairingApi, chatApi } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

interface Message {
  uuid: string;
  role: string;
  content: string;
  createdAt: string;
  userId?: number;
}

export default function PairingChatPage() {
  const router = useRouter();
  const params = useParams();
  const requestUuid = params.requestUuid as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(true);
  const [otherUser, setOtherUser] = useState<{ nickname: string }>({ nickname: '对方' });
  const [reportSummary, setReportSummary] = useState<{ level: string; totalScore: number; summary: string; reportUuid: string } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const seenUuids = useRef<Set<string>>(new Set());

  // Initialize - runs once per mount
  useEffect(() => {
    let socket: Socket | null = null;
    let mounted = true;

    const init = async () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (!token) { router.push('/login'); return; }

        let userId = 0;
        if (userStr) {
          try { userId = JSON.parse(userStr).id; } catch {}
        }
        if (!mounted) return;
        setCurrentUserId(userId);

        // Load pairing request
        const res = await pairingApi.getRequest(requestUuid);
        const data = res.data;
        if (!mounted) return;

        if (data.status !== 5 || !data.report?.uuid) {
          setLoading(false);
          setConnecting(false);
          return;
        }

        // Determine the other user
        const other = userId === data.initiator?.id ? data.receiver : data.initiator;
        if (other) {
          setOtherUser({ nickname: other.nickname || other.username || '对方' });
        }

        // Load report summary for the report card
        if (data.report) {
          setReportSummary({
            level: data.report.ruleResults?.level || '',
            totalScore: data.report.ruleResults?.totalScore || 0,
            summary: data.report.aiSummary || '',
            reportUuid: data.report.uuid,
          });
        }

        // Get or create chat session
        const sessionRes = await chatApi.createSessionByReport(data.report.uuid);
        const session = sessionRes.data;
        if (!mounted) return;

        // Load historical messages, dedup by UUID
        try {
          const msgRes = await chatApi.getMessages(session.id, { size: 200 });
          if (mounted && msgRes.data?.messages) {
            const history: Message[] = [];
            for (const m of msgRes.data.messages) {
              if (!seenUuids.current.has(m.uuid)) {
                seenUuids.current.add(m.uuid);
                history.push(m);
              }
            }
            setMessages(history);
          }
        } catch {
          // First time, no messages yet
        }

        // Connect WebSocket
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';
        socket = io(`${wsUrl}/chat`, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 20,
        });

        socket.on('connect', () => {
          if (!mounted) return;
          setConnecting(false);
          // Join the SHARED room using requestUuid so both users are in the same room
          socket!.emit('join_pairing_room', { requestUuid });
        });

        socket.on('reconnect', () => {
          if (!mounted) return;
          setConnecting(false);
          socket!.emit('join_pairing_room', { requestUuid });
        });

        socket.on('disconnect', () => {
          if (!mounted) return;
          setConnecting(true);
        });

        socket.on('connect_error', () => {
          if (!mounted) return;
          setConnecting(true);
        });

        // The critical handler: receives messages broadcast by the server to the shared room
        socket.on('pairing_message_received', (payload: any) => {
          if (!mounted) return;
          const msg = payload.userMessage;
          if (!msg?.uuid) return;

          // Dedup: skip if we've already seen this UUID
          if (seenUuids.current.has(msg.uuid)) return;
          seenUuids.current.add(msg.uuid);

          setMessages((prev) => [...prev, msg]);
        });

        socket.on('chat_error', (err: any) => {
          console.warn('Chat error:', err);
        });

        socketRef.current = socket;
        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Chat init error:', err);
        if (mounted) {
          setLoading(false);
          setConnecting(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
    };
  }, [requestUuid, router]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || !socketRef.current?.connected) return;

    socketRef.current.emit('send_pairing_message', {
      requestUuid,
      content: input.trim(),
    });

    setInput('');
    // No optimistic message! The message will come back via the
    // pairing_message_received event broadcast to everyone in the room
  }, [input, requestUuid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 mt-3">加载中...</p>
        </div>
      </div>
    );
  }

  const isConnected = socketRef.current?.connected;

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto w-full">
          <button onClick={() => router.back()} className="text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h1 className="text-sm font-medium text-gray-800">与 {otherUser.nickname} 对话</h1>
            <p className={`text-[10px] ${!isConnected ? 'text-amber-500' : 'text-green-500'}`}>
              {!isConnected ? '连接中...' : '已连接'}
            </p>
          </div>
          <div className="w-5" />
        </div>
      </div>

      {/* Report Card */}
      {reportSummary && (
        <div className="max-w-2xl mx-auto w-full px-4 pt-3">
          <button
            onClick={() => router.push(`/pairing/${requestUuid}`)}
            className="w-full bg-gradient-to-r from-primary-50 to-amber-50 rounded-xl p-3
              border border-primary-100 hover:shadow-md transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-lg font-bold text-primary-600">{reportSummary.totalScore}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-primary-700">
                    {reportSummary.level}
                  </span>
                  <span className="text-[10px] text-gray-400">配对报告</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                  {reportSummary.summary}
                </p>
              </div>
              <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl text-gray-200 mb-4">☯</div>
            <p className="text-gray-500 text-sm">开始你们的八字配对对话吧</p>
            <p className="text-gray-400 text-xs mt-1">基于配对报告进行交流，消息实时同步</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUserId;

            return (
              <div
                key={msg.uuid}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm
                    ${isMe
                      ? 'bg-primary-500 text-white rounded-br-md'
                      : 'bg-white text-gray-700 rounded-bl-md border border-gray-100 shadow-sm'
                    }`}
                >
                  {!isMe && (
                    <p className="text-[10px] text-primary-500 mb-0.5 font-medium">
                      {otherUser.nickname}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-100' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('zh-CN', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 max-w-2xl mx-auto w-full">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={isConnected ? '输入消息...' : '连接中...'}
            disabled={!isConnected}
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm
              focus:ring-2 focus:ring-primary-200 focus:border-primary-300 outline-none
              disabled:bg-gray-100 disabled:text-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !isConnected}
            className="px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium
              hover:bg-primary-600 disabled:opacity-40 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
