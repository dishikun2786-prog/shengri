import { AuthProvider } from 'react-admin';

const API_URL = '/api/v1';

const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: username, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || '登录失败');
    }

    const { token, user } = await response.json();

    if (user.role !== 'admin' && user.role !== 'agent') {
      throw new Error('权限不足：仅管理员和代理可登录后台');
    }

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  logout: async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) {
      throw new Error('未登录');
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin' && user.role !== 'agent') {
      throw new Error('权限不足');
    }
  },

  checkError: async (error) => {
    if (error?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw new Error('会话过期，请重新登录');
    }
  },

  getIdentity: async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) throw new Error('未登录');
    const user = JSON.parse(userStr);
    return {
      id: user.id,
      fullName: user.nickname || user.phone || '管理员',
      avatar: user.avatarUrl,
    };
  },

  getPermissions: async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return [];
    const user = JSON.parse(userStr);
    if (user.role === 'admin') return 'admin';
    if (user.role === 'agent') return 'agent';
    return 'viewer';
  },
};

export default authProvider;
