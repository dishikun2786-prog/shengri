'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PairingNotificationBell } from './pairing/PairingNotificationBell';

type UserLite = { nickname?: string | null; username?: string | null };

const AUTH_EVENT = 'auth-state-change';

export default function AuthNav({ compact }: { compact?: boolean }) {
  const [user, setUser] = useState<UserLite | null | undefined>(undefined);

  const loadUser = useCallback(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
      else setUser(null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    loadUser();

    const handleAuthChange = () => loadUser();

    window.addEventListener(AUTH_EVENT, handleAuthChange);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'token') {
        loadUser();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(AUTH_EVENT, handleAuthChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadUser]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new CustomEvent(AUTH_EVENT));
    window.location.href = '/';
  };

  if (user === undefined) {
    return <div className="w-24 h-5" aria-hidden />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-600">
        <PairingNotificationBell />
        <Link
          href="/pairing"
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-all duration-200 text-xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0 4 4 0 000 5.656l1.414 1.414m2.828-2.828l1.414-1.414a4 4 0 000-5.656 4 4 0 00-5.656 0" />
          </svg>
          {!compact && <span>配对</span>}
        </Link>
        <Link
          href="/profile"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-all duration-200"
        >
          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-[10px] font-kai">
            {(user.nickname || user.username || '用')[0]}
          </span>
          {!compact && <span className="max-w-[100px] truncate">{user.nickname || user.username || '用户'}</span>}
        </Link>
        {!compact && (
          <button
            type="button"
            onClick={logout}
            className="hover:text-primary-600 transition-colors"
          >
            退出
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <Link href="/login" className="hover:text-primary-600 transition-colors">
        登录
      </Link>
      <Link href="/register" className="hover:text-primary-600 transition-colors">
        注册
      </Link>
    </div>
  );
}

export function dispatchAuthChange() {
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}
