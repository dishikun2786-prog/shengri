'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { notificationApi, type NotificationItem } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

interface ToastItem {
  uuid: string;
  title: string;
  refType?: string;
  refId?: string;
}

export function PairingNotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const toastTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Connect Socket.IO for real-time notifications
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';
    const socket = io(`${wsUrl}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    socket.on('notification', (notif: {
      uuid: string; type: string; title: string; body?: string;
      refType?: string; refId?: string;
    }) => {
      // Update unread count immediately
      setUnreadCount((prev) => prev + 1);

      // Show toast
      const toast: ToastItem = { uuid: notif.uuid, title: notif.title, refType: notif.refType, refId: notif.refId };
      setToasts((prev) => [...prev, toast]);

      // Auto-dismiss toast after 4 seconds
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.uuid !== toast.uuid));
        toastTimers.current.delete(toast.uuid);
      }, 4000);
      toastTimers.current.set(toast.uuid, timer);

      // Also refresh dropdown if open
      if (showDropdown) {
        fetchNotifications();
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      // Clear all toast timers
      toastTimers.current.forEach((t) => clearTimeout(t));
    };
  }, []); // Only connect once on mount

  const fetchUnread = async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      setUnreadCount(res.data.unreadCount);
    } catch {}
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getNotifications({ page: 1, size: 5 });
      setNotifications(res.data.notifications);
    } catch {} finally {
      setLoading(false);
    }
  };

  // Initial load + polling fallback (for missed notifications during disconnect)
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000); // Poll every 60s as fallback
    return () => clearInterval(interval);
  }, []);

  const handleToggle = () => {
    if (!showDropdown) {
      fetchNotifications();
    }
    setShowDropdown(!showDropdown);
  };

  const dismissToast = (uuid: string) => {
    setToasts((prev) => prev.filter((t) => t.uuid !== uuid));
    const timer = toastTimers.current.get(uuid);
    if (timer) {
      clearTimeout(timer);
      toastTimers.current.delete(uuid);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await notificationApi.markRead(notif.uuid);
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setShowDropdown(false);

    if (notif.refType === 'pairing_request' && notif.refId) {
      // For new messages, go directly to chat; otherwise to pairing detail
      if (notif.type === 'new_message') {
        router.push(`/pairing/${notif.refId}/chat`);
      } else {
        router.push(`/pairing/${notif.refId}`);
      }
    } else if (notif.refType === 'report' && notif.refId) {
      router.push(`/report/${notif.refId}`);
    }
  };

  const handleMarkAllRead = async () => {
    await notificationApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleToastClick = (toast: ToastItem) => {
    dismissToast(toast.uuid);
    if (toast.refType === 'pairing_request' && toast.refId) {
      // Toast is from real-time socket; for new messages, go directly to chat
      router.push(`/pairing/${toast.refId}/chat`);
    } else if (toast.refType === 'report' && toast.refId) {
      router.push(`/report/${toast.refId}`);
    }
  };

  return (
    <>
      {/* Toast notifications */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 z-[60] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.uuid}
            onClick={() => handleToastClick(toast)}
            className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3
              animate-slide-in-right cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-800 line-clamp-2">{toast.title}</p>
                <p className="text-[10px] text-primary-500 mt-0.5">点击查看</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismissToast(toast.uuid); }}
                className="text-gray-300 hover:text-gray-500 shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Notification bell */}
      <div className="relative">
        <button
          onClick={handleToggle}
          className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center
              min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold
              rounded-full leading-none animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-2xl shadow-xl
              border border-gray-100 z-50 overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <h4 className="text-sm font-semibold text-gray-800">通知</h4>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary-500 hover:text-primary-600"
                  >
                    全部已读
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">加载中...</div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">暂无通知</div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors
                        border-b border-gray-50 last:border-0
                        ${!notif.isRead ? 'bg-primary-50/30' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {!notif.isRead && (
                          <span className="w-2 h-2 mt-1.5 rounded-full bg-primary-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 line-clamp-1">{notif.title}</p>
                          {notif.body && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notif.body}</p>
                          )}
                          <p className="text-[10px] text-gray-300 mt-1">
                            {new Date(notif.createdAt).toLocaleDateString('zh-CN', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <button
                onClick={() => { router.push('/notifications'); setShowDropdown(false); }}
                className="w-full px-4 py-2.5 text-center text-sm text-gray-500 hover:text-gray-700
                  border-t border-gray-50 hover:bg-gray-50 transition-colors"
              >
                查看全部通知
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
