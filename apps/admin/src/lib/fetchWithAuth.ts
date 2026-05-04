export function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  }).then((r) => {
    if (r.status === 401 || r.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/#/login';
      throw new Error('unauthorized');
    }
    if (!r.ok)
      return r.json().then((d: any) => {
        throw new Error(d.message || `HTTP ${r.status}`);
      });
    return r.json();
  });
}
