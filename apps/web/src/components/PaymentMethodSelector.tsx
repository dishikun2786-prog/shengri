'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { configApi, orderApi, cardKeyApi, paymentApi } from '@/lib/api';
import QRCode from 'qrcode';

interface PaymentMethod {
  key: string;
  label: string;
  sortOrder: number;
}

const WechatIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#07c160">
    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05a6.127 6.127 0 0 1-.258-1.736c0-3.64 3.45-6.592 7.706-6.592.256 0 .507.017.756.04C16.792 4.351 13.098 2.188 8.691 2.188zm7.245 15.61a.28.28 0 0 1-.143.047.286.286 0 0 1-.283-.283c0-.063.024-.124.043-.183l.333-1.262a.524.524 0 0 0-.183-.568C14.146 14.27 13.1 12.572 13.1 10.678c0-3.206 3.1-5.806 6.918-5.806S26.935 7.472 26.935 10.678s-3.098 5.807-6.917 5.807a8.49 8.49 0 0 1-2.426-.347.733.733 0 0 0-.612.084l-1.044.576z" transform="scale(0.92) translate(0, 1)" />
  </svg>
);

const AlipayIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#1677ff">
    <path d="M21.422 14.762c-1.476-.47-3.292-1.066-5.344-1.762a14.9 14.9 0 0 0 1.643-4h-3.72V7.5h4.5V6.75h-4.5V4.5h-1.973s-.052.354-.052.75v1.5h-4.5V7.5h4.5V9h-3.6v.75h8.437a12.2 12.2 0 0 1-1.205 2.863c-1.745-.56-3.362-.96-4.497-.96-2.296 0-3.861 1.264-3.861 3.037 0 2.255 2.34 3.31 5.106 3.31 1.854 0 3.828-.675 5.364-1.914.916.563 1.737 1.083 2.373 1.556L21.422 14.762zM8.4 17.3c-2.04 0-3.15-.6-3.15-1.613 0-.87.81-1.688 2.138-1.688 1.346 0 3.17.488 5.085 1.307A8.5 8.5 0 0 1 8.4 17.3z" />
    <rect x="1" y="1" width="22" height="22" rx="4" fill="none" stroke="#1677ff" strokeWidth="1.5" />
  </svg>
);

const BalanceIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#c44520" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
  </svg>
);

const CardKeyIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#dca310" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const METHOD_ICONS: Record<string, React.ReactNode> = {
  wechat: <WechatIcon />,
  alipay: <AlipayIcon />,
  balance: <BalanceIcon />,
  card_key: <CardKeyIcon />,
};

const FallbackIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

