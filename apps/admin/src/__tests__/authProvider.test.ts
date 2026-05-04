import { describe, it, expect, vi, beforeEach } from 'vitest';
import authProvider from '../authProvider';

describe('authProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('login', () => {
    it('stores token and user on successful admin login', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          token: 'test-token-123',
          user: { id: 1, role: 'admin', nickname: '管理员', phone: '13800138000' },
        }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await authProvider.login({ username: '13800138000', password: 'pass123' });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ account: '13800138000', password: 'pass123' }),
        }),
      );
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token-123');
    });

    it('throws error when login fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: '密码错误' }),
      });

      await expect(authProvider.login({ username: '13800138000', password: 'wrong' }))
        .rejects.toThrow('密码错误');
    });

    it('rejects non-admin users', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          token: 'token',
          user: { id: 2, role: 'user', nickname: '普通用户' },
        }),
      });

      await expect(authProvider.login({ username: '13900139000', password: 'pass' }))
        .rejects.toThrow('权限不足：仅管理员可登录后台');
    });
  });

  describe('logout', () => {
    it('clears token and user from localStorage', async () => {
      localStorage.setItem('token', 'some-token');
      localStorage.setItem('user', '{}');

      await authProvider.logout({});

      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('checkAuth', () => {
    it('resolves when token and admin user exist', async () => {
      localStorage.setItem('token', 'valid-token');
      localStorage.setItem('user', JSON.stringify({ role: 'admin' }));

      await expect(authProvider.checkAuth({})).resolves.toBeUndefined();
    });

    it('rejects when no token', async () => {
      await expect(authProvider.checkAuth({})).rejects.toThrow('未登录');
    });

    it('rejects when user is not admin', async () => {
      localStorage.setItem('token', 'valid-token');
      localStorage.setItem('user', JSON.stringify({ role: 'user' }));

      await expect(authProvider.checkAuth({})).rejects.toThrow('权限不足');
    });
  });

  describe('checkError', () => {
    it('clears storage on 401 error', async () => {
      localStorage.setItem('token', 'token');
      localStorage.setItem('user', '{}');

      await expect(authProvider.checkError({ status: 401 })).rejects.toThrow('会话过期');
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });

    it('clears storage on 403 error', async () => {
      localStorage.setItem('token', 'token');

      await expect(authProvider.checkError({ status: 403 })).rejects.toThrow();
    });

    it('resolves for other errors', async () => {
      await expect(authProvider.checkError({ status: 500 })).resolves.toBeUndefined();
    });
  });

  describe('getIdentity', () => {
    it('returns user identity from localStorage', async () => {
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        nickname: '张三',
        phone: '13800138000',
        avatarUrl: 'https://example.com/avatar.jpg',
      }));

      const identity = await authProvider.getIdentity();

      expect(identity.id).toBe(1);
      expect(identity.fullName).toBe('张三');
    });

    it('falls back to phone when no nickname', async () => {
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        phone: '13800138000',
      }));

      const identity = await authProvider.getIdentity();
      expect(identity.fullName).toBe('13800138000');
    });

    it('throws when no user in storage', async () => {
      await expect(authProvider.getIdentity()).rejects.toThrow('未登录');
    });
  });

  describe('getPermissions', () => {
    it('returns ["admin"] for admin users', async () => {
      localStorage.setItem('user', JSON.stringify({ role: 'admin' }));
      const permissions = await authProvider.getPermissions({});
      expect(permissions).toEqual(['admin']);
    });

    it('returns ["viewer"] for non-admin users', async () => {
      localStorage.setItem('user', JSON.stringify({ role: 'user' }));
      const permissions = await authProvider.getPermissions({});
      expect(permissions).toEqual(['viewer']);
    });

    it('returns empty array when no user', async () => {
      const permissions = await authProvider.getPermissions({});
      expect(permissions).toEqual([]);
    });
  });
});
