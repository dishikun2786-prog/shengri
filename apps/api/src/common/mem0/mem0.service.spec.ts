/**
 * Mem0Service 单元测试
 * 覆盖: addMemory 重试逻辑、searchMultiLayer 超时隔离、cleanSessionMemories
 */

import { Mem0Service, LayeredSearchResult } from '../../common/mem0/mem0.service';
import { ConfigService } from '@nestjs/config';

// Mock the mem0ai/oss module
jest.mock('mem0ai/oss', () => {
  const mockMemory = {
    add: jest.fn(),
    search: jest.fn(),
    getAll: jest.fn(),
    delete: jest.fn(),
  };
  return { Memory: jest.fn(() => mockMemory) };
});

describe('Mem0Service', () => {
  let service: Mem0Service;
  let mockConfig: Partial<ConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfig = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          MEM0_LLM_PROVIDER: 'openai',
          MEM0_LLM_MODEL: 'deepseek-v4-flash',
          DEEPSEEK_API_KEY: 'test-key',
          DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
          MEM0_EMBEDDING_PROVIDER: 'openai',
          MEM0_EMBEDDING_MODEL: 'text-embedding-3-small',
          OPENAI_API_KEY: 'test-key',
          QDRANT_URL: 'http://localhost:6333',
        };
        return config[key] || defaultValue;
      }),
    };

    service = new Mem0Service(mockConfig as ConfigService);
    await service.onModuleInit();
  });

  describe('addMemory', () => {
    it('should return null when not initialized', async () => {
      const uninitService = new Mem0Service(mockConfig as ConfigService);
      const result = await uninitService.addMemory([{ role: 'user', content: 'hello' }], { userId: 'user_1' });
      expect(result).toBeNull();
    });

    it('should retry on failure and succeed', async () => {
      const { Memory } = require('mem0ai/oss');
      const mockInstance = Memory.mock.results[0].value;
      mockInstance.add
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce({ id: 'mem_123' });

      const result = await service.addMemory(
        [{ role: 'user', content: 'hello' }],
        { userId: 'user_1' },
        1, // 1 retry
      );

      expect(mockInstance.add).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ id: 'mem_123' });
    });

    it('should return null after exhausting retries', async () => {
      const { Memory } = require('mem0ai/oss');
      const mockInstance = Memory.mock.results[0].value;
      mockInstance.add.mockRejectedValue(new Error('persistent failure'));

      const result = await service.addMemory(
        [{ role: 'user', content: 'hello' }],
        { userId: 'user_1' },
        2,
      );

      expect(mockInstance.add).toHaveBeenCalledTimes(3); // initial + 2 retries
      expect(result).toBeNull();
    });
  });

  describe('searchMultiLayer', () => {
    it('should return empty result when not initialized', async () => {
      const uninitService = new Mem0Service(mockConfig as ConfigService);
      const result = await uninitService.searchMultiLayer('test query', 'user_1');
      expect(result.userMemories).toEqual([]);
      expect(result.agentMemories).toEqual([]);
      expect(result.sessionMemories).toEqual([]);
    });

    it('should query all three layers in parallel', async () => {
      const { Memory } = require('mem0ai/oss');
      const mockInstance = Memory.mock.results[0].value;
      mockInstance.search.mockResolvedValue([{ id: 'mem_1', score: 0.9 }]);

      const result = await service.searchMultiLayer('财运', 'user_1', {
        agentId: 'bazi_advisor_v1',
        runId: 'session_123',
        userLimit: 3,
        agentLimit: 2,
        sessionLimit: 2,
      });

      expect(mockInstance.search).toHaveBeenCalledTimes(3);
    });

    it('should filter expired memories when filterExpired is true', async () => {
      const { Memory } = require('mem0ai/oss');
      const mockInstance = Memory.mock.results[0].value;
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000).toISOString(); // yesterday
      const futureDate = new Date(now.getTime() + 86400000).toISOString(); // tomorrow

      mockInstance.search.mockResolvedValue([
        { id: 'expired_mem', score: 0.9, metadata: { expirationDate: pastDate } },
        { id: 'valid_mem', score: 0.8, metadata: { expirationDate: futureDate } },
        { id: 'no_expiry', score: 0.7, metadata: {} },
      ]);

      const result = await service.searchMultiLayer('test', 'user_1', { filterExpired: true });

      expect(result.userMemories.length).toBe(2); // valid_mem + no_expiry
      expect(result.userMemories.find(m => m.id === 'expired_mem')).toBeUndefined();
    });

    it('should handle layer timeout gracefully', async () => {
      const { Memory } = require('mem0ai/oss');
      const mockInstance = Memory.mock.results[0].value;

      // Simulate one layer timing out
      mockInstance.search
        .mockRejectedValueOnce(new Error('user_TIMEOUT'))
        .mockResolvedValue([{ id: 'agent_mem', score: 0.8 }]);

      const result = await service.searchMultiLayer('test', 'user_1', {
        agentId: 'bazi_advisor_v1',
      });

      expect(result.userMemories).toEqual([]);
      expect(result.agentMemories).toHaveLength(1);
    });

    it('should deduplicate results across layers', async () => {
      const { Memory } = require('mem0ai/oss');
      const mockInstance = Memory.mock.results[0].value;
      const sameMem = { id: 'mem_shared', score: 0.9, memory: 'shared content' };

      mockInstance.search.mockResolvedValue([sameMem]);

      const result = await service.searchMultiLayer('test', 'user_1', {
        agentId: 'bazi_advisor_v1',
        runId: 'session_123',
      });

      const allIds = result.all.map((m: any) => m.id);
      const uniqueIds = new Set(allIds);
      expect(allIds.length).toBe(uniqueIds.size);
    });

    it('should sort results by score descending', async () => {
      const { Memory } = require('mem0ai/oss');
      const mockInstance = Memory.mock.results[0].value;

      mockInstance.search.mockResolvedValue([
        { id: 'low', score: 0.3 },
        { id: 'high', score: 0.95 },
        { id: 'mid', score: 0.6 },
      ]);

      const result = await service.searchMultiLayer('test', 'user_1');

      expect(result.all[0].id).toBe('high');
      expect(result.all[1].id).toBe('mid');
      expect(result.all[2].id).toBe('low');
    });
  });

  describe('deleteMemory', () => {
    it('should return false when not initialized', async () => {
      const uninitService = new Mem0Service(mockConfig as ConfigService);
      const result = await uninitService.deleteMemory('mem_123');
      expect(result).toBe(false);
    });

    it('should delete and return true on success', async () => {
      const { Memory } = require('mem0ai/oss');
      const mockInstance = Memory.mock.results[0].value;
      mockInstance.delete.mockResolvedValue(true);

      const result = await service.deleteMemory('mem_123');
      expect(result).toBe(true);
      expect(mockInstance.delete).toHaveBeenCalledWith('mem_123');
    });

    it('should return false on delete failure', async () => {
      const { Memory } = require('mem0ai/oss');
      const mockInstance = Memory.mock.results[0].value;
      mockInstance.delete.mockRejectedValue(new Error('delete failed'));

      const result = await service.deleteMemory('mem_123');
      expect(result).toBe(false);
    });
  });

  describe('cleanSessionMemories', () => {
    it('should delete all memories for a session', async () => {
      const { Memory } = require('mem0ai/oss');
      const mockInstance = Memory.mock.results[0].value;
      mockInstance.getAll.mockResolvedValue([
        { id: 'mem_s1' },
        { id: 'mem_s2' },
      ]);
      mockInstance.delete.mockResolvedValue(true);

      await service.cleanSessionMemories('session_42');

      expect(mockInstance.delete).toHaveBeenCalledTimes(2);
    });

    it('should handle empty session gracefully', async () => {
      const { Memory } = require('mem0ai/oss');
      const mockInstance = Memory.mock.results[0].value;
      mockInstance.getAll.mockResolvedValue([]);

      await expect(service.cleanSessionMemories('session_empty')).resolves.not.toThrow();
    });
  });

  describe('isReady', () => {
    it('should return true after successful init', () => {
      expect(service.isReady()).toBe(true);
    });

    it('should return false when init failed', async () => {
      const failingService = new Mem0Service({
        get: () => { throw new Error('bad config'); },
      } as any);
      await failingService.onModuleInit();
      expect(failingService.isReady()).toBe(false);
    });
  });
});