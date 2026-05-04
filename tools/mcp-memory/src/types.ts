// Memory type taxonomy matching Claude Code's auto-memory system
export type MemoryType =
  | 'user_profile'    // Cross-project: user role, preferences, knowledge
  | 'project_context' // Per-project: architecture, conventions, decisions
  | 'decision'        // Per-project: important decisions with rationale
  | 'feedback'        // Cross-project: user corrections and confirmations
  | 'reference';      // Per-project: external resources, URLs, tool configs

export interface MemoryPayload {
  project_path: string;
  memory_type: MemoryType;
  title: string;
  content: string;
  content_hash: string;
  origin_session_id: string;
  origin_file?: string;
  user_scope: 'global' | 'project';
  created_at: number;
  updated_at: number;
  tags: string[];
}

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: MemoryPayload;
}

export interface RememberParams {
  content: string;
  memoryType: MemoryType;
  title?: string;
  projectPath?: string;
  tags?: string[];
  userScope?: 'global' | 'project';
  sessionId?: string;
}

export interface RecallParams {
  query: string;
  projectPath?: string;
  memoryType?: MemoryType;
  limit?: number;
  userScope?: 'global' | 'project';
}

export interface SearchResult {
  id: string;
  score: number;
  title: string;
  content: string;
  memoryType: MemoryType;
  projectPath: string;
  createdAt: number;
  tags: string[];
}

export interface MemoryStatus {
  collectionName: string;
  totalPoints: number;
  byProject: Record<string, number>;
  byType: Record<MemoryType, number>;
  embeddingModel: string;
  embeddingDim: number;
  embeddingAvailable: boolean;
}

export interface MigrationResult {
  filesFound: number;
  migrated: number;
  skipped: number;
  errors: string[];
}

export interface AppConfig {
  qdrantUrl: string;
  embedding: {
    provider: 'ollama' | 'keyword';
    ollamaUrl: string;
    model: string;
    dimension: number;
  };
  fallbackEmbedding: {
    provider: 'keyword';
    dimension: number;
  };
  userName: string;
  collectionName: string;
  legacyMemoryPaths: string[];
  chunking: {
    maxTokens: number;
    overlapTokens: number;
  };
}