interface Props {
  orderNo: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

type PayState = 'select' | 'wechat_qr' | 'alipay_redirect' | 'polling';

export default function PaymentMethodSelector({ orderNo, amount, onSuccess, onCancel }: Props) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [cardCode, setCardCode] = useState('');
  const [payState, setPayState] = useState<PayState>('select');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([
      configApi.getPaymentMethods().then((r) => r.data),
      cardKeyApi.getBalance().then((r) => r.data.balance).catch(() => null),
    ]).then(([m, b]) => {
      setMethods(m);
      if (m.length > 0) setSelected(m[0].key);
      setBalance(b);
      setLoading(false);
    });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await paymentApi.queryStatus(orderNo);
        if (res.data.isPaid) {
          if (pollRef.current) clearInterval(pollRef.current);
          onSuccess();
        }
      } catch { /* ignore polling errors */ }
    }, 2000);
  }, [orderNo, onSuccess]);

  const handlePay = async () => {
    if (!selected || !orderNo) return;
    setPaying(true);
    setError(null);

    try {
      if (selected === 'balance') {
        await orderApi.payWithBalance(orderNo);
        onSuccess();
      } else if (selected === 'card_key') {
        if (!cardCode.trim()) {
          setError('请输入卡密兑换码');
          setPaying(false);
          return;
        }
        try {
          await cardKeyApi.redeem(cardCode.trim());
        } catch (redeemErr: any) {
          setError(redeemErr?.response?.data?.message || '卡密兑换失败');
          setPaying(false);
          return;
        }
        try {
          await orderApi.payWithBalance(orderNo);
          onSuccess();
        } catch (payErr: any) {
          setError(`卡密已兑换成功，但${payErr?.response?.data?.message || '余额支付失败'}。请前往个人中心查看余额后重试。`);
          setPaying(false);
          return;
        }
      } else if (selected === 'wechat') {
        try {
          const res = await paymentApi.createWechatPay(orderNo, 'native');
          const { codeUrl } = res.data;
          if (codeUrl) {
            const dataUrl = await QRCode.toDataURL(codeUrl, { width: 256, margin: 2 });
            setQrDataUrl(dataUrl);
            setPayState('wechat_qr');
            startPolling();
          } else {
            setError('微信支付返回异常，请重试');
          }
        } catch (err: any) {
          setError(err?.response?.data?.message || '微信支付发起失败');
        }
        setPaying(false);
        return;
      } else if (selected === 'alipay') {
        try {
          const res = await paymentApi.createAlipayPay(orderNo, 'page');
          const { formHtml } = res.data;
          if (formHtml) {
            setPayState('alipay_redirect');
            startPolling();
            const newWin = window.open('', '_blank');
            if (newWin) {
              newWin.document.write(formHtml);
              newWin.document.close();
            } else {
              const div = document.createElement('div');
              div.innerHTML = formHtml;
              document.body.appendChild(div);
              const form = div.querySelector('form');
              if (form) form.submit();
            }
          } else {
            setError('支付宝返回异常，请重试');
          }
        } catch (err: any) {
          setError(err?.response?.data?.message || '支付宝发起失败');
        }
        setPaying(false);
        return;
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || '支付失败');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center animate-fade-in">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center animate-slide-up shadow-lg">
          <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-ink-500 text-sm mt-3">加载支付方式...</p>
        </div>
      </div>
    );
  }

  if (payState === 'wechat_qr' && qrDataUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fade-in" onClick={onCancel}>
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-lg overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
          <div className="bg-gradient-to-r from-[#07c160] to-[#06ad56] px-6 py-4">
            <h3 className="text-white font-bold text-lg font-kai">微信扫码支付</h3>
            <p className="text-white/80 text-sm mt-1">¥{amount.toFixed(2)}</p>
          </div>
          <div className="p-6 flex flex-col items-center">
            <img src={qrDataUrl} alt="微信支付二维码" className="w-56 h-56 rounded-xl" />
            <p className="text-ink-500 text-sm mt-4">请使用微信扫描二维码完成支付</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="animate-spin w-4 h-4 border-2 border-[#07c160] border-t-transparent rounded-full" />
              <span className="text-xs text-ink-400">等待支付结果...</span>
            </div>
          </div>
          <div className="px-6 pb-6">
            <button onClick={onCancel} className="w-full py-3 rounded-xl border border-ink-200 text-ink-500 hover:bg-ink-50 transition-colors text-sm font-medium">
              取消支付
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (payState === 'alipay_redirect') {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fade-in" onClick={onCancel}>
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-lg overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
          <div className="bg-gradient-to-r from-[#1677ff] to-[#1060d0] px-6 py-4">
            <h3 className="text-white font-bold text-lg font-kai">支付宝支付</h3>
            <p className="text-white/80 text-sm mt-1">¥{amount.toFixed(2)}</p>
          </div>
          <div className="p-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <AlipayIcon />
            </div>
            <p className="text-ink-600 text-sm text-center">已跳转到支付宝支付页面</p>
            <p className="text-ink-400 text-xs mt-1 text-center">完成支付后此页面将自动更新</p>
            <div className="flex items-center gap-2 mt-4">
              <div className="animate-spin w-4 h-4 border-2 border-[#1677ff] border-t-transparent rounded-full" />
              <span className="text-xs text-ink-400">等待支付结果...</span>
            </div>
          </div>
          <div className="px-6 pb-6">
            <button onClick={onCancel} className="w-full py-3 rounded-xl border border-ink-200 text-ink-500 hover:bg-ink-50 transition-colors text-sm font-medium">
              取消支付
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fade-in" onClick={onCancel}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-lg overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-primary-600 to-gold-600 px-6 py-4">
          <h3 className="text-white font-bold text-lg font-kai">选择支付方式</h3>
          <p className="text-white/80 text-sm mt-1">
            订单金额：<span className="font-bold text-white">¥{amount.toFixed(2)}</span>
          </p>
        </div>

        <div className="p-6 space-y-3">
          {methods.map((m, i) => (
            <button
              key={m.key}
              onClick={() => setSelected(m.key)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all animate-slide-up ${
                selected === m.key
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-ink-100 hover:border-ink-200'
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="flex-shrink-0">{METHOD_ICONS[m.key] || <FallbackIcon />}</span>
              <div className="flex-1 text-left">
                <span className="font-medium text-ink-700">{m.label}</span>
                {m.key === 'balance' && balance !== null && (
                  <span className="text-xs text-ink-400 ml-2">
                    (余额: ¥{Number(balance).toFixed(2)})
                  </span>
                )}
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selected === m.key ? 'border-primary-500 bg-primary-500' : 'border-ink-300'
                }`}
              >
                {selected === m.key && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          ))}

          {methods.length === 0 && (
            <div className="text-center text-ink-400 py-4">暂无可用支付方式，请联系客服</div>
          )}

          {selected === 'card_key' && (
            <div className="mt-2">
              <input
                type="text"
                placeholder="请输入卡密兑换码"
                value={cardCode}
                onChange={(e) => setCardCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-ink-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
          )}

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-ink-200 text-ink-500 hover:bg-ink-50 transition-colors text-sm font-medium"
          >
            取消
          </button>
          <button
            onClick={handlePay}
            disabled={paying || !selected || methods.length === 0}
            className="flex-1 py-3 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-bold disabled:opacity-50"
          >
            {paying ? '处理中...' : '确认支付'}
          </button>
        </div>
      </div>
    </div>
  );
}
