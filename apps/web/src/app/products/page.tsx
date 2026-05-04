'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { orderApi, userApi } from '@/lib/api';
import api from '@/lib/api';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import ChartSelectionModal from '@/components/ChartSelectionModal';

interface ProductItem {
  id: number;
  productCode: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  category: string;
  reportType: string | null;
  originalPrice: number;
  currentPrice: number;
}

// Color and badge mapping by category
const CATEGORY_STYLE: Record<string, { color: string; badge?: string; highlight: boolean }> = {
  free: { color: 'border-ink-200', highlight: false },
  lead: { color: 'border-primary-200', highlight: false },
  standard: { color: 'border-primary-200', highlight: false },
  premium: { color: 'border-gold-400', badge: '最受欢迎', highlight: true },
  enterprise: { color: 'border-primary-300', badge: '最超值', highlight: false },
  vip: { color: 'border-primary-300', highlight: false },
};

const CATEGORY_FEATURES: Record<string, string[]> = {
  free: ['真太阳时精准排盘', '四柱天干地支', '五行力量分析', '300字AI速断', '大运流年展示'],
  lead: ['所有免费功能', '1000字AI分析报告', '十神组合解读', '格局分析', '运势概览'],
  standard: ['所有基础功能', '3000字+深度报告', '详细八字解读', '关键年份识别', '行动建议'],
  premium: ['所有功能', '5000字+全方位分析', '财运/婚姻/事业/健康', '流年大运详解', '神煞详细解读'],
  enterprise: ['所有高级功能', '企业级定制报告', '专属顾问服务', '团队分析', 'API 接入'],
  vip: ['所有功能全包', '无限次报告', '专属顾问推荐', '优先响应', '年度运势'],
};

const CATEGORY_CTA: Record<string, string> = {
  free: '免费体验',
  lead: '立即购买',
  standard: '立即分析',
  premium: '深度分析',
  enterprise: '企业定制',
  vip: '尊享分析',
};

interface PendingOrder {
  productId: number;
  orderNo: string;
  amount: number;
  reportType: string;
}

interface UserReport {
  id: number;
  uuid: string;
  reportType: string;
  isPaid: boolean;
  createdAt: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [showChartSelection, setShowChartSelection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  useEffect(() => {
    // Fetch products from API
    api.get('/products')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setProducts(res.data);
        }
      })
      .catch(() => { /* fallback to empty */ })
      .finally(() => setProductsLoaded(true));

    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    if (token) {
      userApi.getReports()
        .then((res) => {
          setUserReports(Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => { /* silently fail */ })
        .finally(() => setReportsLoaded(true));
    }
  }, []);

  // Map each product to its latest matching report (if any)
  const reportMap = useMemo(() => {
    const map: Record<string, UserReport> = {};
    for (const r of userReports) {
      if (!map[r.reportType] || new Date(r.createdAt) > new Date(map[r.reportType].createdAt)) {
        map[r.reportType] = r;
      }
    }
    return map;
  }, [userReports]);

  const handleFreeProduct = async () => {
    const savedChartId = localStorage.getItem('lastChartId');
    if (savedChartId) {
      router.push(`/report/generating/${savedChartId}?type=free&paid=0`);
    } else {
      router.push('/');
    }
  };

