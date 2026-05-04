#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig, detectProjectPath } from './config.js';
import { createEmbedder } from './embedding.js';
import { QdrantClientWrapper } from './qdrant-client.js';
import { MemoryManager } from './memory-manager.js';
import { createMemoryMcpServer } from './mcp-server.js';

async function main() {
  const config = loadConfig();

  console.error(`[mcp-memory] Starting up...`);
  console.error(`[mcp-memory] Qdrant: ${config.qdrantUrl}`);
  console.error(`[mcp-memory] Embedding: ${config.embedding.provider} / ${config.embedding.model}`);
  console.error(`[mcp-memory] Project: ${detectProjectPath()}`);

  // 1. Initialize embedder (may fallback to keyword)
  const embedder = await createEmbedder(config);
  console.error(`[mcp-memory] Embedder ready: ${embedder.modelName} (dim=${embedder.dimension})`);

  // 2. Initialize Qdrant
  const qdrant = new QdrantClientWrapper(config.qdrantUrl, config.collectionName);
  await qdrant.ensureCollection(embedder.dimension);
  console.error(`[mcp-memory] Qdrant collection '${config.collectionName}' ready`);

  // 3. Create memory manager
  const memoryManager = new MemoryManager(qdrant, embedder, config);

  // 4. Create MCP server
  const server = createMemoryMcpServer(memoryManager, config);

  // 5. Connect stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[mcp-memory] Connected to Claude Code via stdio');
}

main().catch((err) => {
  console.error('[mcp-memory] Fatal error:', err);
  process.exit(1);
});
