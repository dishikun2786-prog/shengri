'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const BG_IMAGE_PATH = '/images/promotion-poster-bg.jpg?v=3';
const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 1013;
// QR code centered on the poster's built-in white square placeholder (160x121px)
// White card bounds: (299,865)-(458,985), center: (378,925)
const QR_SIZE = 115;
const QR_X = 321;
const QR_Y = 868;
const QR_COLOR = '#1c1108';

function isWeChat(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}

interface PosterGeneratorProps {
  referralLink: string;
  onClose: () => void;
}

type Status = 'loading' | 'ready' | 'error';

export default function PosterGenerator({ referralLink, onClose }: PosterGeneratorProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inWeChat = isWeChat();

  const generatePoster = useCallback(async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Load background
      const bgImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('背景图加载失败'));
        img.src = BG_IMAGE_PATH;
      });
      ctx.drawImage(bgImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Generate QR code directly on the poster's built-in white placeholder
      const QRCode = (await import('qrcode')).default || (await import('qrcode'));
      const qrDataUrl = await QRCode.toDataURL(referralLink, {
        width: QR_SIZE,
        margin: 1,
        color: { dark: QR_COLOR, light: '#ffffff' },
      });

      const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('二维码生成失败'));
        img.src = qrDataUrl;
      });
      ctx.drawImage(qrImg, QR_X, QR_Y, QR_SIZE, QR_SIZE);

      canvasRef.current = canvas;
      setPosterUrl(canvas.toDataURL('image/png'));
      setStatus('ready');
    } catch (err: any) {
      setErrorMsg(err?.message || '海报生成失败');
      setStatus('error');
    }
  }, [referralLink]);

  useEffect(() => {
    generatePoster();
  }, [generatePoster]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '推广海报.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <h2 className="text-base font-bold font-kai text-ink-800">我的推广海报</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-ink-50 text-ink-400 hover:text-ink-600 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-10 h-10 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
              <p className="text-sm text-ink-400">正在生成海报...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="text-sm text-red-500">{errorMsg}</p>
              <button className="btn-outline text-xs px-4 py-2" onClick={generatePoster}>重试</button>
            </div>
          )}

          {status === 'ready' && posterUrl && (
            <>
              {/* Poster preview */}
              <div className="rounded-xl overflow-hidden border border-ink-100 bg-ink-50 flex justify-center relative">
                <img
                  src={posterUrl}
                  alt="推广海报"
                  className="max-w-full h-auto"
                  style={{ maxHeight: '55vh' }}
                />
                {inWeChat && (
                  <div className="absolute inset-0 bg-black/5 flex items-end justify-center pb-3 pointer-events-none">
                    <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                      长按图片保存到相册
                    </span>
                  </div>
                )}
              </div>

              {inWeChat ? (
                <p className="text-sm text-primary-600 text-center mt-3 font-medium leading-relaxed">
                  长按上方海报图片 → 选择「保存图片」即可保存到相册
                </p>
              ) : (
                <>
                  <p className="text-xs text-ink-400 text-center mt-3 leading-relaxed">
                    长按图片保存到相册，分享给微信好友
                  </p>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleDownload}
                      className="flex-1 btn-gold py-2.5 text-sm font-medium"
                    >
                      保存海报
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