  const handleBuyProduct = async (product: ProductItem) => {
    setError('');

    if (!isLoggedIn) {
      const redirect = encodeURIComponent(window.location.pathname + `?product=${product.productCode}`);
      router.push(`/login?redirect=${redirect}`);
      return;
    }

    setLoading(true);
    try {
      const res = await orderApi.create({
        productId: product.id,
      });

      const orderData = res.data;
      if (orderData.orderNo) {
        setPendingOrder({
          productId: product.id,
          orderNo: orderData.orderNo,
          amount: product.currentPrice,
          reportType: product.reportType || '',
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || '创建订单失败，请稍后重试';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    if (pendingOrder) {
      setShowChartSelection(true);
    }
  };

  const handlePaymentCancel = () => {
    setPendingOrder(null);
  };

  const handleChartSelect = (chartId: number) => {
    setShowChartSelection(false);
    setPendingOrder(null);
    router.push(`/report/generating/${chartId}?type=${pendingOrder?.reportType || 'free'}&paid=1`);
  };

  const handleChartSelectCancel = () => {
    setShowChartSelection(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold font-kai text-center text-primary-800 mb-2">
        选择适合您的分析服务
      </h1>
      <p className="text-center text-ink-500 mb-10">
        规则引擎精准分析 + AI智能解读，让命理不再晦涩难懂
      </p>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100 max-w-2xl mx-auto">
          {error}
        </div>
      )}

      {!productsLoaded ? (
        <div className="text-center py-10">
          <div className="w-6 h-6 mx-auto border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 mt-3">加载产品中...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => {
            const style = CATEGORY_STYLE[p.category] || { color: 'border-ink-200', highlight: false };
            const features = CATEGORY_FEATURES[p.category] || CATEGORY_FEATURES.standard;
            const cta = CATEGORY_CTA[p.category] || '立即购买';
            const isFree = p.currentPrice === 0;
            const existingReport = p.reportType ? reportMap[p.reportType] : undefined;

            return (
              <div
                key={p.id}
                className={`card relative ${style.color} border-2 ${
                  style.highlight ? 'shadow-lg scale-[1.02]' : ''
                } transition-all hover:shadow-lg`}
              >
                {style.badge && (
                  <span className="absolute -top-3 right-4 bg-gold-500 text-white text-xs px-3 py-1 rounded-full">
                    {style.badge}
                  </span>
                )}
                <h3 className="text-xl font-bold text-primary-700">{p.name}</h3>
                <p className="text-sm text-ink-500 mt-1">{p.subtitle || ''}</p>
                <div className="mt-4 mb-4">
                  {isFree ? (
                    <span className="text-3xl font-bold text-green-600">免费</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-primary-600">¥{p.currentPrice}</span>
                      {p.originalPrice > p.currentPrice && (
                        <span className="text-sm text-ink-400 line-through ml-2">¥{p.originalPrice}</span>
                      )}
                    </>
                  )}
                </div>
                <ul className="space-y-2 mb-6">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ink-600">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {(() => {
                  if (isFree && existingReport) {
                    return (
                      <div className="flex gap-2">
                        <button className="btn-primary flex-1" onClick={handleFreeProduct} disabled={loading}>
                          再次免费排盘
                        </button>
                        <button className="btn-outline flex-1" onClick={() => router.push(`/report/${existingReport.uuid}`)}>
                          查看报告
                        </button>
                      </div>
                    );
                  }
                  if (isFree) {
                    return (
                      <button className="btn-primary w-full" onClick={handleFreeProduct} disabled={loading}>
                        {cta}
                      </button>
                    );
                  }
                  if (existingReport) {
                    return (
                      <div className="flex gap-2">
                        <button className="btn-outline flex-1" onClick={() => router.push(`/report/${existingReport.uuid}`)}>
                          查看报告
                        </button>
                        <button
                          className={style.highlight ? 'btn-gold flex-1 text-sm' : 'btn-primary flex-1 text-sm'}
                          onClick={() => handleBuyProduct(p)}
                          disabled={loading}
                        >
                          {loading ? '处理中...' : '再次购买'}
                        </button>
                      </div>
                    );
                  }
                  return (
                    <button
                      className={style.highlight ? 'btn-gold w-full' : 'btn-primary w-full'}
                      onClick={() => handleBuyProduct(p)}
                      disabled={loading}
                    >
                      {loading ? '处理中...' : cta}
                    </button>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {pendingOrder && (
        <PaymentMethodSelector
          orderNo={pendingOrder.orderNo}
          amount={pendingOrder.amount}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      )}

      {showChartSelection && pendingOrder && (
        <ChartSelectionModal
          reportType={pendingOrder.reportType}
          isPaid={true}
          onSelect={handleChartSelect}
          onCancel={handleChartSelectCancel}
        />
      )}
    </div>
  );
}