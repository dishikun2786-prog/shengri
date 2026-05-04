'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { paymentApi } from '@/lib/api';

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderNo = searchParams?.get('orderNo') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'error'>('loading');
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  useEffect(() => {
    if (!orderNo) {
      setStatus('error');
      return;
    }

    let retries = 0;
    const maxRetries = 15;

    const check = async () => {
      try {
        const res = await paymentApi.queryStatus(orderNo);
        setPaymentInfo(res.data);
        if (res.data.isPaid) {
          setStatus('success');
          return;
        }
        retries++;
        if (retries < maxRetries) {
          setTimeout(check, 2000);
        } else {
          setStatus('pending');
        }
      } catch {
        setStatus('error');
      }
    };

    check();
  }, [orderNo]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ink-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="animate-spin w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full mx-auto" />
          <h2 className="font-kai text-xl text-ink-800 mt-5">查询支付结果中...</h2>
          <p className="text-ink-400 text-sm mt-2">订单号：{orderNo}</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ink-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-kai text-xl text-ink-800 mt-5">支付成功</h2>
          <p className="text-ink-400 text-sm mt-2">订单号：{orderNo}</p>
          {paymentInfo && (
            <p className="text-ink-500 text-sm mt-1">
              支付金额：¥{Number(paymentInfo.amount).toFixed(2)}
            </p>
          )}
          <div className="mt-6 space-y-3">
            <button
              onClick={() => router.push('/profile')}
              className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors"
            >
              查看我的报告
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 rounded-xl border border-ink-200 text-ink-500 hover:bg-ink-50 transition-colors text-sm"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ink-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="font-kai text-xl text-ink-800 mt-5">等待支付确认</h2>
          <p className="text-ink-400 text-sm mt-2">
            支付可能需要一点时间处理，请稍后刷新查看。
          </p>
          <p className="text-ink-300 text-xs mt-1">订单号：{orderNo}</p>
          <div className="mt-6 space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors"
            >
              重新查询
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 rounded-xl border border-ink-200 text-ink-500 hover:bg-ink-50 transition-colors text-sm"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center animate-slide-up">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="font-kai text-xl text-ink-800 mt-5">查询失败</h2>
        <p className="text-ink-400 text-sm mt-2">
          无法获取支付结果，请返回订单页面查看。
        </p>
        <div className="mt-6">
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-ink-50 to-white flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}
