'use client';

import { useAddToHomeScreen } from '@/hooks/useAddToHomeScreen';
import { X, Download, Share, MoreHorizontal } from 'lucide-react';

export default function AddToHomeScreen() {
  const { browserType, show, install, dismiss } = useAddToHomeScreen();

  if (!show || !browserType) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={dismiss} />

      {browserType === 'chrome_android' && (
        <AndroidPrompt onInstall={install} onDismiss={dismiss} />
      )}
      {browserType === 'ios_safari' && (
        <IOSPrompt onDismiss={dismiss} />
      )}
      {browserType === 'wechat' && (
        <WeChatPrompt onDismiss={dismiss} />
      )}
    </div>
  );
}

function AndroidPrompt({
  onInstall,
  onDismiss,
}: {
  onInstall: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="relative w-full sm:max-w-sm mx-3 mb-3 sm:mb-0 bg-white rounded-2xl shadow-xl p-4 animate-slide-up">
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-ink-400 hover:bg-ink-50"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-3 mt-1">
        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">☯</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-kai text-sm font-semibold text-ink-800">生日命理</p>
          <p className="text-xs text-ink-500">添加到手机桌面，随时查看命盘</p>
        </div>
      </div>

      <button
        onClick={onInstall}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-primary-600 text-white rounded-xl py-2.5 text-sm font-medium active:bg-primary-700"
      >
        <Download size={16} />
        立即安装
      </button>
    </div>
  );
}

function IOSPrompt({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="relative w-full sm:max-w-sm mx-3 mb-3 sm:mb-0 bg-white rounded-2xl shadow-xl p-5 animate-slide-up">
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-ink-400 hover:bg-ink-50"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">☯</span>
        </div>
        <p className="font-kai font-semibold text-ink-800 text-sm">
          添加到主屏幕，快速访问
        </p>
      </div>

      <div className="bg-ink-50 rounded-xl p-3 mb-3">
        <div className="flex items-center gap-2 text-ink-600 text-sm">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
            1
          </span>
          <span>点击底部</span>
          <Share size={16} className="text-primary-600" />
          <span className="font-medium text-primary-700">分享按钮</span>
        </div>
        <div className="flex items-center gap-2 text-ink-600 text-sm mt-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
            2
          </span>
          <span>滑动找到</span>
          <span className="font-medium text-primary-700">「添加到主屏幕」</span>
        </div>
      </div>

      <div className="flex justify-center">
        <svg width="20" height="14" viewBox="0 0 20 14" className="text-primary-500">
          <path
            d="M10 0L19.5 14H0.5L10 0Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <button
        onClick={onDismiss}
        className="mt-3 w-full py-2 text-sm text-ink-500 active:text-ink-700"
      >
        知道了
      </button>
    </div>
  );
}

function WeChatPrompt({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="relative w-full sm:max-w-sm mx-3 mb-3 sm:mb-0 bg-white rounded-2xl shadow-xl p-5 animate-slide-up">
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-ink-400 hover:bg-ink-50"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">☯</span>
        </div>
        <p className="font-kai font-semibold text-ink-800 text-sm">
          添加到桌面，随时查看命盘
        </p>
      </div>

      <div className="bg-ink-50 rounded-xl p-3 mb-3">
        <div className="flex items-center gap-2 text-ink-600 text-sm">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
            1
          </span>
          <span>点击右上角</span>
          <MoreHorizontal size={16} className="text-primary-600" />
        </div>
        <div className="flex items-center gap-2 text-ink-600 text-sm mt-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
            2
          </span>
          <span>选择</span>
          <span className="font-medium text-primary-700">「添加到桌面」</span>
        </div>
      </div>

      <div className="flex justify-end">
        <svg width="20" height="14" viewBox="0 0 20 14" className="text-primary-500">
          <path
            d="M10 0L19.5 14H0.5L10 0Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <button
        onClick={onDismiss}
        className="mt-3 w-full py-2 text-sm text-ink-500 active:text-ink-700"
      >
        知道了
      </button>
    </div>
  );
}
