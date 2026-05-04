import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MemoryType = 'profile' | 'preference' | 'feedback' | 'analysis' | 'temporary';

export interface MemoryMetadata {
  memoryType?: MemoryType;
  expirationDate?: string; // ISO date, null = permanent
  reportType?: string;
  sessionId?: number;
  feedbackScore?: number;
  [key: string]: any;
}

export interface AddMemoryOptions {
  userId?: string;
  agentId?: string;
  runId?: string;
  metadata?: MemoryMetadata;
}

export interface SearchMultiLayerOptions {
  agentId?: string;
  runId?: string;
  userLimit?: number;
  agentLimit?: number;
  sessionLimit?: number;
  filterExpired?: boolean;
}

export interface LayeredSearchResult {
  userMemories: any[];
  agentMemories: any[];
  sessionMemories: any[];
  all: any[];
}

@Injectable()
export class Mem0Service implements OnModuleInit {
  private readonly logger = new Logger(Mem0Service.name);
  private memory: any = null;
  private initialized = false;

  constructor(private config: ConfigService) {}

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
    let timeoutRef: NodeJS.Timeout | null = null;
    try {
      const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutRef = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      });
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutRef) clearTimeout(timeoutRef);
    }
  }

  async onModuleInit() {
    try {
      const embedderProvider = this.config.get('MEM0_EMBEDDING_PROVIDER', 'ollama');
      const embedderConfig: Record<string, any> = {
        model: this.config.get('MEM0_EMBEDDING_MODEL', 'nomic-embed-text'),
      };
      if (embedderProvider === 'ollama') {
        embedderConfig.url = this.config.get('MEM0_EMBEDDING_BASE_URL', 'http://localhost:11434');
        embedderConfig.embeddingDims = Number(this.config.get('MEM0_EMBEDDING_DIMS', '768'));
      } else {
        embedderConfig.apiKey = this.config.get('MEM0_EMBEDDING_API_KEY', '') || this.config.get('OPENAI_API_KEY', '');
        const baseUrl = this.config.get('MEM0_EMBEDDING_BASE_URL');
        if (baseUrl) embedderConfig.baseURL = baseUrl;
      }

      const { Memory } = await import('mem0ai/oss');
      this.memory = new Memory({
        llm: {
          provider: this.config.get('MEM0_LLM_PROVIDER', 'openai'),
          config: {
            model: this.config.get('MEM0_LLM_MODEL', 'deepseek-v4-flash'),
            apiKey: this.config.get('DEEPSEEK_API_KEY', ''),
            baseURL: this.config.get('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
          },
        },
        embedder: {
          provider: embedderProvider,
          config: embedderConfig,
        },
        vectorStore: {
          provider: 'qdrant',
          config: {
            url: this.config.get('QDRANT_URL', 'http://localhost:6333'),
            collectionName: 'shengri_memories',
          },
        },
      });
      this.initialized = true;
      this.logger.log('Mem0 service initialized successfully');
    } catch (error) {
      this.logger.warn(`Mem0 initialization failed (non-fatal): ${error.message}`);
    }
  }

  async addMemory(
    messages: Array<{ role: string; content: string }>,
    options: AddMemoryOptions,
    retries = 1,
  ): Promise<any> {
    if (!this.initialized || !this.memory) {
      this.logger.warn('Mem0 not initialized, skipping addMemory');
      return null;
    }

    // Guard against malformed inputs
    if (!options || (!options.userId && !options.agentId && !options.runId)) {
      this.logger.warn('addMemory called without any identifier (userId/agentId/runId), skipping');
      return null;
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      this.logger.warn('addMemory called with empty messages, skipping');
      return null;
    }

    const memOptions: Record<string, any> = {};
    if (options.userId) memOptions.userId = options.userId;
    if (options.agentId) memOptions.agentId = options.agentId;
    if (options.runId) memOptions.runId = options.runId;
    if (options.metadata) memOptions.metadata = options.metadata;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.memory.add(messages, memOptions);
      } catch (error) {
        if (attempt < retries) {
          this.logger.warn(`Mem0 addMemory attempt ${attempt + 1} failed, retrying...`);
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        } else {
          this.logger.error(`Mem0 addMemory failed after ${retries + 1} attempts: ${error.message}`);
          return null;
        }
      }
    }
  }

  /** Store User-layer profile memory (permanent, cross-report) */
  async addUserProfile(
    userId: string,
    profileContent: string,
    metadata?: Record<string, any>,
  ): Promise<any> {
    return this.addMemory(
      [{ role: 'system', content: profileContent }],
      {
        userId,
        metadata: { memoryType: 'profile', ...metadata },
      },
    );
  }

  /** Store Agent-layer learning memory (global AI behavior) */
  async addAgentLearning(
    agentId: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<any> {
    return this.addMemory(
      [{ role: 'system', content }],
      {
        agentId,
        metadata: { memoryType: 'feedback', ...metadata },
      },
    );
  }

  /** Search a single layer */
  async searchMemory(
    query: string,
    options: { userId?: string; agentId?: string; runId?: string },
    topK = 5,
  ): Promise<any[]> {
    if (!this.initialized || !this.memory) return [];

    const filters: Record<string, any> = {};
    if (options.userId) filters.user_id = options.userId;
    if (options.agentId) filters.agent_id = options.agentId;
    if (options.runId) filters.run_id = options.runId;
    const searchOptions: Record<string, any> = { limit: topK, filters };

    try {
      const results = await this.memory.search(query, searchOptions);
      return results?.results || results || [];
    } catch (error) {
      this.logger.error(`Mem0 searchMemory failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Multi-layer combined search: queries User + Agent + Session layers in parallel,
   * filters expired memories, deduplicates, and sorts by score.
   */
  async searchMultiLayer(
    query: string,
    userId: string,
    options?: SearchMultiLayerOptions,
  ): Promise<LayeredSearchResult> {
    if (!this.initialized || !this.memory) {
      return { userMemories: [], agentMemories: [], sessionMemories: [], all: [] };
    }

    const {
      agentId = 'bazi_advisor_v1',
      runId,
      userLimit = 3,
      agentLimit = 2,
      sessionLimit = 2,
      filterExpired = true,
    } = options || {};

    const searchWithFallback = async (
      task: Promise<any[]>,
      layer: string,
      timeoutMs: number,
    ): Promise<any[]> => {
      try {
        return await this.withTimeout(task, timeoutMs, `${layer}_TIMEOUT`);
      } catch (error: any) {
        this.logger.warn(`Mem0 ${layer} degraded: ${error.message}`);
        return [];
      }
    };

    const [userMemories, agentMemories, sessionMemories] = await Promise.allSettled([
      searchWithFallback(this.searchMemory(query, { userId }, userLimit), 'user', 1200),
      agentId
        ? searchWithFallback(this.searchMemory(query, { agentId }, agentLimit), 'agent', 1200)
        : Promise.resolve([]),
      runId
        ? searchWithFallback(this.searchMemory(query, { runId }, sessionLimit), 'session', 1200)
        : Promise.resolve([]),
    ]);

    const safeUserMemories = userMemories.status === 'fulfilled' ? userMemories.value : [];
    const safeAgentMemories = agentMemories.status === 'fulfilled' ? agentMemories.value : [];
    const safeSessionMemories = sessionMemories.status === 'fulfilled' ? sessionMemories.value : [];

    const applyExpireFilter = (memories: any[]) => {
      if (!filterExpired) return memories;
      const now = new Date();
      return memories.filter((m) => {
        const exp = m.metadata?.expirationDate;
        return !exp || new Date(exp) > now;
      });
    };

    const filteredUser = applyExpireFilter(safeUserMemories);
    const filteredAgent = applyExpireFilter(safeAgentMemories);
    const filteredSession = applyExpireFilter(safeSessionMemories);

    const seenIds = new Set<string>();
    const all: any[] = [];
    for (const mem of [...filteredUser, ...filteredAgent, ...filteredSession]) {
      const id = mem.id || mem.memory || JSON.stringify(mem);
      if (!seenIds.has(id)) {
        seenIds.add(id);
        all.push(mem);
      }
    }
    all.sort((a, b) => (b.score || 0) - (a.score || 0));

    return {
      userMemories: filteredUser,
      agentMemories: filteredAgent,
      sessionMemories: filteredSession,
      all,
    };
  }

  async getMemories(options: { userId?: string; agentId?: string; runId?: string }): Promise<any[]> {
    if (!this.initialized || !this.memory) return [];

    const getOptions: Record<string, any> = {};
    if (options.userId) getOptions.user_id = options.userId;
    if (options.agentId) getOptions.agent_id = options.agentId;
    if (options.runId) getOptions.run_id = options.runId;

    try {
      const results = await this.memory.getAll(getOptions);
      return results?.results || results || [];
    } catch (error) {
      this.logger.error(`Mem0 getMemories failed: ${error.message}`);
      return [];
    }
  }

  async deleteMemory(memoryId: string): Promise<boolean> {
    if (!this.initialized || !this.memory) return false;
    try {
      await this.memory.delete(memoryId);
      return true;
    } catch (error) {
      this.logger.error(`Mem0 deleteMemory failed: ${error.message}`);
      return false;
    }
  }

  /** Clean all Session-layer memories for a given run_id */
  async cleanSessionMemories(runId: string): Promise<void> {
    if (!this.initialized || !this.memory) return;
    try {
      const memories = await this.getMemories({ runId });
      for (const mem of memories) {
        if (mem.id) await this.deleteMemory(mem.id);
      }
      this.logger.log(`Cleaned ${memories.length} session memories for run ${runId}`);
    } catch (error) {
      this.logger.warn(`Failed to clean session memories: ${error.message}`);
    }
  }

  isReady(): boolean {
    return this.initialized;
  }
}
