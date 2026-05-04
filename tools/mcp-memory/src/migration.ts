import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { MemoryManager } from './memory-manager.js';
import type { MigrationResult, MemoryType } from './types.js';

function parseFrontmatter(content: string): { metadata: Record<string, string>; body: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { metadata: {}, body: content };

  const metadata: Record<string, string> = {};
  const yaml = match[1];
  for (const line of yaml.split('\n')) {
    const kv = line.match(/^(\w[\w_-]*):\s*(.*)$/);
    if (kv) metadata[kv[1]] = kv[2].trim();
  }
  return { metadata, body: match[2].trim() };
}

/** Map legacy memory file type values to new MemoryType taxonomy */
function mapLegacyType(legacyType: string, filename: string): MemoryType {
  const t = legacyType.toLowerCase();
  if (t === 'user') return 'user_profile';
  if (t === 'feedback') return 'feedback';
  if (t === 'project') return 'project_context';
  if (t === 'reference') return 'reference';

  // Heuristic from filename
  if (filename.includes('preference') || filename.includes('language')) return 'user_profile';
  if (filename.includes('deploy') || filename.includes('domain')) return 'reference';
  if (filename.includes('fix') || filename.includes('session')) return 'project_context';

  return 'project_context';
}

function findMdFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      try {
        const st = statSync(full);
        if (st.isDirectory()) {
          results.push(...findMdFiles(full));
        } else if (st.isFile() && entry.endsWith('.md') && entry !== 'MEMORY.md') {
          results.push(full);
        }
      } catch { /* skip unreadable */ }
    }
  } catch { /* skip unreadable dir */ }
  return results;
}

export async function migrateFromFiles(
  projectPath: string,
  legacyPaths: string[],
  memoryManager: MemoryManager,
): Promise<MigrationResult> {
  const result: MigrationResult = { filesFound: 0, migrated: 0, skipped: 0, errors: [] };

  for (const legacyPath of legacyPaths) {
    const mdFiles = findMdFiles(legacyPath);
    result.filesFound += mdFiles.length;

    for (const filePath of mdFiles) {
      try {
        const raw = readFileSync(filePath, 'utf-8');
        const { metadata, body } = parseFrontmatter(raw);
        if (!body || body.length < 10) {
          result.skipped++;
          continue;
        }

        const memoryType = mapLegacyType(metadata.type || '', basename(filePath));
        const title = metadata.name || metadata.title || basename(filePath, '.md');
        const tags = [metadata.type || '', basename(filePath, '.md')].filter(Boolean);

        const { alreadyExists } = await memoryManager.remember({
          content: body,
          memoryType,
          title,
          projectPath,
          tags,
          userScope: memoryType === 'user_profile' || memoryType === 'feedback' ? 'global' : 'project',
          sessionId: metadata.originSessionId || '',
        });

        if (alreadyExists) {
          result.skipped++;
        } else {
          result.migrated++;
        }
      } catch (err: any) {
        result.errors.push(`${filePath}: ${err.message}`);
      }
    }
  }

  return result;
}
