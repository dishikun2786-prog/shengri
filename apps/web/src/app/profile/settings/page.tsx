'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { userApi, uploadApi, authApi } from '@/lib/api';
import { dispatchAuthChange } from '@/components/AuthNav';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [changingPwd, setChangingPwd] = useState(false);

  // Phone binding state
  const [userPhone, setUserPhone] = useState('');
  const [bindPhoneInput, setBindPhoneInput] = useState('');
  const [bindCode, setBindCode] = useState('');
  const [bindSendCooldown, setBindSendCooldown] = useState(0);
  const [bindMsg, setBindMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [binding, setBinding] = useState(false);
  const bindTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    userApi.getProfile()
      .then((res) => {
        const data = res.data;
        setNickname(data.nickname || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatarUrl || '');
        setAvatarPreview(data.avatarUrl || '');
        setUserPhone(data.phone || '');
      })
      .catch(() => {
        setMsg({ type: 'error', text: '加载失败' });
      })
      .finally(() => setLoading(false));
  }, [router]);

  // Cleanup bind timer on unmount
  useEffect(() => {
    return () => { if (bindTimerRef.current) clearInterval(bindTimerRef.current); };
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setUploadingAvatar(true);

    try {
      const res = await uploadApi.uploadAvatar(file);
      setAvatarUrl(res.data.url);
      setMsg(null);
    } catch (err) {
      setMsg({ type: 'error', text: '头像上传失败' });
      setAvatarPreview(avatarUrl);
    } finally {
      setUploadingAvatar(false);
    }

    e.target.value = '';
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      setPwdMsg({ type: 'error', text: '请填写完整' });
      return;
    }
    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: '新密码至少6位' });
      return;
    }
    setChangingPwd(true);
    setPwdMsg(null);
    try {
      await userApi.changePassword(oldPassword, newPassword);
      setPwdMsg({ type: 'success', text: '密码修改成功' });
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err?.response?.data?.message || '修改失败' });
    } finally {
      setChangingPwd(false);
    }
  };

  const startBindCooldown = () => {
    setBindSendCooldown(60);
    bindTimerRef.current = setInterval(() => {
      setBindSendCooldown((prev) => {
        if (prev <= 1) {
          if (bindTimerRef.current) clearInterval(bindTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleBindSendCode = async () => {
    const phone = bindPhoneInput.trim();
    if (!phone) {
      setBindMsg({ type: 'error', text: '请输入手机号' });
      return;
    }
    setBindMsg(null);
    try {
      await authApi.sendSmsCode(phone);
      startBindCooldown();
    } catch (err: any) {
      setBindMsg({ type: 'error', text: err.response?.data?.message || '发送失败' });
    }
  };

  const handleBindPhone = async () => {
    const phone = bindPhoneInput.trim();
    const code = bindCode.trim();
    if (!phone || !code) {
      setBindMsg({ type: 'error', text: '请输入手机号和验证码' });
      return;
    }
    setBinding(true);
    setBindMsg(null);
    try {
      const res = await authApi.bindPhone(phone, code);
      setUserPhone(res.data.phone || phone);
      setBindPhoneInput('');
      setBindCode('');
      setBindMsg({ type: 'success', text: '手机号绑定成功' });
      // Update localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          userData.phone = res.data.phone || phone;
          localStorage.setItem('user', JSON.stringify(userData));
        } catch {}
      }
    } catch (err: any) {
      setBindMsg({ type: 'error', text: err.response?.data?.message || '绑定失败' });
    } finally {
      setBinding(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setMsg(null);

    try {
      const res = await userApi.updateProfile({
        nickname: nickname.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl || undefined,
      });

      // Update localStorage user data
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          userData.nickname = nickname.trim();
          userData.avatarUrl = avatarUrl;
          localStorage.setItem('user', JSON.stringify(userData));
          dispatchAuthChange();
        } catch {}
      }

      setMsg({ type: 'success', text: '保存成功' });
      setTimeout(() => router.push('/profile'), 1500);
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full skeleton-shimmer" />
          <div className="h-4 w-32 rounded skeleton-shimmer" />
          <div className="h-3 w-48 rounded skeleton-shimmer mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => router.back()} className="text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-medium text-gray-800">个人资料</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-primary-500 text-sm font-medium disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto bg-white mt-4 rounded-xl">
        {/* Avatar */}
        <div className="px-4 py-5 flex items-center gap-4 border-b border-gray-50">
          <div className="relative">
            {avatarPreview ? (
              <div className="w-16 h-16 rounded-full overflow-hidden">
                <Image
                  src={avatarPreview}
                  alt="头像"
                  width={64}
                  height={64}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-2xl font-kai">
                {(nickname || 'U')[0].toUpperCase()}
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="px-4 py-1.5 text-sm text-primary-600 border border-primary-200 rounded-full hover:bg-primary-50 transition-colors disabled:opacity-50"
            >
              更换头像
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="text-xs text-gray-400 mt-1">支持 jpg/png 格式，建议 200x200</p>
          </div>
        </div>

        {/* Nickname */}
        <div className="px-4 py-4 border-b border-gray-50">
          <label className="text-sm text-gray-500 mb-2 block">昵称</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="给自己起个名字"
            maxLength={30}
            className="w-full px-0 py-2 text-base text-gray-800 border-0 border-b border-gray-100 focus:outline-none focus:border-primary-300 bg-transparent"
          />
        </div>

        {/* Bio */}
        <div className="px-4 py-4">
          <label className="text-sm text-gray-500 mb-2 block">个人简介</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="介绍一下自己吧"
            maxLength={200}
            rows={3}
            className="w-full px-0 py-2 text-sm text-gray-800 border-0 border-b border-gray-100 focus:outline-none focus:border-primary-300 bg-transparent resize-none"
          />
          <div className="text-right text-xs text-gray-400 mt-1">{bio.length}/200</div>
        </div>
      </div>

      {/* Phone Binding */}
      <div className="max-w-lg mx-auto bg-white mt-4 rounded-xl px-4 py-4">
        <h2 className="text-base font-medium text-gray-800 mb-4">绑定手机号</h2>
        {userPhone ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已绑定</p>
              <p className="text-base font-medium text-gray-800 mt-0.5">{userPhone}</p>
            </div>
            <button
              onClick={() => { setUserPhone(''); setBindMsg(null); }}
              className="text-sm text-primary-500 hover:text-primary-600"
            >
              更换
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500 mb-2 block">手机号</label>
              <input
                type="tel"
                value={bindPhoneInput}
                onChange={(e) => setBindPhoneInput(e.target.value)}
                placeholder="输入手机号"
                maxLength={15}
                className="w-full px-3 py-2 text-sm text-gray-800 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-300 bg-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-2 block">验证码</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={bindCode}
                  onChange={(e) => setBindCode(e.target.value)}
                  placeholder="6位验证码"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="flex-1 px-3 py-2 text-sm text-gray-800 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-300 bg-white"
                />
                <button
                  type="button"
                  onClick={handleBindSendCode}
                  disabled={bindSendCooldown > 0}
                  className={`shrink-0 px-4 py-2 text-sm rounded-lg transition-colors ${
                    bindSendCooldown > 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  {bindSendCooldown > 0 ? `${bindSendCooldown}s` : '获取验证码'}
                </button>
              </div>
            </div>
            <button
              onClick={handleBindPhone}
              disabled={binding}
              className="w-full py-2 text-sm text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {binding ? '绑定中...' : '确认绑定'}
            </button>
          </div>
        )}
        {bindMsg && (
          <div className={`mt-3 rounded-lg px-4 py-2 text-sm text-center ${
            bindMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {bindMsg.text}
          </div>
        )}
      </div>

      {/* Password Change */}
      <div className="max-w-lg mx-auto bg-white mt-4 rounded-xl px-4 py-4">
        <h2 className="text-base font-medium text-gray-800 mb-4">修改密码</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500 mb-2 block">当前密码</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="请输入当前密码"
              className="w-full px-3 py-2 text-sm text-gray-800 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-300 bg-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 mb-2 block">新密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="请输入新密码（至少6位）"
              className="w-full px-3 py-2 text-sm text-gray-800 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-300 bg-white"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={changingPwd}
            className="w-full py-2 text-sm text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {changingPwd ? '修改中...' : '修改密码'}
          </button>
        </div>
        {pwdMsg && (
          <div className={`mt-3 rounded-lg px-4 py-2 text-sm text-center ${
            pwdMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {pwdMsg.text}
          </div>
        )}
      </div>

      {msg && (
        <div className="max-w-lg mx-auto mt-4 px-4">
          <div className={`rounded-lg px-4 py-3 text-sm text-center ${
            msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {msg.text}
          </div>
        </div>
      )}
    </div>
  );
}
