import { describe, it, expect, vi, beforeEach } from 'vitest';
import dataProvider from '../dataProvider';

describe('dataProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
  });

  const mockFetch = (data: any, headers: Record<string, string> = {}) => {
    const headerMap = new Map(Object.entries(headers));
    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
      headers: {
        get: (k: string) => headerMap.get(k) ?? null,
        forEach: (cb: Function) => headerMap.forEach((v, k) => cb(v, k)),
        entries: () => headerMap.entries(),
        keys: () => headerMap.keys(),
        values: () => headerMap.values(),
        has: (k: string) => headerMap.has(k),
        [Symbol.iterator]: () => headerMap.entries(),
      },
    });
  };

  describe('getList', () => {
    it('builds correct query params', async () => {
      mockFetch(
        [{ id: 1, name: 'User 1' }],
        { 'Content-Range': 'users 0-24/100' },
      );

      const result = await dataProvider.getList('users', {
        pagination: { page: 1, perPage: 25 },
        sort: { field: 'id', order: 'DESC' },
        filter: { status: 1 },
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(100);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const url = (global.fetch as any).mock.calls[0][0];
      expect(url).toContain('/api/v1/admin/users?');
    });
  });

  describe('getOne', () => {
    it('fetches a single resource', async () => {
      mockFetch({ id: 42, name: 'Product' });

      const result = await dataProvider.getOne('products', { id: 42 });

      expect(result.data.id).toBe(42);
      expect(result.data.name).toBe('Product');
    });
  });

  describe('create', () => {
    it('posts new resource data', async () => {
      mockFetch({ id: 99, name: 'New Rule' });

      const result = await dataProvider.create('rules', {
        data: { name: 'New Rule', module: 'ten_gods' },
      });

      expect(result.data.id).toBe(99);
    });
  });

  describe('update', () => {
    it('puts updated resource data', async () => {
      mockFetch({ id: 1, name: 'Updated' });

      const result = await dataProvider.update('users', {
        id: 1,
        data: { name: 'Updated' },
        previousData: { id: 1, name: 'Original' },
      });

      expect(result.data.name).toBe('Updated');
    });
  });

  describe('delete', () => {
    it('deletes a resource', async () => {
      mockFetch({ id: 1 });

      const result = await dataProvider.delete('orders', {
        id: 1,
        previousData: { id: 1 },
      });

      expect(result.data.id).toBe(1);
    });
  });

  describe('getMany', () => {
    it('fetches multiple resources by ids', async () => {
      mockFetch([{ id: 1 }, { id: 2 }]);

      const result = await dataProvider.getMany('users', { ids: [1, 2] });

      expect(result.data).toHaveLength(2);
    });
  });

  describe('authorization', () => {
    it('includes Bearer token in requests', async () => {
      mockFetch({ id: 1 });

      await dataProvider.getOne('users', { id: 1 });

      const call = (global.fetch as any).mock.calls[0];
      const options = call[1];
      const headers = options.headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
    });
  });
});
