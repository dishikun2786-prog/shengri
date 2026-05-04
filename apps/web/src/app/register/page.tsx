'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { dispatchAuthChange } from '@/components/AuthNav';

const USERNAME_HINT = '3–20 位字母、数字或下划线';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referrerId, setReferrerId] = useState<number | undefined>();

  const loadCaptcha = async () => {
    setError('');
    try {
      const { data } = await authApi.getCaptcha();
      setCaptchaId(data.captchaId);
      setCaptchaImage(data.image);
      setCaptchaInput('');
    } catch {
      setError('验证码加载失败，请稍后重试');
    }
  };

  useEffect(() => {
    loadCaptcha();
    // Read referrer from sessionStorage (set by share page or home page ?ref= param)
    try {
      const ref = sessionStorage.getItem('ref');
      if (ref) setReferrerId(parseInt(ref, 10) || undefined);
    } catch { /* noop */ }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== password2) {
      setError('两次输入的密码不一致');
      return;
    }
    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.register({
        username: username.trim(),
        password,
        captchaId,
        captcha: captchaInput.trim(),
        referrerId,
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      try { sessionStorage.removeItem('ref'); } catch { /* noop */ }
      dispatchAuthChange();
      router.push('/');
      router.refresh();
    } catch (err: any) {
      const body = err.response?.data;
      const msg = Array.isArray(body?.message)
        ? body.message.join('；')
        : body?.message || body?.error || '注册失败';
      setError(typeof msg === 'string' ? msg : '注册失败');
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card">
        <div className="text-center mb-8">
          <span className="text-3xl">☯</span>
          <h1 className="text-2xl font-bold font-kai text-primary-800 mt-2">用户注册</h1>
          <p className="text-sm text-ink-500 mt-1">
            {USERNAME_HINT} · 需完成图形验证码（未使用短信验证）
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg py-2 px-3">{error}</p>
          )}
          <div>
            <label className="block text-sm text-ink-500 mb-1">用户名</label>
            <input
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]{3,20}"
              title={USERNAME_HINT}
              placeholder="例如 zhangsan"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-500 mb-1">密码</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm text-ink-500 mb-1">确认密码</label>
            <input
              type="password"
              className="input-field"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm text-ink-500 mb-1">验证码</label>
            <div className="flex gap-3 items-center flex-wrap">
              {captchaImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={captchaImage}
                  alt="验证码"
                  className="h-11 rounded-lg border border-ink-200 bg-white"
                />
              ) : (
                <div className="h-11 w-[120px] rounded-lg bg-ink-100 animate-pulse" />
              )}
              <button
                type="button"
                onClick={loadCaptcha}
                className="text-sm text-primary-600 hover:underline whitespace-nowrap"
              >
                换一张
              </button>
            </div>
            <input
              className="input-field mt-2"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              required
              placeholder="输入图中字符"
              autoComplete="off"
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading || !captchaId}>
            {loading ? '注册中…' : '注册'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-500 mt-6">
          已有账号？{' '}
          <Link href="/login" className="text-primary-600 font-medium hover:underline">
            去登录
          </Link>
        </p>
      </div>
    </div>
  );
}
