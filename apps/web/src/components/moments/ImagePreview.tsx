'use client';

import { useEffect, useCallback, useState } from 'react';
import { type MomentImage as MomentImageType } from '@/lib/api';

interface ImagePreviewProps {
  images: MomentImageType[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
}

function getImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return url;
}

export function ImagePreview({ images, initialIndex, visible, onClose }: ImagePreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const handleDownload = useCallback((url: string) => {
    const link = document.createElement('a');
    link.href = getImageUrl(url);
    link.download = url.split('/').pop() || 'image';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, onClose, goToPrevious, goToNext]);

  if (!visible || images.length === 0) return null;

  const currentImage = images[currentIndex];
  if (!currentImage) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/40">
        <span className="text-white/80 text-sm">
          {currentIndex + 1} / {images.length}
        </span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleDownload(currentImage.url)}
            className="text-white/80 hover:text-white transition-colors"
            title="保存图片"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image container */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        {/* Previous button */}
        {images.length > 1 && (
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white flex items-center justify-center transition-all z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Image */}
        <img
          src={getImageUrl(currentImage.url)}
          alt={`图片 ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
        />

        {/* Next button */}
        {images.length > 1 && (
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white flex items-center justify-center transition-all z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Thumbnails strip */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-4 bg-black/40 overflow-x-auto">
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setCurrentIndex(idx)}
              className={`shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-all ${
                idx === currentIndex
                  ? 'border-white opacity-100'
                  : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img
                src={getImageUrl(img.url)}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
