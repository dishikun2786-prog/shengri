import { randomUUID } from 'node:crypto';
import type { RememberParams, RecallParams, SearchResult, MemoryStatus, MemoryType } from './types.js';
import type { Embedder } from './embedding.js';
import { embedContent } from './embedding.js';
import { QdrantClientWrapper, contentHash } from './qdrant-client.js';
import { detectProjectPath } from './config.js';
import type { AppConfig } from './types.js';

export class MemoryManager {
  constructor(
    private qdrant: QdrantClientWrapper,
    private embedder: Embedder,
    private config: AppConfig,
  ) {}

  async remember(params: RememberParams): Promise<{ id: string; alreadyExists: boolean }> {
    const projectPath = params.projectPath || detectProjectPath();
    const title = params.title || params.content.slice(0, 80).replace(/\n/g, ' ');
    const hash = contentHash(projectPath + params.memoryType + params.content);
    const scope = params.userScope || (params.memoryType === 'user_profile' || params.memoryType === 'feedback' ? 'global' : 'project');

    // Check for existing memory with same content hash
    const existing = await this.qdrant.findByContentHash(hash, projectPath);
    if (existing) {
      // Update if content changed
      if (existing.payload.content !== params.content) {
        const vector = await embedContent(this.embedder, params.content, this.config.chunking);
        await this.qdrant.upsertPoints([{
          id: existing.id,
          vector,
          payload: {
            ...existing.payload,
            content: params.content,
            title,
            updated_at: Date.now(),
            tags: params.tags || existing.payload.tags,
          },
        }]);
      }
      return { id: existing.id, alreadyExists: true };
    }

    // New memory: embed and store
    const vector = await embedContent(this.embedder, params.content, this.config.chunking);
    const id = randomUUID();
    const now = Date.now();

    await this.qdrant.upsertPoints([{
      id,
      vector,
      payload: {
        project_path: projectPath,
        memory_type: params.memoryType,
        title,
        content: params.content,
        content_hash: hash,
        origin_session_id: params.sessionId || '',
        user_scope: scope,
        created_at: now,
        updated_at: now,
        tags: params.tags || [],
      },
    }]);

    return { id, alreadyExists: false };
  }

  async recall(params: RecallParams): Promise<SearchResult[]> {
    const projectPath = params.projectPath || detectProjectPath();
    const limit = Math.min(params.limit || 5, 20);

    // For cross-project queries (user_profile, feedback), don't filter by project
    const filters: any = {};

    if (params.memoryType) {
      filters.memoryType = params.memoryType;
    } else if (params.userScope === 'global') {
      // Only search global-scoped memories
      filters.userScope = 'global';
    } else {
      // Default: search project-specific + global for this project
    }

    const vector = await embedContent(this.embedder, params.query, this.config.chunking);

    // Search with project filter AND global scope (to get both project and global memories)
    const userScope = params.userScope || 'project';
    const [projectResults, globalResults] = await Promise.all([
      this.qdrant.search(vector, { ...filters, projectPath }, limit),
      !filters.memoryType
        ? this.qdrant.search(vector, { ...filters, userScope: 'global' }, Math.ceil(limit / 2))
        : Promise.resolve([] as SearchResult[]),
    ]);

    // Merge, deduplicate by ID, sort by score
    const seen = new Set<string>();
    const merged: SearchResult[] = [];
    for (const r of [...projectResults, ...globalResults]) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        merged.push(r);
      }
    }
    merged.sort((a, b) => b.score - a.score);
    return merged.slice(0, limit);
  }

  async forget(id: string): Promise<boolean> {
    return this.qdrant.deletePoint(id);
  }

  async status(): Promise<MemoryStatus> {
    const info = await this.qdrant.getCollectionInfo();
    const byProject = await this.qdrant.countByProject();
    const byTypeRaw = await this.qdrant.countByType();

    const byType = {
      user_profile: 0,
      project_context: 0,
      decision: 0,
      feedback: 0,
      reference: 0,
      ...byTypeRaw,
    } as Record<MemoryType, number>;

    return {
      collectionName: this.config.collectionName,
      totalPoints: info.pointsCount,
      byProject,
      byType,
      embeddingModel: this.embedder.modelName,
      embeddingDim: this.embedder.dimension,
      embeddingAvailable: this.embedder.available,
    };
  }

  async listProjects(): Promise<string[]> {
    return this.qdrant.listProjects();
  }
}
