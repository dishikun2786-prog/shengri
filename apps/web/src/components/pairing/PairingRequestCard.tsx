'use client';

import { PairingStatusBadge } from './PairingStatusBadge';

const TYPE_LABELS: Record<string, string> = {
  personality: '性格匹配',
  career: '事业合作',
  wealth: '财运互补',
  hehun: '合婚分析',
  comprehensive: '综合配对',
};

interface PairingRequestCardProps {
  uuid: string;
  pairingType: string;
  status: number;
  message?: string;
  otherUser: {
    id: number;
    nickname: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  isIncoming: boolean; // true = received, false = sent
  createdAt: string;
  onView: (uuid: string) => void;
  onAccept?: (uuid: string) => void;
  onReject?: (uuid: string) => void;
  onCancel?: (uuid: string) => void;
}

export function PairingRequestCard({
  uuid,
  pairingType,
  status,
  message,
  otherUser,
  isIncoming,
  createdAt,
  onView,
  onAccept,
  onReject,
  onCancel,
}: PairingRequestCardProps) {
  const displayName = otherUser.nickname || otherUser.username || '用户';
  const timeStr = new Date(createdAt).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      onClick={() => onView(uuid)}
      className="bg-white px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50
        cursor-pointer transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-amber-100
          flex items-center justify-center text-primary-600 font-medium text-sm shrink-0
          overflow-hidden">
          {otherUser.avatarUrl ? (
            <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            displayName[0]
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 truncate">{displayName}</span>
            <PairingStatusBadge status={status} />
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
              {TYPE_LABELS[pairingType] || pairingType}
            </span>
            <span className="text-xs text-gray-400">{timeStr}</span>
          </div>

          {message && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{message}</p>
          )}

          <p className="text-xs text-gray-400 mt-1">
            {isIncoming ? '向你发起了配对请求' : '你发起了配对请求'}
          </p>

          {/* Action buttons for incoming pending requests */}
          {isIncoming && status === 0 && onAccept && onReject && (
            <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onAccept(uuid)}
                className="px-3 py-1 bg-primary-500 text-white text-xs font-medium rounded-full
                  hover:bg-primary-600 transition-colors"
              >
                同意
              </button>
              <button
                onClick={() => onReject(uuid)}
                className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full
                  hover:bg-gray-200 transition-colors"
              >
                拒绝
              </button>
            </div>
          )}

          {/* Cancel button for outgoing pending requests */}
          {!isIncoming && status === 0 && onCancel && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onCancel(uuid)}
                className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full
                  hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                取消请求
              </button>
            </div>
          )}
        </div>

        {/* Arrow */}
        <svg className="w-4 h-4 text-gray-300 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
