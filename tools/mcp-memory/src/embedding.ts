import type { AppConfig } from './types.js';

export interface Embedder {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  readonly dimension: number;
  readonly modelName: string;
  readonly available: boolean;
}

interface OllamaEmbedResponse {
  embedding: number[];
}

/** Simple word-frequency vector for keyword fallback (128-dim pseudo-embedding) */
function keywordEmbed(text: string, dim: number): number[] {
  // Tokenize and hash each word into a sparse vector
  const vec = new Array(dim).fill(0);
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 0);
  if (words.length === 0) return vec;

  for (const word of words) {
    // Simple hash to bucket index
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(i);
      hash = hash & 0x7fffffff;
    }
    const idx = hash % dim;
    vec[idx] += 1;
  }

  // L2 normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < dim; i++) vec[i] /= norm;
  }
  return vec;
}

class OllamaEmbedder implements Embedder {
  readonly available = true;

  constructor(
    readonly modelName: string,
    readonly dimension: number,
    private ollamaUrl: string,
  ) {}

  async embed(text: string): Promise<number[]> {
    const resp = await fetch(`${this.ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.modelName, prompt: text }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      throw new Error(`Ollama embed failed: ${resp.status} ${await resp.text()}`);
    }

    const data = (await resp.json()) as OllamaEmbedResponse;
    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error('Ollama returned invalid embedding');
    }
    return Array.from(data.embedding);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.embed(t)));
  }
}

class KeywordEmbedder implements Embedder {
  readonly available = true;
  readonly modelName = 'keyword-hash/128';
  readonly dimension = 128;

  async embed(text: string): Promise<number[]> {
    return keywordEmbed(text, this.dimension);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map(t => keywordEmbed(t, this.dimension));
  }
}

/** Split long text into overlapping chunks for embedding, then average */
function chunkText(text: string, maxTokens: number, overlapTokens: number): string[] {
  // Rough tokenization: CJK chars ~1 token each, words ~1 token each
  const sentences = text.split(/(?<=[。！？.!?\n])/);
  const chunks: string[] = [];
  let current = '';

  for (const sent of sentences) {
    const estimatedTokens = sent.length; // rough estimate
    if (current.length + estimatedTokens > maxTokens && current.length > 0) {
      chunks.push(current.trim());
      // Keep overlap: last few sentences
      const overlapStart = Math.max(0, current.length - overlapTokens);
      current = current.slice(overlapStart);
    }
    current += sent;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

export async function createEmbedder(config: AppConfig): Promise<Embedder> {
  // Try Ollama first
  if (config.embedding.provider === 'ollama') {
    try {
      // Verify Ollama is reachable
      const resp = await fetch(`${config.embedding.ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (resp.ok) {
        console.error('[mcp-memory] Using Ollama embedder:', config.embedding.model);
        return new OllamaEmbedder(
          config.embedding.model,
          config.embedding.dimension,
          config.embedding.ollamaUrl,
        );
      }
    } catch {
      console.error('[mcp-memory] Ollama not reachable, falling back to keyword embedder');
    }
  }

  // Fallback: keyword-based pseudo-embedding
  console.error('[mcp-memory] Using keyword fallback embedder');
  return new KeywordEmbedder();
}

/** Embed potentially long content by chunking and averaging */
export async function embedContent(embedder: Embedder, content: string, chunkConfig: { maxTokens: number; overlapTokens: number }): Promise<number[]> {
  const chunks = chunkText(content, chunkConfig.maxTokens, chunkConfig.overlapTokens);
  if (chunks.length === 1) return embedder.embed(content);

  const vectors = await embedder.embedBatch(chunks);
  const dim = vectors[0].length;
  const avg = new Array(dim).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) avg[i] += vec[i];
  }
  for (let i = 0; i < dim; i++) avg[i] /= vectors.length;
  return avg;
}
