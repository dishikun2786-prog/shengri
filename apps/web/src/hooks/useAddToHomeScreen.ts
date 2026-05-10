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

/**
 * Register service worker as early as possible (before component mount).
 * Chrome requires the SW to be active for the install prompt to fire.
 */
let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (swRegistrationPromise) return swRegistrationPromise;
  if (!('serviceWorker' in navigator)) {
    swRegistrationPromise = Promise.resolve(null);
    return swRegistrationPromise;
  }
  swRegistrationPromise = (async () => {
    try {
      // Force-update: unregister any old SW with corrupted cache first
      const oldReg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (oldReg && oldReg.active) {
        const activeVersion = oldReg.active.scriptURL;
        // Check if we need to update — the old SW might have a corrupted cache
        await oldReg.update();
      }

      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[PWA] Service Worker registered, scope:', reg.scope);

      // Immediately check for updates and apply them
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW available — reload to activate
              console.log('[PWA] New Service Worker available, reloading...');
              window.location.reload();
            }
          });
        }
      });

      return reg;
    } catch (err: any) {
      console.warn('[PWA] Service Worker registration failed:', err.message);
      return null;
    }
  })();
  return swRegistrationPromise;
}

// Register SW at module import time (runs before any component mounts)
if (typeof window !== 'undefined' && isMobile() && !isStandalone()) {
  ensureServiceWorker();
}

export function useAddToHomeScreen() {
  const [browserType, setBrowserType] = useState<BrowserType | null>(null);
  const [show, setShow] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const type = detectBrowser();
    setBrowserType(type);

    if (isStandalone()) return;
    if (!isMobile()) return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - parseInt(dismissed, 10) < DISMISS_DURATION) return;

    // Ensure SW is registered (may have been done at import time)
    ensureServiceWorker();

    // Listen for install prompt — must be added synchronously in the effect
    const promptHandler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      // Show prompt immediately when browser fires beforeinstallprompt
      setShow(true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    window.addEventListener('beforeinstallprompt', promptHandler);

    // Fallback: show after 10 seconds if no beforeinstallprompt fired (e.g. on browsers that don't support it)
    timerRef.current = setTimeout(() => {
      if (!deferredPrompt.current) {
        setShow(true);
      }
    }, 10000);

    // Also show when user scrolls past 30%
    let scrollFired = false;
    const scrollHandler = () => {
      if (scrollFired) return;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (docH > 0 && window.scrollY / docH > 0.3) {
        scrollFired = true;
        if (!deferredPrompt.current) setShow(true);
        window.removeEventListener('scroll', scrollHandler);
        if (timerRef.current) clearTimeout(timerRef.current);
      }
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });

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
        return;
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
