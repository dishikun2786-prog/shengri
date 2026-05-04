'use client';

import { useEffect, useState, useCallback } from 'react';
import { shareApi } from '@/lib/api';
import { REPORT_TYPE_LABELS, SHARE_MODAL, SHARE_PAGE } from '@/lib/constants';

interface ShareModalProps {
  reportUuid: string;
  reportTitle: string;
  reportType: string;
  overallScore?: number;
  onClose: () => void;
}

export default function ShareModal({
  reportUuid,
  reportTitle,
  reportType,
  overallScore,
  onClose,
}: ShareModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<{
    shareToken: string;
    shareUrl: string;
    shareId: number;
    viewCount: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const createShare = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await shareApi.create(reportUuid);
      const data = res.data;
      setShareData(data);

      // Generate QR code
      try {
        const QRCode = (await import('qrcode')).default || (await import('qrcode'));
        const url = await QRCode.toDataURL(data.shareUrl, {
          width: 200,
          margin: 2,
          color: { dark: '#6d2a1c', light: '#ffffff' },
        });
        setQrDataUrl(url);
      } catch {
        // QR code generation failed — use API fallback
        setQrDataUrl(
          `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.shareUrl)}`,
        );
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || '分享链接生成失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [reportUuid]);

  useEffect(() => {
    createShare();
  }, [createShare]);

  const handleCopy = async () => {
    if (!shareData?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareData.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS contexts
      const input = document.createElement('input');
      input.value = shareData.shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-ink-900 font-kai">
            {SHARE_MODAL.title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-ink-50 hover:bg-ink-100 flex items-center justify-center text-ink-400 hover:text-ink-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center py-10">
            <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-4" />
            <p className="text-ink-400 text-sm">正在生成分享链接...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center py-6">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-ink-600 text-sm mb-3">{error}</p>
            <button
              onClick={createShare}
              className="btn-outline text-sm px-4 py-2"
            >
              重试
            </button>
          </div>
        )}

        {/* Ready State */}
        {shareData && !loading && (
          <>
            {/* QR Code */}
            {qrDataUrl && (
              <div className="flex flex-col items-center mb-5">
                <div className="bg-white border-2 border-ink-100 rounded-xl p-3 mb-2">
                  <img
                    src={qrDataUrl}
                    alt="分享二维码"
                    className="w-40 h-40"
                    width={160}
                    height={160}
                  />
                </div>
                <p className="text-xs text-ink-400">{SHARE_MODAL.scanTip}</p>
              </div>
            )}

            {/* Share Link */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-ink-500 mb-1.5">
                分享链接
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareData.shareUrl}
                  className="flex-1 bg-ink-50 rounded-lg px-3 py-2 text-sm text-ink-700 border border-ink-100 focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    copied
                      ? 'bg-green-50 text-green-600 border border-green-200'
                      : 'btn-outline'
                  }`}
                >
                  {copied ? SHARE_MODAL.copied : SHARE_MODAL.copyButton}
                </button>
              </div>
            </div>

            {/* WeChat Share Guide */}
            <div className="bg-ink-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-ink-500 mb-1">{SHARE_MODAL.wechatHint1}</p>
              <p className="text-xs text-ink-500">{SHARE_MODAL.wechatHint2}</p>
            </div>

            {/* Mini Preview Card */}
            <div className="border border-ink-100 rounded-xl p-4 bg-gradient-to-br from-primary-50/30 to-gold-50/30">
              <p className="text-xs text-ink-400 mb-2">分享预览</p>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-full min-h-[48px] rounded-full bg-gradient-to-b from-primary-500 to-gold-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gold-100 text-gold-700 font-medium">
                      {REPORT_TYPE_LABELS[reportType] || reportType}
                    </span>
                    {overallScore != null && (
                      <span className="text-xs text-ink-400">{overallScore}分</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-ink-800 truncate">{reportTitle}</p>
                  <p className="text-xs text-ink-400 mt-1">
                    {SHARE_PAGE.viewCountPrefix}{shareData.viewCount || 0}{SHARE_PAGE.viewCountSuffix}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
