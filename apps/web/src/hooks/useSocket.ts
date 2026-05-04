'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface ChatMessage {
  uuid: string;
  clientMsgId?: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: { suggestedQuestions?: string[] };
  feedbackScore?: number | null;
  createdAt: string;
  source?: 'realtime' | 'history';
  status?: 'pending' | 'committed' | 'failed';
}

interface UseSocketOptions {
  sessionId: number | null;
  onError?: (error: { code: string; message: string }) => void;
  onNeedResync?: () => void;
}

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]) {
  const map = new Map<string, ChatMessage>();
  for (const m of prev) map.set(m.uuid, m);
  for (const m of incoming) {
    const old = map.get(m.uuid);
    map.set(m.uuid, old ? { ...old, ...m } : m);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function useSocket({ sessionId, onError, onNeedResync }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onNeedResyncRef = useRef(onNeedResync);
  onNeedResyncRef.current = onNeedResync;
  const joinedRef = useRef(false);
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null);
  const STREAM_WATCHDOG_MS = 15000;
  const CHUNK_IDLE_MS = 20000;

  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const streamingMsgIdRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  const clearStreamWatchdog = useCallback(() => {
    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }
  }, []);

  const resetStreamingState = useCallback(() => {
    setIsStreaming(false);
    setStreamingContent('');
    streamingMsgIdRef.current = null;
    clearStreamWatchdog();
  }, [clearStreamWatchdog]);

  const armStreamWatchdog = useCallback((timeoutMs: number, code: string, message: string) => {
    clearStreamWatchdog();
    streamTimerRef.current = setTimeout(() => {
      resetStreamingState();
      onErrorRef.current?.({ code, message });
      onNeedResyncRef.current?.();
    }, timeoutMs);
  }, [clearStreamWatchdog, resetStreamingState]);

  useEffect(() => {
    if (!sessionId) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';
    const socket = io(`${wsUrl}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      joinedRef.current = false;
      socket.emit('join_session', { sessionId });
      if (socket.recovered) {
        console.log('[WS] Reconnected and recovered session');
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      joinedRef.current = false;
      if (streamingMsgIdRef.current) {
        resetStreamingState();
        onErrorRef.current?.({ code: 'WS_DISCONNECTED', message: '连接中断，请重试' });
        onNeedResyncRef.current?.();
      }
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
      joinedRef.current = false;
      if (streamingMsgIdRef.current) {
        resetStreamingState();
      }
      onErrorRef.current?.({ code: 'WS_CONNECT_ERROR', message: '连接失败，请稍后重试' });
      onNeedResyncRef.current?.();
    });

    socket.on('joined_session', () => {
      joinedRef.current = true;
      onNeedResyncRef.current?.();
    });

    socket.on('message_received', (data: {
      msgId: string;
      status: string;
      userMessage?: ChatMessage;
      userUuid?: string;
    }) => {
      if (data.userMessage) {
        const userMsg: ChatMessage = {
          ...data.userMessage,
          uuid: data.userUuid || data.userMessage.uuid,
          clientMsgId: data.msgId,
          source: 'realtime',
          status: 'committed',
        };
        setMessages((prev) => mergeMessages(prev, [userMsg]));
      }
      setIsStreaming(true);
      setStreamingContent('');
      streamingMsgIdRef.current = data.msgId;
      armStreamWatchdog(
        STREAM_WATCHDOG_MS,
        'STREAM_NO_FIRST_CHUNK',
        '顾问响应超时，请重试',
      );
    });

    socket.on('stream_chunk', (data: { msgId: string; delta: string; index: number }) => {
      if (data.msgId !== streamingMsgIdRef.current) return;
      setStreamingContent((prev) => prev + data.delta);
      armStreamWatchdog(
        CHUNK_IDLE_MS,
        'STREAM_IDLE_TIMEOUT',
        '顾问响应中断，请重试',
      );
    });

    socket.on('stream_end', (data: {
      msgId: string;
      fullContent: string;
      suggestedQuestions: string[];
      tokenUsed: number;
      assistantUuid?: string;
    }) => {
      if (data.msgId !== streamingMsgIdRef.current) return;
      resetStreamingState();

      const assistantMsg: ChatMessage = {
        uuid: data.assistantUuid || `${data.msgId}_reply`,
        clientMsgId: data.msgId,
        role: 'assistant',
        content: data.fullContent,
        metadata: { suggestedQuestions: data.suggestedQuestions },
        feedbackScore: null,
        createdAt: new Date().toISOString(),
        source: 'realtime',
        status: 'committed',
      };
      setMessages((prev) => mergeMessages(prev, [assistantMsg]));
      setSuggestedQuestions(data.suggestedQuestions || []);
    });

    socket.on('stream_failed', (data: {
      msgId: string;
      fullContent: string;
      assistantUuid?: string;
    }) => {
      if (data.msgId !== streamingMsgIdRef.current) return;
      resetStreamingState();
      if (data.fullContent?.trim()) {
        const degradedMsg: ChatMessage = {
          uuid: data.assistantUuid || `${data.msgId}_failed`,
          clientMsgId: data.msgId,
          role: 'assistant',
          content: data.fullContent,
          createdAt: new Date().toISOString(),
          source: 'realtime',
          status: 'failed',
        };
        setMessages((prev) => mergeMessages(prev, [degradedMsg]));
      }
      onNeedResyncRef.current?.();
    });

    socket.on('feedback_received', (data: {
      messageUuid: string;
      score: number;
      success: boolean;
    }) => {
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.uuid === data.messageUuid
              ? { ...m, feedbackScore: data.score }
              : m
          ),
        );
      }
    });

    socket.on('chat_error', (data: { code: string; message: string }) => {
      resetStreamingState();
      onErrorRef.current?.(data);
      onNeedResyncRef.current?.();
    });

    // backward compatibility for older backend
    socket.on('error', (data: { code: string; message: string }) => {
      resetStreamingState();
      onErrorRef.current?.(data);
      onNeedResyncRef.current?.();
    });

    return () => {
      clearStreamWatchdog();
      socket.disconnect();
      socketRef.current = null;
      joinedRef.current = false;
    };
  }, [sessionId, armStreamWatchdog, clearStreamWatchdog, resetStreamingState]);

  const sendMessage = useCallback((content: string) => {
    if (!socketRef.current || !sessionId || !content.trim()) return;

    const send = () => {
      if (!socketRef.current || !joinedRef.current) return;
      socketRef.current.emit('send_message', { sessionId, content: content.trim() });
    };

    // If not joined yet, trigger join and wait for it before sending
    if (!joinedRef.current) {
      // Re-emit join_session and listen for joined_session once
      const socket = socketRef.current;
      const onJoined = () => {
        joinedRef.current = true;
        socket.off('joined_session', onJoined);
        send();
      };
      socket.on('joined_session', onJoined);
      socket.emit('join_session', { sessionId });
      // If already connected, the event should come back shortly
      return;
    }

    send();
  }, [sessionId]);

  const sendFeedback = useCallback((messageUuid: string, score: number, text?: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('feedback', { messageUuid, score, text });

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) =>
        m.uuid === messageUuid ? { ...m, feedbackScore: score } : m
      ),
    );
  }, []);

  const loadHistory = useCallback((historicalMessages: ChatMessage[]) => {
    setMessages((prev) => mergeMessages(prev, historicalMessages.map((m) => ({
      ...m,
      source: 'history',
      status: 'committed',
    }))));
  }, []);

  return {
    isConnected,
    isStreaming,
    streamingContent,
    messages,
    suggestedQuestions,
    sendMessage,
    sendFeedback,
    loadHistory,
  };
}
