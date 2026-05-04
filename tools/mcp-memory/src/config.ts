import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AppConfig } from './types.js';

const DEFAULT_CONFIG: AppConfig = {
  qdrantUrl: 'http://localhost:6333',
  embedding: {
    provider: 'ollama',
    ollamaUrl: 'http://localhost:11434',
    model: 'nomic-embed-text',
    dimension: 768,
  },
  fallbackEmbedding: {
    provider: 'keyword',
    dimension: 1,
  },
  userName: 'dishi',
  collectionName: 'claude_memories',
  legacyMemoryPaths: [],
  chunking: {
    maxTokens: 400,
    overlapTokens: 50,
  },
};

function envConfig(): Partial<AppConfig> {
  const cfg: any = {};
  if (process.env.QDRANT_URL) cfg.qdrantUrl = process.env.QDRANT_URL;
  if (process.env.OLLAMA_URL) {
    cfg.embedding = { ...cfg.embedding, ollamaUrl: process.env.OLLAMA_URL };
  }
  if (process.env.OLLAMA_MODEL) {
    cfg.embedding = { ...cfg.embedding, model: process.env.OLLAMA_MODEL };
  }
  return cfg as Partial<AppConfig>;
}

function fileConfig(): Partial<AppConfig> {
  try {
    const configPath = process.env.CLAUDE_MEMORY_CONFIG ||
      resolve(import.meta.dirname, '../mcp-server.config.json');
    const raw = readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as Partial<AppConfig>;
  } catch {
    return {};
  }
}

export function loadConfig(): AppConfig {
  // Priority: env vars > config file > defaults
  const fromFile = fileConfig();
  const fromEnv = envConfig();

  return {
    ...DEFAULT_CONFIG,
    ...fromFile,
    ...fromEnv,
    embedding: {
      ...DEFAULT_CONFIG.embedding,
      ...(fromFile.embedding || {}),
      ...(fromEnv.embedding || {}),
    },
    fallbackEmbedding: {
      ...DEFAULT_CONFIG.fallbackEmbedding,
      ...(fromFile.fallbackEmbedding || {}),
      ...(fromEnv.fallbackEmbedding || {}),
    },
    chunking: {
      ...DEFAULT_CONFIG.chunking,
      ...(fromFile.chunking || {}),
      ...(fromEnv.chunking || {}),
    },
  };
}

/** Detect current project path from CWD or CLAUDE_PROJECT env */
export function detectProjectPath(): string {
  if (process.env.CLAUDE_PROJECT) return process.env.CLAUDE_PROJECT;
  return process.cwd();
}
