'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { dispatchAuthChange } from '@/components/AuthNav';

export default function LoginPage() {
  const router = useRouter();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
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
        err.response?.data?.statusCode ||
        '登录失败，请检查账号与密码';
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
          <h1 className="text-2xl font-bold font-kai text-primary-800 mt-2">账号登录</h1>
          <p className="text-sm text-ink-500 mt-1">使用用户名、手机号或邮箱登录</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg py-2 px-3">{error}</p>
          )}
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
