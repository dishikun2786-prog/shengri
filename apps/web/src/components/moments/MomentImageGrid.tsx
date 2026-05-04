'use client';

import { type MomentImage as MomentImageType } from '@/lib/api';

function getImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return url;
}

interface MomentImageGridProps {
  images: MomentImageType[];
  onImageClick?: (index: number) => void;
}

export function MomentImageGrid({ images, onImageClick }: MomentImageGridProps) {
  if (!images || images.length === 0) return null;

  const getGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 4) return 'grid-cols-2';
    return 'grid-cols-3';
  };

  const getSpanClass = (count: number, index: number) => {
    if (count === 1) return 'col-span-1';
    if (count === 2) return '';
    if (count === 4 && index === 0) return 'col-span-2';
    if (count === 4 && index === 2) return 'col-span-2';
    return '';
  };

  const gridClass = getGridClass(images.length);

  if (images.length === 1) {
    const img = images[0];
    return (
      <div className="mt-2 relative" style={{ maxWidth: 240, maxHeight: 320 }}>
        <div className="relative overflow-hidden rounded-md" style={{ aspectRatio: '3/4' }}>
          <img
            src={getImageUrl(img.url)}
            alt="图片"
            className="absolute inset-0 w-full h-full object-cover cursor-pointer transition-opacity hover:opacity-90"
            onClick={() => onImageClick?.(0)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-2 grid ${gridClass} gap-1 max-w-sm`}>
      {images.map((img, index) => (
        <div
          key={img.id}
          className={`relative overflow-hidden rounded ${getSpanClass(images.length, index)}`}
          style={{ aspectRatio: '1/1' }}
        >
          <img
            src={getImageUrl(img.url)}
            alt={`图片${index + 1}`}
            className="absolute inset-0 w-full h-full object-cover cursor-pointer transition-opacity hover:opacity-90"
            onClick={() => onImageClick?.(index)}
          />
        </div>
      ))}
    </div>
  );
}
