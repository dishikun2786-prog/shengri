'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { notificationApi, type NotificationItem } from '@/lib/api';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadNotifications = useCallback(async (pageNum: number) => {
    if (pageNum === 1) setLoading(true);
    try {
      const res = await notificationApi.getNotifications({ page: pageNum, size: 20 });
      const data = res.data;
      if (pageNum === 1) {
        setNotifications(data.notifications);
      } else {
        setNotifications((prev) => [...prev, ...data.notifications]);
      }
      setHasMore(pageNum < data.totalPages);
      setPage(pageNum);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications(1);
  }, [loadNotifications]);

  const handleClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await notificationApi.markRead(notif.uuid);
      setNotifications((prev) =>
        prev.map((n) => (n.uuid === notif.uuid ? { ...n, isRead: true } : n)),
      );
    }

    if (notif.refType === 'pairing_request' && notif.refId) {
      if (notif.type === 'new_message') {
        router.push(`/pairing/${notif.refId}/chat`);
      } else {
        router.push(`/pairing/${notif.refId}`);
      }
    } else if (notif.refType === 'report' && notif.refId) {
      router.push(`/report/${notif.refId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8]">
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <div className="flex items-center px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => router.back()} className="text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-base font-medium text-gray-800 ml-3">通知</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center">
            <button onClick={() => router.back()} className="text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-base font-medium text-gray-800 ml-3">通知</h1>
          </div>
          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={async () => {
                await notificationApi.markAllRead();
                setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
              }}
              className="text-xs text-primary-500"
            >
              全部已读
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl text-gray-200 mb-3">🔔</div>
            <p className="text-gray-500 text-sm">暂无通知</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`w-full text-left bg-white px-4 py-3.5 border-b border-gray-50
                hover:bg-gray-50/50 transition-colors
                ${!notif.isRead ? 'bg-primary-50/20' : ''}`}
            >
              <div className="flex items-start gap-3">
                {!notif.isRead && (
                  <span className="w-2 h-2 mt-1.5 rounded-full bg-primary-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-gray-800">{notif.title}</p>
                  {notif.body && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notif.body}</p>
                  )}
                  <p className="text-[10px] text-gray-300 mt-1.5">
                    {new Date(notif.createdAt).toLocaleDateString('zh-CN', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}

        {hasMore && (
          <div className="py-4 text-center">
            <button
              onClick={() => loadNotifications(page + 1)}
              className="text-sm text-gray-500 hover:text-primary-500"
            >
              加载更多
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
