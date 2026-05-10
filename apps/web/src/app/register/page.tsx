'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { dispatchAuthChange } from '@/components/AuthNav';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showAccountFields, setShowAccountFields] = useState(false);

  // Pre-fill phone from URL (redirected from login page)
  useEffect(() => {
    const phoneParam = searchParams?.get('phone');
    if (phoneParam) setPhone(phoneParam);
  }, [searchParams]);
  const [sendCooldown, setSendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
      await authApi.sendSmsCode(trimmed);
      setSuccess('验证码已发送');
      startCooldown();
    } catch (err: any) {
      setError(err?.response?.data?.message || '发送失败，请稍后重试');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedPhone = phone.trim();
    const trimmedCode = code.trim();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedPhone) {
      setError('请输入手机号');
      return;
    }
    if (!trimmedCode) {
      setError('请输入验证码');
      return;
    }

    // Validate username format if provided
    if (trimmedUsername && !/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) {
      setError('账号仅支持 3–20 位字母、数字或下划线');
      return;
    }

    // Validate password if provided
    if (trimmedPassword) {
      if (trimmedPassword.length < 6) {
        setError('密码至少需要6位');
        return;
      }
      if (trimmedPassword !== passwordConfirm) {
        setError('两次密码输入不一致');
        return;
      }
    }

    setLoading(true);
    try {
      const { data } = await authApi.smsLogin(
        trimmedPhone,
        trimmedCode,
        trimmedUsername || undefined,
        trimmedPassword || undefined,
      );
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      try { sessionStorage.removeItem('ref'); } catch { /* noop */ }
      dispatchAuthChange();
      if (data.isNewUser) {
        setSuccess('注册成功，欢迎加入生辰！');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 800);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      const body = err.response?.data;
      const msg = Array.isArray(body?.message)
        ? body.message.join('；')
        : body?.message || body?.error || '登录失败';
      setError(typeof msg === 'string' ? msg : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card">
        <div className="text-center mb-8">
          <span className="text-3xl">☯</span>
          <h1 className="text-2xl font-bold font-kai text-primary-800 mt-2">手机注册</h1>
          <p className="text-sm text-ink-500 mt-1">
            输入手机号获取验证码即可注册
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg py-2 px-3">{error}</p>
          )}
          {success && !error && (
            <p className="text-green-600 text-sm text-center bg-green-50 rounded-lg py-2 px-3">{success}</p>
          )}

          {/* Phone */}
          <div>
            <label className="block text-sm text-ink-500 mb-1">手机号</label>
            <input
              type="tel"
              className="input-field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="输入中国大陆手机号"
              maxLength={15}
              required
              autoComplete="tel"
            />
          </div>

          {/* Verification code */}
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
                className={`shrink-0 px-4 rounded-lg text-sm font-medium transition-colors ${
                  sendCooldown > 0
                    ? 'bg-ink-100 text-ink-400 cursor-not-allowed'
                    : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200'
                }`}
              >
                {sendCooldown > 0 ? `${sendCooldown}s` : '获取验证码'}
              </button>
            </div>
          </div>

          {/* Account & Password (optional, expandable) */}
          {!showAccountFields ? (
            <button
              type="button"
              onClick={() => setShowAccountFields(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              设置账号密码（可选，设置后可用密码登录）
            </button>
          ) : (
            <div className="space-y-4 p-4 bg-ink-50 rounded-xl border border-ink-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-600">设置账号密码</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountFields(false);
                    setUsername('');
                    setPassword('');
                    setPasswordConfirm('');
                  }}
                  className="text-xs text-ink-400 hover:text-ink-600"
                >
                  收起
                </button>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm text-ink-500 mb-1">账号</label>
                <input
                  type="text"
                  className="input-field"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="3–20位字母、数字或下划线"
                  minLength={3}
                  maxLength={20}
                  autoComplete="username"
                />
                <p className="text-xs text-ink-400 mt-1">
                  设置后可使用账号+密码方式登录
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm text-ink-500 mb-1">密码</label>
                <input
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少6位密码"
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              {/* Password Confirm */}
              {password && (
                <div>
                  <label className="block text-sm text-ink-500 mb-1">确认密码</label>
                  <input
                    type="password"
                    className={`input-field ${
                      passwordConfirm && password !== passwordConfirm
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : ''
                    }`}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="再次输入密码"
                    minLength={6}
                    autoComplete="new-password"
                  />
                  {passwordConfirm && password !== passwordConfirm && (
                    <p className="text-xs text-red-500 mt-1">两次密码输入不一致</p>
                  )}
                </div>
              )}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? '注册中…' : '注册 / 登录'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-400 mt-4">
          未注册手机号将自动创建账号。点击即表示同意
          <span className="text-ink-500"> 服务条款 </span>与
          <span className="text-ink-500"> 隐私政策</span>
        </p>

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
