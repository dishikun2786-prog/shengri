import { DataProvider, fetchUtils } from 'react-admin';

const API_URL = '/api/v1/admin';

const httpClient = (url: string, options: any = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetchUtils.fetchJson(url, { ...options, headers });
};

const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    const { page = 1, perPage = 25 } = params.pagination || {};
    const { field = 'id', order = 'DESC' } = params.sort || {};
    const rangeStart = (page - 1) * perPage;
    const rangeEnd = page * perPage - 1;

    const query = new URLSearchParams({
      sort: JSON.stringify([field, order]),
      range: JSON.stringify([rangeStart, rangeEnd]),
      filter: JSON.stringify(params.filter),
    });

    const { headers, json } = await httpClient(`${API_URL}/${resource}?${query}`);
    const contentRange = headers.get('Content-Range') || '';
    const total = parseInt(contentRange.split('/').pop() || '0', 10);

    return { data: json, total };
  },

  getOne: async (resource, params) => {
    const { json } = await httpClient(`${API_URL}/${resource}/${params.id}`);
    return { data: json };
  },

  getMany: async (resource, params) => {
    const query = new URLSearchParams({
      filter: JSON.stringify({ id: params.ids }),
    });
    const { json } = await httpClient(`${API_URL}/${resource}?${query}`);
    return { data: json };
  },

  getManyReference: async (resource, params) => {
    const { page = 1, perPage = 25 } = params.pagination || {};
    const { field = 'id', order = 'DESC' } = params.sort || {};
    const rangeStart = (page - 1) * perPage;
    const rangeEnd = page * perPage - 1;

    const query = new URLSearchParams({
      sort: JSON.stringify([field, order]),
      range: JSON.stringify([rangeStart, rangeEnd]),
      filter: JSON.stringify({ ...params.filter, [params.target]: params.id }),
    });

    const { headers, json } = await httpClient(`${API_URL}/${resource}?${query}`);
    const contentRange = headers.get('Content-Range') || '';
    const total = parseInt(contentRange.split('/').pop() || '0', 10);

    return { data: json, total };
  },

  create: async (resource, params) => {
    const { json } = await httpClient(`${API_URL}/${resource}`, {
      method: 'POST',
      body: JSON.stringify(params.data),
    });
    return { data: json };
  },

  update: async (resource, params) => {
    const { json } = await httpClient(`${API_URL}/${resource}/${params.id}`, {
      method: 'PUT',
      body: JSON.stringify(params.data),
    });
    return { data: json };
  },

  updateMany: async (resource, params) => {
    const responses = await Promise.all(
      params.ids.map((id) =>
        httpClient(`${API_URL}/${resource}/${id}`, {
          method: 'PUT',
          body: JSON.stringify(params.data),
        }),
      ),
    );
    return { data: responses.map(({ json }) => json.id) };
  },

  delete: async (resource, params) => {
    const { json } = await httpClient(`${API_URL}/${resource}/${params.id}`, {
      method: 'DELETE',
    });
    return { data: json };
  },

  deleteMany: async (resource, params) => {
    const responses = await Promise.all(
      params.ids.map((id) =>
        httpClient(`${API_URL}/${resource}/${id}`, { method: 'DELETE' }),
      ),
    );
    return { data: responses.map(({ json }) => json.id) };
  },
};

export default dataProvider;
