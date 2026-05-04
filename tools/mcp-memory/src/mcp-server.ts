import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { MemoryManager } from './memory-manager.js';
import type { RememberParams, RecallParams } from './types.js';
import { detectProjectPath } from './config.js';
import type { AppConfig } from './types.js';

function jsonResult(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(message: string): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

const memoryTypeEnum = z.enum([
  'user_profile', 'project_context', 'decision', 'feedback', 'reference',
]);

const scopeEnum = z.enum(['global', 'project']);

export function createMemoryMcpServer(memoryManager: MemoryManager, config: AppConfig): McpServer {
  const server = new McpServer(
    { name: 'mcp-memory', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  // --- remember ---
  server.registerTool(
    'remember',
    {
      description: 'Store a memory in the vector database. Use this to remember important facts, decisions, user preferences, project context, and references across sessions.',
      inputSchema: {
        content: z.string().describe('The memory content to store'),
        memoryType: memoryTypeEnum.describe('Type of memory'),
        title: z.string().optional().describe('Optional title (defaults to first 80 chars of content)'),
        projectPath: z.string().optional().describe('Project path (auto-detected if omitted)'),
        tags: z.array(z.string()).optional().describe('Tags for categorization'),
        userScope: scopeEnum.optional().describe('Scope: global (cross-project) or project-specific'),
        sessionId: z.string().optional().describe('Origin session ID'),
      },
    },
    async (args) => {
      try {
        const params: RememberParams = {
          content: args.content,
          memoryType: args.memoryType,
          title: args.title,
          projectPath: args.projectPath,
          tags: args.tags,
          userScope: args.userScope,
          sessionId: args.sessionId,
        };
        const result = await memoryManager.remember(params);
        return jsonResult(result);
      } catch (err: any) {
        return errorResult(`remember failed: ${err.message}`);
      }
    },
  );

  // --- recall ---
  server.registerTool(
    'recall',
    {
      description: 'Search memories semantically. Use this to recall relevant information from past sessions, user preferences, project decisions, and references.',
      inputSchema: {
        query: z.string().describe('Natural language search query'),
        projectPath: z.string().optional().describe('Filter by project path (omit for all projects)'),
        memoryType: memoryTypeEnum.optional().describe('Filter by memory type'),
        limit: z.number().optional().describe('Max results (default 5, max 20)'),
        userScope: scopeEnum.optional().describe('Filter by scope'),
      },
    },
    async (args) => {
      try {
        const params: RecallParams = {
          query: args.query,
          projectPath: args.projectPath,
          memoryType: args.memoryType,
          limit: args.limit,
          userScope: args.userScope,
        };
        const results = await memoryManager.recall(params);
        return jsonResult(results);
      } catch (err: any) {
        return errorResult(`recall failed: ${err.message}`);
      }
    },
  );

  // --- forget ---
  server.registerTool(
    'forget',
    {
      description: 'Delete a memory by its ID.',
      inputSchema: {
        id: z.string().describe('Memory ID to delete'),
      },
    },
    async (args) => {
      try {
        const deleted = await memoryManager.forget(args.id);
        return jsonResult({ deleted, id: args.id });
      } catch (err: any) {
        return errorResult(`forget failed: ${err.message}`);
      }
    },
  );

  // --- status ---
  server.registerTool(
    'status',
    {
      description: 'Get memory store statistics: total points, breakdown by project and type, embedding model info.',
      inputSchema: {},
    },
    async () => {
      try {
        const s = await memoryManager.status();
        return jsonResult(s);
      } catch (err: any) {
        return errorResult(`status failed: ${err.message}`);
      }
    },
  );

  // --- list_projects ---
  server.registerTool(
    'list_projects',
    {
      description: 'List all known project paths that have stored memories.',
      inputSchema: {},
    },
    async () => {
      try {
        const projects = await memoryManager.listProjects();
        return jsonResult({ projects, currentProject: detectProjectPath() });
      } catch (err: any) {
        return errorResult(`list_projects failed: ${err.message}`);
      }
    },
  );

  // --- migrate ---
  server.registerTool(
    'migrate',
    {
      description: 'Import legacy file-based memories (.md files) into the vector database.',
      inputSchema: {
        projectPath: z.string().optional().describe('Target project path'),
      },
    },
    async (args) => {
      try {
        const projectPath = args.projectPath || detectProjectPath();
        const { migrateFromFiles } = await import('./migration.js');
        const result = await migrateFromFiles(projectPath, config.legacyMemoryPaths, memoryManager);
        return jsonResult(result);
      } catch (err: any) {
        return errorResult(`migrate failed: ${err.message}`);
      }
    },
  );

  return server;
}
