'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { momentsApi, type Moment, type MomentImage } from '@/lib/api';
import { MomentCard } from '@/components/moments/MomentCard';
import { MomentPublisher } from '@/components/moments/MomentPublisher';
import { ImagePreview } from '@/components/moments/ImagePreview';
import { PairingRequestModal } from '@/components/pairing/PairingRequestModal';

export default function MomentsPage() {
  const router = useRouter();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showPublisher, setShowPublisher] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>();
  const [refreshing, setRefreshing] = useState(false);

  // Image preview state - lifted to page level
  const [previewImages, setPreviewImages] = useState<MomentImage[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);

  // Pairing modal state - lifted to page level to avoid stacking context issues
  const [pairModalVisible, setPairModalVisible] = useState(false);
  const [pairTargetUser, setPairTargetUser] = useState<{ id: number; name: string }>({ id: 0, name: '' });

  const handleOpenPairModal = useCallback((userId: number, userName: string) => {
    setPairTargetUser({ id: userId, name: userName });
    setPairModalVisible(true);
  }, []);

  const handleOpenPreview = useCallback((images: MomentImage[], index: number) => {
    setPreviewImages(images);
    setPreviewIndex(index);
    setShowPreview(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
  }, []);

  const loadMoments = useCallback(async (pageNum: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    setLoadError('');

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await momentsApi.getMoments({ page: pageNum, size: 20 });
      const newMoments = res.data.moments;

      if (pageNum === 1) {
        setMoments(newMoments);
      } else {
        setMoments((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const unique = newMoments.filter((m) => !existingIds.has(m.id));
          return [...prev, ...unique];
        });
      }

      setHasMore(pageNum < res.data.totalPages);
      setPage(pageNum);

      // Extract current user id
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          setCurrentUserId(userData.id);
        } catch {}
      }
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    loadMoments(1);
  }, [loadMoments]);

  const handleRefresh = () => {
    loadMoments(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadMoments(page + 1);
    }
  };

  const handleMomentsChange = () => {
    loadMoments(1, true);
  };

  const handleDelete = (momentId: number) => {
    setMoments((prev) => prev.filter((m) => m.id !== momentId));
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => router.back()} className="text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-medium text-gray-800">朋友圈</h1>
          <button
            onClick={() => setShowPublisher(true)}
            className="text-primary-500 text-sm font-medium"
          >
            发布
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto">
        {loading ? (
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white px-4 py-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full skeleton-shimmer shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 rounded skeleton-shimmer" />
                    <div className="h-3 w-full rounded skeleton-shimmer" />
                    <div className="h-3 w-3/4 rounded skeleton-shimmer" />
                    <div className="grid grid-cols-3 gap-1 mt-2">
                      <div className="aspect-square rounded bg-gray-100 skeleton-shimmer" />
                      <div className="aspect-square rounded bg-gray-100 skeleton-shimmer" />
                      <div className="aspect-square rounded bg-gray-100 skeleton-shimmer" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">{loadError}</p>
            <button
              onClick={() => loadMoments(1)}
              className="mt-3 text-sm text-primary-500"
            >
              重试
            </button>
          </div>
        ) : moments.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl text-gray-200 mb-4">☯</div>
            <p className="text-gray-500 text-sm">还没有人发朋友圈</p>
            <p className="text-gray-400 text-xs mt-1">成为第一个分享的人吧</p>
            <button
              onClick={() => setShowPublisher(true)}
              className="mt-4 px-4 py-2 bg-primary-500 text-white text-sm rounded-full"
            >
              发布动态
            </button>
          </div>
        ) : (
          <div className="space-y-0">
            {moments.map((moment, i) => (
              <div
                key={moment.id}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <MomentCard
                  moment={moment}
                  currentUserId={currentUserId}
                  onDelete={handleDelete}
                  onImageClick={(index) => handleOpenPreview(moment.images, index)}
                  onPairRequest={handleOpenPairModal}
                />
              </div>
            ))}

            {/* Load more */}
            <div className="bg-white py-4 text-center">
              {hasMore ? (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="text-sm text-gray-500 hover:text-primary-500 disabled:opacity-50"
                >
                  {loadingMore ? '加载中...' : '加载更多'}
                </button>
              ) : (
                <span className="text-xs text-gray-400">— 没有更多了 —</span>
              )}
            </div>
          </div>
        )}
      </div>

      <MomentPublisher
        visible={showPublisher}
        onClose={() => setShowPublisher(false)}
        onPublished={handleMomentsChange}
      />

      {/* Image Preview - rendered at page level, outside the card hierarchy */}
      <ImagePreview
        images={previewImages}
        initialIndex={previewIndex}
        visible={showPreview}
        onClose={handleClosePreview}
      />

      {/* Pairing Modal - rendered at page level to avoid stacking context issues */}
      <PairingRequestModal
        visible={pairModalVisible}
        targetUserId={pairTargetUser.id}
        targetUserName={pairTargetUser.name}
        onClose={() => setPairModalVisible(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
