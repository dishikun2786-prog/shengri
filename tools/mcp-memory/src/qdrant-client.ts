import { QdrantClient as QdrantJS } from '@qdrant/js-client-rest';
import type { QdrantPoint, SearchResult, MemoryType } from './types.js';
import { createHash } from 'node:crypto';

export interface SearchFilters {
  projectPath?: string;
  memoryType?: MemoryType;
  userScope?: 'global' | 'project';
  contentHash?: string;
}

export class QdrantClientWrapper {
  private client: QdrantJS;
  private collectionName: string;

  constructor(url: string, collectionName: string) {
    this.client = new QdrantJS({ url });
    this.collectionName = collectionName;
  }

  async ensureCollection(vectorSize: number): Promise<void> {
    try {
      const { collections } = await this.client.getCollections();
      const exists = collections.some((c: any) => c.name === this.collectionName);
      if (exists) {
        console.error(`[mcp-memory] Collection '${this.collectionName}' already exists`);
        return;
      }

      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      });
      console.error(`[mcp-memory] Created collection '${this.collectionName}' (dim=${vectorSize})`);
    } catch (err: any) {
      // 409 = already exists (race condition)
      if (err?.status === 409 || err?.data?.status?.error?.includes('already exists')) {
        console.error(`[mcp-memory] Collection '${this.collectionName}' exists (409)`);
        return;
      }
      console.error(`[mcp-memory] ensureCollection warning: ${err.message}`);
    }
  }

  private buildMustFilter(filters: SearchFilters): any[] {
    const must: any[] = [];
    if (filters.projectPath) {
      must.push({ key: 'project_path', match: { value: filters.projectPath } });
    }
    if (filters.memoryType) {
      must.push({ key: 'memory_type', match: { value: filters.memoryType } });
    }
    if (filters.userScope) {
      must.push({ key: 'user_scope', match: { value: filters.userScope } });
    }
    if (filters.contentHash) {
      must.push({ key: 'content_hash', match: { value: filters.contentHash } });
    }
    return must;
  }

  async upsertPoints(points: QdrantPoint[]): Promise<void> {
    if (points.length === 0) return;
    try {
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: points.map(p => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload as any,
        })),
      });
    } catch (err: any) {
      console.error(`[mcp-memory] upsert error: ${err.message}`);
      throw err;
    }
  }

  async search(
    queryVector: number[],
    filters: SearchFilters = {},
    limit = 5,
  ): Promise<SearchResult[]> {
    try {
      const must = this.buildMustFilter(filters);
      const results = await this.client.search(this.collectionName, {
        vector: queryVector,
        filter: must.length > 0 ? { must } : undefined,
        limit,
        with_payload: true,
        score_threshold: 0.1,
      });

      return results.map((r: any) => ({
        id: String(r.id),
        score: r.score,
        title: r.payload?.title ?? '',
        content: r.payload?.content ?? '',
        memoryType: r.payload?.memory_type ?? 'project_context',
        projectPath: r.payload?.project_path ?? '',
        createdAt: r.payload?.created_at ?? 0,
        tags: r.payload?.tags ?? [],
      }));
    } catch (err: any) {
      console.error(`[mcp-memory] search error: ${err.message}`);
      return [];
    }
  }

  async deletePoint(id: string): Promise<boolean> {
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        points: [id],
      });
      return true;
    } catch (err: any) {
      console.error(`[mcp-memory] delete error: ${err.message}`);
      return false;
    }
  }

  async getCollectionInfo(): Promise<{ pointsCount: number; vectorsCount: number }> {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return {
        pointsCount: info.points_count ?? 0,
        vectorsCount: info.vectors_count ?? 0,
      };
    } catch {
      return { pointsCount: 0, vectorsCount: 0 };
    }
  }

  /** Find points matching a content hash (for dedup) */
  async findByContentHash(hash: string, projectPath: string): Promise<QdrantPoint | null> {
    try {
      const results = await this.client.scroll(this.collectionName, {
        filter: {
          must: [
            { key: 'content_hash', match: { value: hash } },
            { key: 'project_path', match: { value: projectPath } },
          ],
        },
        limit: 1,
        with_payload: true,
        with_vector: false,
      });
      const point = results.points?.[0];
      if (!point) return null;
      return {
        id: String(point.id),
        vector: [],
        payload: point.payload as any,
      };
    } catch {
      return null;
    }
  }

  /** List distinct project paths from stored memories */
  async listProjects(): Promise<string[]> {
    try {
      const allPaths = new Set<string>();
      let offset: string | number | null = null;

      // Scroll through all points collecting distinct project_path values
      while (true) {
        const result: any = await this.client.scroll(this.collectionName, {
          limit: 100,
          offset: offset as any,
          with_payload: ['project_path'],
          with_vector: false,
        });
        for (const p of result.points ?? []) {
          if (p.payload?.project_path) {
            allPaths.add(p.payload.project_path);
          }
        }
        if (!result.next_page_offset) break;
        offset = result.next_page_offset;
      }
      return Array.from(allPaths).sort();
    } catch {
      return [];
    }
  }

  /** Count points by project and type for status reporting */
  async countByProject(): Promise<Record<string, number>> {
    try {
      const counts: Record<string, number> = {};
      let offset: string | number | null = null;

      while (true) {
        const result: any = await this.client.scroll(this.collectionName, {
          limit: 100,
          offset: offset as any,
          with_payload: ['project_path'],
          with_vector: false,
        });
        for (const p of result.points ?? []) {
          const proj = p.payload?.project_path ?? '(unknown)';
          counts[proj] = (counts[proj] || 0) + 1;
        }
        if (!result.next_page_offset) break;
        offset = result.next_page_offset;
      }
      return counts;
    } catch {
      return {};
    }
  }

  /** Count points by memory type */
  async countByType(): Promise<Record<string, number>> {
    try {
      const counts: Record<string, number> = {};
      let offset: string | number | null = null;

      while (true) {
        const result: any = await this.client.scroll(this.collectionName, {
          limit: 100,
          offset: offset as any,
          with_payload: ['memory_type'],
          with_vector: false,
        });
        for (const p of result.points ?? []) {
          const type = p.payload?.memory_type ?? 'unknown';
          counts[type] = (counts[type] || 0) + 1;
        }
        if (!result.next_page_offset) break;
        offset = result.next_page_offset;
      }
      return counts;
    } catch {
      return {};
    }
  }
}

export function contentHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex').slice(0, 16);
}
