'use client';

import { useState, useRef } from 'react';
import { uploadApi } from '@/lib/api';

interface MomentPublisherProps {
  visible: boolean;
  onClose: () => void;
  onPublished: () => void;
}

export function MomentPublisher({ visible, onClose, onPublished }: MomentPublisherProps) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<Array<{ file: File; preview: string; uploading?: boolean; url?: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectImages = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (images.length + files.length > 9) {
      alert('最多上传9张图片');
      return;
    }

    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);

    // Start uploading
    const uploadPromises = newImages.map(async (img, index) => {
      const imgIndex = images.length + index;
      try {
        const res = await uploadApi.uploadImage(img.file);
        setImages((prev) =>
          prev.map((p, i) =>
            i === imgIndex ? { ...p, uploading: false, url: res.data.url } : p
          )
        );
      } catch (err) {
        console.error('Upload failed:', err);
        setImages((prev) => prev.filter((_, i) => i !== imgIndex));
      }
    });

    // Mark as uploading
    setImages((prev) =>
      prev.map((p, i) =>
        i >= images.length && i < images.length + newImages.length ? { ...p, uploading: true } : p
      )
    );

    await Promise.all(uploadPromises);
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) return;

    const uploadedUrls = images
      .filter((img) => img.url)
      .map((img) => img.url!);

    if (images.some((img) => img.uploading)) {
      alert('图片正在上传中，请稍候');
      return;
    }

    setSubmitting(true);
    try {
      const { momentsApi } = await import('@/lib/api');
      await momentsApi.createMoment({ content: content.trim(), images: uploadedUrls });
      setContent('');
      setImages([]);
      onPublished();
      onClose();
    } catch (err) {
      console.error('Failed to publish:', err);
      alert('发布失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (content.trim() || images.length > 0) {
      if (!confirm('确定放弃编辑？')) return;
    }
    setContent('');
    setImages([]);
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl max-h-[85vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button onClick={handleClose} className="text-gray-500 text-sm">取消</button>
          <span className="text-base font-medium text-gray-800">发朋友圈</span>
          <button
            onClick={handleSubmit}
            disabled={submitting || (!content.trim() && images.length === 0) || images.some((img) => img.uploading)}
            className="text-sm font-medium text-primary-500 hover:text-primary-600 disabled:opacity-40"
          >
            {submitting ? '发布中...' : '发布'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="这一刻的想法..."
            className="w-full min-h-[120px] text-sm text-gray-800 resize-none focus:outline-none placeholder-gray-400 leading-relaxed"
            maxLength={2000}
          />

          <div className="mt-3">
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-md overflow-hidden bg-gray-100">
                  {img.uploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      <img src={img.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center text-white text-xs"
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              ))}

              {images.length < 9 && (
                <button
                  onClick={handleSelectImages}
                  className="aspect-square rounded-md border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary-300 hover:text-primary-400 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs">{images.length}/9</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
