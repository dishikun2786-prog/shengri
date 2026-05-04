'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type BrowserType = 'chrome_android' | 'ios_safari' | 'wechat' | 'other';

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent;
  if (/MicroMessenger/i.test(ua)) return 'wechat';
  if (/iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua))
    return 'ios_safari';
  if (/Android/.test(ua) && /Chrome/.test(ua)) return 'chrome_android';
  return 'other';
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches;
}

function isMobile(): boolean {
  return (
    /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && window.innerWidth < 1024)
  );
}

const DISMISSED_KEY = 'a2hs_dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000;

export function useAddToHomeScreen() {
  const [browserType, setBrowserType] = useState<BrowserType | null>(null);
  const [show, setShow] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const type = detectBrowser();
    setBrowserType(type);

    if (isStandalone()) return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - parseInt(dismissed, 10) < DISMISS_DURATION) return;

    if (!isMobile()) return;

    // Register minimal service worker (required for Chrome install prompt)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const promptHandler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener('beforeinstallprompt', promptHandler);

    // Show after 10 seconds on page
    timerRef.current = setTimeout(() => setShow(true), 10000);

    // Also show when user scrolls past 30% of page
    let scrollFired = false;
    const scrollHandler = () => {
      if (scrollFired) return;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (docH > 0 && window.scrollY / docH > 0.3) {
        scrollFired = true;
        setShow(true);
        window.removeEventListener('scroll', scrollHandler);
        if (timerRef.current) clearTimeout(timerRef.current);
      }
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });

    // Listen for appinstalled event to hide prompt
    const installedHandler = () => setShow(false);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', promptHandler);
      window.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('appinstalled', installedHandler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const install = useCallback(async () => {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      const result = await deferredPrompt.current.userChoice;
      deferredPrompt.current = null;
      if (result.outcome === 'accepted') {
        setShow(false);
      }
    }
    // For iOS/WeChat: the guide UI just dismisses
    setShow(false);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setShow(false);
  }, []);

  return { browserType, show, install, dismiss };
}
