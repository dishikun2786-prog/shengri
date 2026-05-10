'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { dispatchAuthChange } from '@/components/AuthNav';

type LoginMode = 'password' | 'sms';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password login
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');

  // SMS login
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sendCooldown, setSendCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCooldown = () => {
    setSendCooldown(60);
    timerRef.current = setInterval(() => {
      setSendCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    const trimmed = phone.trim();
    if (!trimmed) {
      setError('请输入手机号');
      return;
    }
    if (sendCooldown > 0) return;
    setError('');
    try {
      // Check if phone is registered before sending code
      const { data: check } = await authApi.checkPhone(trimmed);
      if (!check.exists) {
        router.push(`/register?phone=${encodeURIComponent(trimmed)}`);
        return;
      }
      await authApi.sendSmsCode(trimmed);
      startCooldown();
    } catch (err: any) {
      setError(err.response?.data?.message || '发送失败，请稍后重试');
    }
  };

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login({ account: account.trim(), password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      dispatchAuthChange();
      router.push('/');
      router.refresh();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        '登录失败，请检查账号与密码';
      setError(typeof msg === 'string' ? msg : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSmsLogin = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedPhone = phone.trim();
    const trimmedCode = code.trim();
    if (!trimmedPhone || !trimmedCode) {
      setError('请输入手机号和验证码');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.smsLogin(trimmedPhone, trimmedCode);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      dispatchAuthChange();
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.message || '验证码登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card">
        <div className="text-center mb-8">
          <span className="text-3xl">☯</span>
          <h1 className="text-2xl font-bold font-kai text-primary-800 mt-2">账号登录</h1>
        </div>

        {/* Mode Tabs */}
        <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode('password'); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === 'password'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            密码登录
          </button>
          <button
            type="button"
            onClick={() => { setMode('sms'); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === 'sms'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            短信登录
          </button>
        </div>

        {error && (
          <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg py-2 px-3 mb-4">{error}</p>
        )}

        {/* Password Login Form */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-ink-500 mb-1">账号</label>
              <input
                className="input-field"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                autoComplete="username"
                required
                placeholder="用户名 / 手机号 / 邮箱"
              />
            </div>
            <div>
              <label className="block text-sm text-ink-500 mb-1">密码</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? '登录中…' : '登录'}
            </button>
          </form>
        )}

        {/* SMS Login Form */}
        {mode === 'sms' && (
          <form onSubmit={handleSmsLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-ink-500 mb-1">手机号</label>
              <input
                type="tel"
                className="input-field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="输入手机号"
                maxLength={15}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-ink-500 mb-1">验证码</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  className="input-field flex-1"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6位验证码"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendCooldown > 0}
                  className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    sendCooldown > 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  {sendCooldown > 0 ? `${sendCooldown}s` : '获取验证码'}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? '登录中…' : '验证码登录'}
            </button>
            <p className="text-xs text-ink-400 text-center">
              未注册手机号将跳转至注册页面
            </p>
          </form>
        )}

        <p className="text-center text-sm text-ink-500 mt-6">
          还没有账号？{' '}
          <Link href="/register" className="text-primary-600 font-medium hover:underline">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}
