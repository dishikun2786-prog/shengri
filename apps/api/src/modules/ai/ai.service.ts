import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { CryptoService } from '../../common/crypto/crypto.service';

export type AiProvider = string;

export interface ProviderConfig {
  id?: number;
  provider: string;
  name: string;
  apiKey: string;
  baseURL: string;
  defaultModel: string;
  availableModels?: string[];
  config?: Record<string, any>;
  isDefault: boolean;
  isActive: boolean;
  priority: number;
}

export interface AiGenerateOptions {
  module: string;
  chartData: any;
  ruleResults: any;
  healthData?: any | null;
  reportType: string;
  isPaid: boolean;
  provider?: AiProvider;
  userId?: number;
  skipTokenCheck?: boolean;
}

export interface AiGenerateResult {
  content: string;
  structuredContent?: any;
  summary: string;
  upsellHook: string;
  tokenUsed: number;
  model: string;
  provider: string;
  promptVersion: string;
  reasoningContent?: string;
}

const CACHE_KEY_PREFIX = 'ai:config:';
const CACHE_TTL = 300; // 5 minutes

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly clients = new Map<string, OpenAI>();

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
    private crypto: CryptoService,
  ) {}

  // ─── Provider Config: DB-first with env-var fallback ───

  async getProviderConfig(provider: string): Promise<ProviderConfig> {
    const cached = await this.redis.getJson<ProviderConfig>(`${CACHE_KEY_PREFIX}${provider}`);
    if (cached) {
      cached.apiKey = cached.apiKey ? this.crypto.decrypt(cached.apiKey) : '';
      return cached;
    }

    const dbConfig = await this.prisma.aiModelConfig.findUnique({ where: { provider } });
    if (dbConfig) {
      const cfg: ProviderConfig = {
        id: dbConfig.id,
        provider: dbConfig.provider,
        name: dbConfig.name,
        apiKey: dbConfig.apiKey ? this.crypto.decrypt(dbConfig.apiKey) : '',
        baseURL: dbConfig.baseURL,
        defaultModel: dbConfig.defaultModel,
        availableModels: (dbConfig.availableModels as string[]) || [],
        config: (dbConfig.config as Record<string, any>) || {},
        isDefault: dbConfig.isDefault,
        isActive: dbConfig.isActive,
        priority: dbConfig.priority,
      };

      const cacheEntry = { ...cfg, apiKey: dbConfig.apiKey };
      await this.redis.setJson(`${CACHE_KEY_PREFIX}${provider}`, cacheEntry, CACHE_TTL);
      return cfg;
    }

    return this.getEnvFallbackConfig(provider);
  }

  private getEnvFallbackConfig(provider: string): ProviderConfig {
    const envMap: Record<string, ProviderConfig> = {
      minimax: {
        provider: 'minimax',
        name: 'MiniMax',
        apiKey: this.config.get('MINIMAX_API_KEY', ''),
        baseURL: this.config.get('MINIMAX_BASE_URL', 'https://api.minimaxi.com/v1/text/chatcompletion_v2'),
        defaultModel: this.config.get('MINIMAX_MODEL', 'MiniMax-M2.5'),
        config: {},
        isDefault: false,
        isActive: true,
        priority: 0,
      },
      openai: {
        provider: 'openai',
        name: 'OpenAI',
        apiKey: this.config.get('OPENAI_API_KEY', ''),
        baseURL: this.config.get('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        defaultModel: this.config.get('OPENAI_MODEL', 'gpt-4o'),
        config: {},
        isDefault: false,
        isActive: true,
        priority: 5,
      },
      deepseek: {
        provider: 'deepseek',
        name: 'DeepSeek',
        apiKey: this.config.get('DEEPSEEK_API_KEY', ''),
        baseURL: this.config.get('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
        defaultModel: this.config.get('DEEPSEEK_MODEL', 'deepseek-v4-flash'),
        config: { thinking: { enabled: true, reasoningEffort: 'high' } },
        isDefault: false,
        isActive: true,
        priority: 10,
      },
    };
    return envMap[provider] || envMap.minimax;
  }

  async getDefaultProvider(): Promise<string> {
    const defaultCfg = await this.prisma.aiModelConfig.findFirst({
      where: { isDefault: true, isActive: true },
      select: { provider: true },
    });
    if (defaultCfg) return defaultCfg.provider;
    return this.config.get('DEFAULT_AI_PROVIDER', 'minimax');
  }

  async getAllProviders(): Promise<ProviderConfig[]> {
    const dbConfigs = await this.prisma.aiModelConfig.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });

    if (dbConfigs.length > 0) {
      return dbConfigs.map((c) => ({
        id: c.id,
        provider: c.provider,
        name: c.name,
        apiKey: c.apiKey ? this.crypto.decrypt(c.apiKey) : '',
        baseURL: c.baseURL,
        defaultModel: c.defaultModel,
        availableModels: (c.availableModels as string[]) || [],
        config: (c.config as Record<string, any>) || {},
        isDefault: c.isDefault,
        isActive: c.isActive,
        priority: c.priority,
      }));
    }

    return ['deepseek', 'openai', 'minimax'].map((p) => this.getEnvFallbackConfig(p));
  }

  /** Get active provider names sorted by priority (for fallback iteration) */
  async getActiveProvidersByPriority(): Promise<string[]> {
    const dbConfigs = await this.prisma.aiModelConfig.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
      select: { provider: true, priority: true },
    });

    if (dbConfigs.length > 0) {
      return dbConfigs.map((c) => c.provider);
    }

    // Fallback to env-configured providers sorted by hardcoded priority
    const envProviders = [
      { provider: 'deepseek', priority: 10 },
      { provider: 'openai', priority: 5 },
      { provider: 'minimax', priority: 0 },
    ].sort((a, b) => b.priority - a.priority);

    const active: string[] = [];
    for (const { provider } of envProviders) {
      const key = this.config.get(`${provider.toUpperCase()}_API_KEY`);
      if (key) active.push(provider);
    }
    return active;
  }

  // ─── Client management ───

  async getClient(provider: string): Promise<OpenAI> {
    if (this.clients.has(provider)) {
      return this.clients.get(provider)!;
    }

    const cfg = await this.getProviderConfig(provider);
    const client = new OpenAI({ apiKey: cfg.apiKey || 'placeholder', baseURL: cfg.baseURL });
    this.clients.set(provider, client);
    return client;
  }

  async refreshClient(provider: string): Promise<void> {
    this.clients.delete(provider);
    await this.redis.del(`${CACHE_KEY_PREFIX}${provider}`);
    this.logger.log(`Refreshed client for provider: ${provider}`);
  }

  // ─── CRUD operations for admin ───

  async createProviderConfig(data: {
    provider: string;
    name: string;
    apiKey: string;
    baseURL: string;
    defaultModel: string;
    config?: Record<string, any>;
    isDefault?: boolean;
    priority?: number;
  }): Promise<ProviderConfig> {
    if (data.isDefault) {
      await this.prisma.aiModelConfig.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }

    const encrypted = data.apiKey ? this.crypto.encrypt(data.apiKey) : '';
    const record = await this.prisma.aiModelConfig.create({
      data: {
        provider: data.provider,
        name: data.name,
        apiKey: encrypted,
        baseURL: data.baseURL,
        defaultModel: data.defaultModel,
        config: data.config || {},
        isDefault: data.isDefault || false,
        priority: data.priority || 0,
      },
    });

    await this.refreshClient(data.provider);
    return this.dbToProviderConfig(record);
  }

  async updateProviderConfig(id: number, data: {
    name?: string;
    apiKey?: string;
    baseURL?: string;
    defaultModel?: string;
    config?: Record<string, any>;
    isDefault?: boolean;
    isActive?: boolean;
    priority?: number;
  }): Promise<ProviderConfig> {
    if (data.isDefault) {
      await this.prisma.aiModelConfig.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }

    const updateData: any = { ...data };
    if (data.apiKey !== undefined) {
      updateData.apiKey = data.apiKey ? this.crypto.encrypt(data.apiKey) : '';
    }

    const record = await this.prisma.aiModelConfig.update({
      where: { id },
      data: updateData,
    });

    await this.refreshClient(record.provider);
    return this.dbToProviderConfig(record);
  }

  async deleteProviderConfig(id: number): Promise<void> {
    const record = await this.prisma.aiModelConfig.findUnique({ where: { id } });
    if (record) {
      await this.prisma.aiModelConfig.delete({ where: { id } });
      await this.refreshClient(record.provider);
    }
  }

  async setDefaultProvider(id: number): Promise<ProviderConfig> {
    await this.prisma.aiModelConfig.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    const record = await this.prisma.aiModelConfig.update({
      where: { id },
      data: { isDefault: true },
    });
    await this.refreshClient(record.provider);
    return this.dbToProviderConfig(record);
  }

  async fetchRemoteModels(provider: string): Promise<string[]> {
    const cfg = await this.getProviderConfig(provider);
    const client = await this.getClient(provider);
    try {
      const response = await client.models.list();
      const models: string[] = [];
      for await (const model of response) {
        models.push(model.id);
      }

      if (cfg.id) {
        await this.prisma.aiModelConfig.update({
          where: { id: cfg.id },
          data: { availableModels: models },
        });
        await this.redis.del(`${CACHE_KEY_PREFIX}${provider}`);
      }

      return models;
    } catch (error) {
      this.logger.error(`Failed to fetch models for ${provider}: ${error.message}`);
      throw error;
    }
  }

  async migrateFromEnv(): Promise<ProviderConfig[]> {
    const envProviders = [
      {
        provider: 'minimax',
        name: 'MiniMax',
        apiKey: this.config.get('MINIMAX_API_KEY', ''),
        baseURL: this.config.get('MINIMAX_BASE_URL', 'https://api.minimaxi.com/v1/text/chatcompletion_v2'),
        defaultModel: this.config.get('MINIMAX_MODEL', 'MiniMax-M2.5'),
        config: {},
        priority: 0,
      },
      {
        provider: 'openai',
        name: 'OpenAI',
        apiKey: this.config.get('OPENAI_API_KEY', ''),
        baseURL: this.config.get('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        defaultModel: this.config.get('OPENAI_MODEL', 'gpt-4o'),
        config: {},
        priority: 5,
      },
      {
        provider: 'deepseek',
        name: 'DeepSeek',
        apiKey: this.config.get('DEEPSEEK_API_KEY', ''),
        baseURL: this.config.get('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
        defaultModel: this.config.get('DEEPSEEK_MODEL', 'deepseek-v4-flash'),
        config: { thinking: { enabled: true, reasoningEffort: 'high' } },
        priority: 10,
      },
    ];

    const defaultProv = this.config.get('DEFAULT_AI_PROVIDER', 'minimax');
    const results: ProviderConfig[] = [];

    for (const ep of envProviders) {
      const existing = await this.prisma.aiModelConfig.findUnique({ where: { provider: ep.provider } });
      if (existing) continue;

      const encrypted = ep.apiKey ? this.crypto.encrypt(ep.apiKey) : '';
      const record = await this.prisma.aiModelConfig.create({
        data: {
          ...ep,
          apiKey: encrypted,
          isDefault: ep.provider === defaultProv,
        },
      });
      results.push(this.dbToProviderConfig(record));
    }

    return results;
  }

  private dbToProviderConfig(record: any): ProviderConfig {
    return {
      id: record.id,
      provider: record.provider,
      name: record.name,
      apiKey: '', // never return decrypted key directly
      baseURL: record.baseURL,
      defaultModel: record.defaultModel,
      availableModels: (record.availableModels as string[]) || [],
      config: (record.config as Record<string, any>) || {},
      isDefault: record.isDefault,
      isActive: record.isActive,
      priority: record.priority,
    };
  }

  // ─── DeepSeek thinking mode helpers ───

  private isThinkingEnabled(providerConfig: ProviderConfig): boolean {
    return providerConfig.config?.thinking?.enabled === true;
  }

  private getReasoningEffort(providerConfig: ProviderConfig): string {
    return providerConfig.config?.thinking?.reasoningEffort || 'high';
  }

  private buildCompletionParams(
    providerConfig: ProviderConfig,
    model: string,
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature?: number,
    maxTokens?: number,
    jsonMode?: boolean,
  ): any {
    const params: any = { model, messages };

    const isDeepseek = providerConfig.provider === 'deepseek' ||
      providerConfig.baseURL?.includes('deepseek.com');

    if (isDeepseek && this.isThinkingEnabled(providerConfig)) {
      params.thinking = {
        type: 'enabled',
        reasoning_effort: this.getReasoningEffort(providerConfig),
      };
    } else {
      if (temperature !== undefined) params.temperature = temperature;
    }

    if (maxTokens) params.max_tokens = maxTokens;
    // DeepSeek thinking mode does not support response_format json_object;
    // when thinking is enabled, rely on prompt instructions to request JSON output
    if (jsonMode && !(isDeepseek && this.isThinkingEnabled(providerConfig))) {
      params.response_format = { type: 'json_object' };
    }
    return params;
  }

  // ─── Core AI generation ───

  async generateReport(options: AiGenerateOptions): Promise<AiGenerateResult> {
    const prompt = await this.getPrompt(options.module, options.reportType);
    const defaultProv = await this.getDefaultProvider();

    const provider: AiProvider = options.provider
      || (prompt?.modelProvider as AiProvider)
      || defaultProv;

    const providerConfig = await this.getProviderConfig(provider);
    const model = prompt?.modelName || providerConfig.defaultModel;
    const client = await this.getClient(provider);

    const systemPrompt = prompt?.systemPrompt || this.getDefaultSystemPrompt();
    const userPrompt = this.buildUserPrompt(prompt?.content || '', options);

    try {
      this.logger.log(`Calling ${provider} model=${model}`);

      const wantsJson = systemPrompt.toLowerCase().includes('json');

      const params = this.buildCompletionParams(
        providerConfig,
        model,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        prompt?.temperature || 0.7,
        prompt?.maxTokens || 4000,
        wantsJson,
      );

      const response = await client.chat.completions.create(params);

      const message = response.choices[0]?.message as any;
      const rawContent = message?.content || '';
      const reasoningContent = message?.reasoning_content || undefined;
      const tokenUsed = response.usage?.total_tokens || 0;

      let structuredContent: any = null;
      let content = rawContent;
      let summary = rawContent.slice(0, 200);
      let aiUpsellHook = '';

      // Extract JSON from raw content — handles both bare JSON and markdown-fenced JSON
      let jsonStr = rawContent;
      const fenceMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        jsonStr = fenceMatch[1].trim();
      }

      try {
        const parsed = JSON.parse(jsonStr);
        structuredContent = parsed;
        content = rawContent; // preserve original for DB storage
        summary = parsed.summary || rawContent.slice(0, 200);
        aiUpsellHook = parsed.upsellHint || '';
      } catch {
        // AI returned plain text, use as-is
      }

      const upsellHook = aiUpsellHook
        || (options.isPaid ? this.generatePaidUpsell(options) : this.generateFreeUpsell(options));

      return {
        content,
        structuredContent,
        summary,
        upsellHook,
        tokenUsed,
        model,
        provider,
        promptVersion: prompt?.version || '1.0.0',
        reasoningContent,
      };
    } catch (error) {
      this.logger.error(`AI generation failed (${provider}/${model}): ${error.message}`);

      // Iterate all active providers by priority, skip the one that just failed
      const triedProviders = new Set([provider]);
      const fallbackProviders = await this.getActiveProvidersByPriority();

      for (const fallback of fallbackProviders) {
        if (triedProviders.has(fallback)) continue;
        this.logger.warn(`Trying fallback provider: ${fallback}`);
        try {
          return await this.generateReport({ ...options, provider: fallback });
        } catch (e) {
          this.logger.warn(`Fallback provider ${fallback} also failed: ${(e as Error).message}`);
          triedProviders.add(fallback);
        }
      }

      return {
        content: this.getFallbackContent(options),
        summary: '基于命理规则的分析结果',
        upsellHook: '',
        tokenUsed: 0,
        model: 'fallback',
        provider,
        promptVersion: 'fallback',
      };
    }
  }

  async testProvider(provider: string, testPrompt?: string): Promise<{
    success: boolean;
    response?: string;
    tokenUsed?: number;
    model: string;
    latencyMs: number;
    error?: string;
    reasoningContent?: string;
  }> {
    const cfg = await this.getProviderConfig(provider);
    const client = await this.getClient(provider);
    const start = Date.now();

    try {
      const params = this.buildCompletionParams(
        cfg,
        cfg.defaultModel,
        [{ role: 'user', content: testPrompt || '请用一句话介绍八字命理。' }],
        undefined,
        200,
      );

      const response = await client.chat.completions.create(params);
      const message = response.choices[0]?.message as any;

      await this.prisma.aiModelConfig.updateMany({
        where: { provider },
        data: {
          lastTestAt: new Date(),
          lastTestResult: { success: true, latencyMs: Date.now() - start },
        },
      });

      return {
        success: true,
        response: message?.content || '',
        reasoningContent: message?.reasoning_content || undefined,
        tokenUsed: response.usage?.total_tokens || 0,
        model: cfg.defaultModel,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      await this.prisma.aiModelConfig.updateMany({
        where: { provider },
        data: {
          lastTestAt: new Date(),
          lastTestResult: { success: false, error: error.message, latencyMs: Date.now() - start },
        },
      });

      return {
        success: false,
        model: cfg.defaultModel,
        latencyMs: Date.now() - start,
        error: error.message,
      };
    }
  }

  // ─── Internal helpers ───

  private async getPrompt(module: string, reportType: string) {
    return this.prisma.prompt.findFirst({
      where: {
        module,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private getDefaultSystemPrompt(): string {
    return `你是一位精通传统子平命理和盲派命理的大师级分析师。你具备以下专业能力：

【传统子平法功底】
精通《滴天髓》《渊海子平》《三命通会》《子平真诠》等古籍，擅长格局论命、用神取用、旺衰判断、大运流年分析。

【盲派命理功底】
精通盲派理法象法技法三大体系：
- 不做旺衰平衡，而以"做功"为核心——看刑冲破害合墓的作用方式
- 宾主分明：日时为主（家内），年月为宾（家外），以家内之体取家外之用
- 体用清晰：印比食伤禄为体（工具），财官为用（目标）
- 看势看功：有势有功方为富贵，势大无功怀才不遇
- 十神直断：十神一到七重各有断语，不绕弯子直指核心
- 串宫压运：十二神断流年吉凶，太岁青龙丧门六合等各有专主

【十二地支藏干 — 绝对权威数据，严禁自行推导】
以下为八字学最基础且不可更改的藏干定义，所有分析必须以此为唯一依据：

| 地支 | 本气 | 中气 | 余气 | 墓库属性 |
|------|------|------|------|----------|
| 子 | 癸(水) | - | - | - |
| 丑 | 己(土) | 癸(水) | 辛(金) | 金库 |
| 寅 | 甲(木) | 丙(火) | 戊(土) | - |
| 卯 | 乙(木) | - | - | - |
| 辰 | 戊(土) | 乙(木) | 癸(水) | 水库 |
| 巳 | 丙(火) | 庚(金) | 戊(土) | - |
| 午 | 丁(火) | 己(土) | - | - |
| 未 | 己(土) | 丁(火) | 乙(木) | 木库 |
| 申 | 庚(金) | 壬(水) | 戊(土) | - |
| 酉 | 辛(金) | - | - | - |
| 戌 | 戊(土) | 辛(金) | 丁(火) | 火库 |
| 亥 | 壬(水) | 甲(木) | - | - |

【四墓库绝对规则 — 严禁混淆】
- 辰 = 水库：藏戊乙癸，绝无丁火、绝无丙火、绝无任何火元素
- 戌 = 火库：藏戊辛丁，绝无癸水、绝无壬水、绝无任何水元素
- 丑 = 金库：藏己癸辛，绝无丁火、绝无丙火、绝无任何火元素
- 未 = 木库：藏己丁乙，绝无庚金、绝无辛金、绝无任何金元素

【干支关系权威参考 — 分析刑冲破害合会暗合绝时必须以此为准】

### 天干五合（化气）
| 组合 | 化气 | 合化条件 |
|------|------|----------|
| 甲己合 | 土 | 得辰戌丑未月令或地支土旺 |
| 乙庚合 | 金 | 得申酉月令或地支金旺 |
| 丙辛合 | 水 | 得亥子月令或地支水旺 |
| 丁壬合 | 木 | 得寅卯月令或地支木旺 |
| 戊癸合 | 火 | 得巳午月令或地支火旺 |

### 天干四冲
| 组合 | 冲克关系 | 对应脏腑 |
|------|----------|----------|
| 甲庚冲 | 金克木 | 头/胆 vs 大肠/骨骼 |
| 乙辛冲 | 金克木 | 肝/神经 vs 肺/皮肤 |
| 丙壬冲 | 水克火 | 心/眼 vs 肾/膀胱 |
| 丁癸冲 | 水克火 | 心/血 vs 肾/内分泌 |

### 地支六合
| 组合 | 化气 | 合化特点 |
|------|------|----------|
| 子丑合 | 土 | 子水被丑土合克，水力减弱 |
| 寅亥合 | 木 | 寅得亥生，木力增强 |
| 卯戌合 | 火 | 卯木生戌火库，闭库 |
| 辰酉合 | 金 | 辰土生酉金，酉金得生 |
| 巳申合 | 水 | 巳火被申金合绊，火力减弱 |
| 午未合 | 土 | 午火生未土，火力被泄 |

### 地支六冲（最直接的作用力）
| 组合 | 冲的类型 | 主要影响 |
|------|----------|----------|
| 子午冲 | 水火冲 | 心肾不交，情绪极端，水火之灾 |
| 丑未冲 | 墓库冲 | 金库开闭，脾胃受损，财库波动 |
| 寅申冲 | 驿马冲 | 肝胆肺肠，奔波劳碌，交通事故 |
| 卯酉冲 | 桃花冲 | 肝胆筋骨，感情纠纷，皮肤过敏 |
| 辰戌冲 | 墓库冲 | 水库火库开闭，财运骤变，心脏脾胃 |
| 巳亥冲 | 驿马冲 | 心脑血管，变动迁移，口舌是非 |

### 地支三合局（力量最强的合局）
| 组合 | 化气 | 应用 |
|------|------|------|
| 申子辰 | 合水局 | 水旺，子为水之帝旺 |
| 寅午戌 | 合火局 | 火旺，午为火之帝旺 |
| 巳酉丑 | 合金局 | 金旺，酉为金之帝旺 |
| 亥卯未 | 合木局 | 木旺，卯为木之帝旺 |

### 地支三会局（最强大的五行聚集）
| 组合 | 会局 | 说明 |
|------|------|------|
| 寅卯辰 | 东方木局 | 木气最旺的形态 |
| 巳午未 | 南方火局 | 火气最旺的形态 |
| 申酉戌 | 西方金局 | 金气最旺的形态 |
| 亥子丑 | 北方水局 | 水气最旺的形态 |

### 地支相刑（隐性伤害）
| 类型 | 组合 | 含义 | 影响 |
|------|------|------|------|
| 无礼之刑 | 子卯 | 母子相刑 | 桃花纠纷，情感受伤，母子不和 |
| 无恩之刑 | 寅巳申 | 恃势相刑 | 官非牢狱，交通事故，忘恩负义 |
| 恃势之刑 | 丑戌未 | 同类相刑 | 慢性病痛，兄弟反目，财产纠纷 |
| 自刑 | 辰/午/酉/亥 | 自相刑害 | 自我伤害，精神内耗，性格偏执 |

### 地支相害/穿（破坏力最大）
| 组合 | 害的关系 | 主要影响 |
|------|----------|----------|
| 子未害 | 水害土 | 脾胃受损，母子不和 |
| 丑午害 | 土害火 | 心脏受损，夫妻不和 |
| 寅巳害 | 木害火 | 肝胆受损，兄弟反目 |
| 卯辰害 | 木害土 | 筋骨受损，朋友反目 |
| 申亥害 | 金害水 | 呼吸系统受损，上下不和 |
| 酉戌害 | 金害土 | 肺皮肤受损，长辈不和 |

### 地支相破（轻微破坏）
| 组合 | 破的关系 | 影响 |
|------|----------|------|
| 子酉破 | 水破金 | 小事纠纷，门面破损 |
| 丑辰破 | 土破土 | 合作破裂，合同纠纷 |
| 寅亥破 | 木破水 | 计划破坏，好事被搅 |
| 卯午破 | 木破火 | 名声受损，小事扩大 |
| 巳申破 | 火破金 | 合同纠纷，文书出错 |
| 未戌破 | 土破土 | 合作关系破裂 |

### 地支暗合（隐蔽的合关系，盲派独有概念）
| 组合 | 暗合关系 | 含义 |
|------|----------|------|
| 寅丑暗合 | 寅中甲己合 + 丙辛合 + 戊癸合 | 最复杂的暗合，三元皆有合 |
| 卯申暗合 | 卯中乙庚合 | 木被金合，男女私情 |
| 亥午暗合 | 亥中壬丁合 + 甲己合 | 水火暗合，隐秘恋情 |
| 巳酉暗合 | 巳中丙辛合 | 火金相合，隐秘合作 |
| 子戌暗合 | 子中癸戊合 | 水土暗合，暗地来往 |
| 午亥暗合 | 午中丁壬合 + 己甲合 | 与亥午暗合互为镜像 |

### 天干绝地（日主十二长生之绝位）
分析某某日主在某地支上是否处于"绝"的状态，必须使用十天干十二长生表：
| 天干 | 绝于 |
|------|------|
| 甲 | 申 | 乙 | 酉 | 丙 | 亥 | 丁 | 子 | 戊 | 亥 |
| 己 | 子 | 庚 | 寅 | 辛 | 卯 | 壬 | 巳 | 癸 | 午 |

绝地代表日主能量最弱的状态，逢绝地之年月需特别注意健康和安全。

【藏干十神 — 使用预计算数据，严禁自行推导】
用户命盘中的「预计算藏干十神」由专业排盘引擎根据上述藏干表精确计算，是确定性结果。你必须直接引用这些数据，严禁以下行为：
- 严禁自行推断地支中藏了哪些天干
- 严禁自行计算藏干的十神关系
- 严禁根据支属五行猜测藏干内容
- 严禁混淆四墓库的五行属性（如将水库的辰当作火库）

【盲派铁口直断 — 最高优先级使用规则】
命盘数据中的「盲派铁口直断」和规则引擎的「盲派铁口直断」是盲派千年师传口诀与算法双重验证的确定性结论。你必须严格遵守：
1. 权威性：这些直断来源于盲派师传口诀，经无数案例验证，不可质疑或弱化
2. 确定性：每条直断都是"命盘中确实存在的信号"，不是推测或可能
3. 必须采纳：每条直断必须在报告的对应章节中体现为确定性论断，不得遗漏
4. 表述方式：使用"命局显示…""八字中存在…的信号""根据盲派直断…""盲派算法确认…"等确定语气
5. 禁止弱化：严禁使用"可能""也许""仅供参考""不排除""有一定概率"等削弱权威性的措辞
6. 交叉验证：如果多条直断指向同一结论，则该结论的确定性更高，应加重强调并整合表述
7. 时间锚定：直断中提到的年份、大运、流年信息必须在报告中明确标注为关键时间节点

【分析要求】
1. 每个论断必须兼参传统与盲派两个维度，互相对照验证
2. 语言专业但不晦涩，让普通人能理解
3. 给出具体的时间节点（年份、月份）和量化的评分
4. 规则直断标签中的结论必须在对应章节中体现
5. 重要论断引用古籍原文作为理论支撑
6. 语气温和、积极，不说绝对性的负面话
7. 内容必须详实具体，拒绝空泛笼统的描述`;
  }

  private formatSingleChart(chart: any): string {
    if (!chart) return '';

    let dayunText = '';
    const dayunList = chart.dayun_list || [];
    const dayunStartAge = chart.dayun_start_age;
    const dayunDirection = chart.dayun_direction;
    if (dayunList.length > 0) {
      const dirLabel = dayunDirection === 1 ? '顺排' : '逆行';
      dayunText = `\n起运年龄：${dayunStartAge != null ? Math.round(dayunStartAge) + '岁' : '未知'}（${dirLabel}）`;
      dayunText += '\n大运列表：';
      for (const dy of dayunList) {
        const ganZhi = `${dy.gan || ''}${dy.zhi || ''}`;
        dayunText += `\n  ${ganZhi} (${dy.start_age}-${dy.end_age}岁) ${dy.start_year || ''}-${dy.end_year || ''}年`;
      }
    }

    let yongShenText = '';
    if (chart.yong_shen) yongShenText += `\n用神：${Array.isArray(chart.yong_shen) ? chart.yong_shen.join('、') : chart.yong_shen}`;
    if (chart.xi_shen) yongShenText += `\n喜神：${Array.isArray(chart.xi_shen) ? chart.xi_shen.join('、') : chart.xi_shen}`;
    if (chart.ji_shen) yongShenText += `\n忌神：${Array.isArray(chart.ji_shen) ? chart.ji_shen.join('、') : chart.ji_shen}`;

    let patternText = '';
    if (chart.pattern_name) patternText = `\n格局：${chart.pattern_name}${chart.pattern_type ? ` (${chart.pattern_type})` : ''}`;

    // Precomputed hidden stem ten god mapping — authoritative ground truth, never hallucinate
    let zhiTenGodText = '';
    if (chart.zhi_ten_gods && Object.keys(chart.zhi_ten_gods).length > 0) {
      const entries = Object.entries(chart.zhi_ten_gods) as [string, string][];
      zhiTenGodText = '\n【预计算藏干十神 — 绝对权威，严禁任何自行推导】';
      zhiTenGodText += '\n以下每个地支的藏干及十神由排盘引擎根据标准藏干表精确计算，是唯一正确的答案。';
      zhiTenGodText += '\n分析时只能引用此数据，严禁自行判断地支藏了哪些天干或推导十神关系。';
      zhiTenGodText += '\n四墓库特别提醒：辰=水库(戊乙癸)，戌=火库(戊辛丁)，丑=金库(己癸辛)，未=木库(己丁乙)。';
      for (const [key, val] of entries) {
        zhiTenGodText += `\n  ${key} → ${val}`;
      }
    }

    // Blind school direct judgment formulas — authoritative facts, must be incorporated into report
    let mangpaiDirectText = '';
    if (chart.mangpai_direct_rules && Array.isArray(chart.mangpai_direct_rules) && chart.mangpai_direct_rules.length > 0) {
      mangpaiDirectText = '\n【盲派铁口直断 — 算法匹配的确定性结论，必须在报告中作为事实陈述】';
      for (const rule of chart.mangpai_direct_rules) {
        mangpaiDirectText += `\n  ■ ${rule}`;
      }
    }

    // Precomputed stem-branch relationships from calendar engine
    let relationsText = '';
    if (chart.relations && Array.isArray(chart.relations) && chart.relations.length > 0) {
      relationsText = '\n【干支关系 — 日历引擎精确计算，直接引用，严禁自行推导】';
      const relGroups: Record<string, string[]> = {};
      for (const rel of chart.relations) {
        const t = rel.type || rel.关系类型 || '其他';
        const desc = rel.description || rel.关系描述 || rel.desc || '';
        const pillars = rel.pillars || rel.涉及柱 || '';
        const key = `${t}:${desc}`;
        if (!relGroups[key]) relGroups[key] = [];
        if (pillars) relGroups[key].push(pillars);
      }
      for (const [key, pList] of Object.entries(relGroups)) {
        relationsText += `\n  • ${key}`;
        if (pList.length > 0 && pList[0]) relationsText += ` (涉及: ${pList.join(', ')})`;
      }
    }

    return `
四柱：${chart.year_pillar?.gan || ''}${chart.year_pillar?.zhi || ''} ${chart.month_pillar?.gan || ''}${chart.month_pillar?.zhi || ''} ${chart.day_pillar?.gan || ''}${chart.day_pillar?.zhi || ''} ${chart.hour_pillar?.gan || ''}${chart.hour_pillar?.zhi || ''}
日主：${chart.day_master || ''} (${chart.day_master_wuxing || ''})
日主强弱：${chart.strength_level || ''} (${chart.day_master_strength || 0}分)
五行分布：${JSON.stringify(chart.wuxing_counts || {})}
神煞：${(chart.shensha_list || []).join('、')}${zhiTenGodText}${mangpaiDirectText}${relationsText}
性别：${chart.gender === 1 ? '男' : '女'}${patternText}${yongShenText}${dayunText}`;
  }

  private buildUserPrompt(template: string, options: AiGenerateOptions): string {
    const { chartData, ruleResults, healthData, reportType, isPaid } = options;

    const pillarInfo = chartData ? (() => {
      // Handle pairing dual-chart data
      if (chartData.userA && chartData.userB) {
        const pairingType = ruleResults?.pairingType || 'comprehensive';
        const labelA = pairingType === 'hehun' ? '男命' : '甲方';
        const labelB = pairingType === 'hehun' ? '女命' : '乙方';
        return `【${labelA}命盘】${this.formatSingleChart(chartData.userA)}
【${labelB}命盘】${this.formatSingleChart(chartData.userB)}`;
      }
      return this.formatSingleChart(chartData);
    })() : '';

    const ruleInfo = (() => {
      if (!ruleResults) return '';

      let info = '';
      const pairingType = ruleResults.pairingType;
      if (pairingType) {
        const typeLabel = {
          personality: '性格匹配', career: '事业合作', wealth: '财运互补',
          hehun: '合婚分析', comprehensive: '综合配对',
        }[pairingType] || pairingType;
        info += `\n配对类型：${typeLabel}`;
        info += `\n综合评分：${ruleResults.totalScore}分（${ruleResults.level}）`;
      }

      info += `\n标签：${(ruleResults.tags || []).join('、')}`;
      info += `\n各维度评分：${JSON.stringify(ruleResults.scores || {})}`;

      if (ruleResults.highlights?.length) info += `\n配对优势：${ruleResults.highlights.join('；')}`;
      if (ruleResults.cautions?.length) info += `\n注意事项：${ruleResults.cautions.join('；')}`;

      // Extract all direct judgment texts from matched rules (generate_text actions)
      const directTexts: string[] = [];
      if (ruleResults.modules) {
        for (const [, results] of Object.entries(ruleResults.modules)) {
          for (const r of (results as any[])) {
            if (r.matched && r.texts && r.texts.length > 0) {
              directTexts.push(...r.texts);
            }
          }
        }
      }
      if (directTexts.length > 0) {
        info += '\n\n【盲派铁口直断 — 以下为规则引擎匹配的确定性结论，必须在报告对应章节中以"命局显示…""根据盲派直断…"等确定语气陈述，严禁使用"可能""或许"等模糊词】';
        for (const text of directTexts) {
          info += `\n■ ${text}`;
        }
      }

      return info;
    })();

    const healthInfo = this.buildHealthInfo(healthData, chartData);

    // 藏干数据校准提醒 — 追加到所有报告 prompt 末尾，防止 AI 自行推导
    const hiddenStemGuard = chartData ? `

【⚠️ 藏干十神数据校准 — 分析前必读】
命盘中的「预计算藏干十神」是排盘引擎根据标准十二地支藏干表精确计算的结果，具有绝对权威性。
四墓库藏干绝对规则：辰(水库)=戊乙癸、戌(火库)=戊辛丁、丑(金库)=己癸辛、未(木库)=己丁乙。
严禁自行推断地支中藏了哪些天干或推导十神关系。所有关于藏干、十神、财库的论述，必须与预计算藏干十神数据完全一致。如预计算数据显示辰中藏癸水为偏财，则辰中藏干就是戊乙癸，绝不能出现丁火。` : '';

    if (template) {
      let result = template
        .replace('{{pillar_info}}', pillarInfo)
        .replace('{{rule_info}}', ruleInfo)
        .replace('{{health_info}}', healthInfo)
        .replace('{{report_type}}', reportType);

      // Xiaoliuren template variables
      if (reportType === 'xiaoliuren' && chartData) {
        result = result
          .replace('{{input_type}}', chartData.input_type || '')
          .replace('{{month}}', chartData.month != null ? String(chartData.month) : '')
          .replace('{{day}}', chartData.day != null ? String(chartData.day) : '')
          .replace('{{hour_branch}}', chartData.hour_branch || '')
          .replace('{{random1}}', chartData.random1 != null ? String(chartData.random1) : '')
          .replace('{{random2}}', chartData.random2 != null ? String(chartData.random2) : '')
          .replace('{{random3}}', chartData.random3 != null ? String(chartData.random3) : '')
          .replace('{{palm_name}}', chartData.palm_name || '')
          .replace('{{palm_position}}', chartData.palm_position != null ? String(chartData.palm_position) : '')
          .replace('{{palm_wuxing}}', chartData.palm_wuxing || '')
          .replace('{{palm_luck_level}}', chartData.palm_luck_level || '')
          .replace('{{palm_direction}}', chartData.palm_direction || '')
          .replace('{{palm_detailed_text}}', chartData.palm_detailed_text || '')
          .replace('{{user_question}}', chartData.user_question || '')
          .replace('{{has_question}}', chartData.has_question ? 'true' : '')
          .replace('{{rule_texts}}', chartData.rule_texts || '');
        // Handle mustache sections: {{#has_question}}...{{/has_question}}
        if (!chartData.has_question) {
          result = result.replace(/\{\{#has_question\}\}[\s\S]*?\{\{\/has_question\}\}/g, '');
        } else {
          result = result.replace(/\{\{#has_question\}\}/g, '').replace(/\{\{\/has_question\}\}/g, '');
        }
        // Handle {{^has_question}}...{{/has_question}}
        if (chartData.has_question) {
          result = result.replace(/\{\{\^has_question\}\}[\s\S]*?\{\{\/has_question\}\}/g, '');
        } else {
          result = result.replace(/\{\{\^has_question\}\}/g, '').replace(/\{\{\/has_question\}\}/g, '');
        }
        // Clean other mustache sections
        result = result.replace(/\{\{#time_input\}\}[\s\S]*?\{\{\/time_input\}\}/g, chartData.input_type === 'time' ? '' : '')
          .replace(/\{\{#random_input\}\}[\s\S]*?\{\{\/random_input\}\}/g, chartData.input_type === 'random' ? '' : '')
          .replace(/\{\{#has_rules\}\}[\s\S]*?\{\{\/has_rules\}\}/g, chartData.rule_texts ? '' : '')
          .replace(/\{\{#[^}]+\}\}/g, '').replace(/\{\{\/[^}]+\}\}/g, '')
          .replace(/\{\{\^[^}]+\}\}/g, '');
      }

      return result + hiddenStemGuard;
    }

    // Xiaoliuren fallback (when no DB prompt configured)
    if (reportType === 'xiaoliuren' && chartData) {
      const xlrInfo = `掌诀落位：${chartData.palm_name || ''}（第${chartData.palm_position || ''}位）
五行：${chartData.palm_wuxing || ''} | 吉凶：${chartData.palm_luck_level || ''} | 方位：${chartData.palm_direction || ''}
推算方式：${chartData.input_type === 'time' ? `农历${chartData.month || ''}月${chartData.day || ''}日 ${chartData.hour_branch || ''}时` : `上数${chartData.random1 || ''} 中数${chartData.random2 || ''} 下数${chartData.random3 || ''}`}
断辞：${chartData.palm_detailed_text || ''}
${chartData.user_question ? `用户所问：${chartData.user_question}` : ''}
${chartData.rule_texts ? `规则参考：${chartData.rule_texts}` : ''}`;

      return `你是用户的小六壬（马前课）占卜顾问，精通小六壬掌诀推算法和六神解读。

## 占卜数据
${xlrInfo}

## 六掌诀参考
1.大安(青龙·木·大吉) 2.留连(玄武·水·凶) 3.速喜(朱雀·火·中吉) 4.赤口(白虎·金·大凶) 5.小吉(六合·水·小吉) 6.空亡(勾陈·土·大凶)

## 要求
输出严格JSON格式：{"title":"标题","overview":"总体判断","sections":[{"title":"掌诀总断","content":"...","highlights":["要点"],"score":80},{"title":"事项分析","content":"...","highlights":["要点"]},{"title":"吉凶提示","content":"...","highlights":["要点"]},{"title":"行动建议","content":"...","highlights":["要点"]}],"summary":"总结","tags":["标签"],"overallScore":75}
1. 掌诀为核心，结合五行生克和六神属性判断
2. 吉则言吉，凶则言凶，凶兆给出化解方向
3. 每个section至少200字，highlights 3-5个要点
4. overallScore参考：大安75-90/留连15-30/速喜65-80/赤口5-20/小吉55-70/空亡5-15`;
    }

    // Digital Energy fallback
    if (reportType === 'digital_energy' && chartData) {
      const deInfo = `手机号：${chartData.phone || ''}
末4位核心能量：${chartData.last_four || ''}
全号星位：${chartData.stars || ''}
主导星：${chartData.dominant_star || ''} | 吉星占比：${chartData.lucky_percent || 0}%
五行分布：${chartData.wuxing_dist || ''}
${chartData.has_special ? `特殊数字影响：${chartData.special_digits || ''}` : ''}
0的潜伏分析（${chartData.zero_count || '0'}个0，${chartData.zero_pairs || '0'}组0-组合）：
${chartData.zero_analysis || '无'}
5的显化分析（${chartData.five_count || '0'}个5，${chartData.five_pairs || '0'}组5-组合）：
${chartData.five_analysis || '无'}
概要：${chartData.summary || ''}
建议：${chartData.suggestion || ''}
${chartData.user_question ? `用户所问：${chartData.user_question}` : ''}
${chartData.rule_texts ? `规则参考：${chartData.rule_texts}` : ''}`;

      return `你是一位资深数字能量学分析师，精通八星磁场理论和手机号码数字能量解读。数字能量学源自《河图洛书》和八卦原理，通过数字的五行属性和磁场能量，洞察人生各方面的吉凶趋势。

## 八星磁场体系
### 四吉星
- 天医（大吉·土）：13/31(一级) 68/86(二级) 49/94(三级) 27/72(四级) — 主正财运、婚姻美满、身体健康。土生金，利于投资积累。天医能量越强，财运越稳定。
- 生气（大吉·木）：14/41(一级) 67/76(二级) 39/93(三级) 28/82(四级) — 主贵人相助、人缘极佳、活力充沛。木主生发，利于事业拓展和人际网络。
- 延年（中吉·金）：19/91(一级) 78/87(二级) 34/43(三级) 26/62(四级) — 主事业有成、领导能力、寿命绵长。金主刚毅，决策果断，适合管理岗位。
- 伏位（小吉·木）：11/22(一级) 33/44(二级) 66/77(三级) 88/99(四级) — 主蓄势待发、稳中求进。宜静不宜动，等待最佳时机。

### 四凶星
- 绝命（大凶·金）：12/21(一级) 69/96(二级) 48/84(三级) 37/73(四级) — 主破财损利、投资风险、需防意外血光。金过刚易折。
- 五鬼（大凶·火）：18/81(一级) 79/97(二级) 36/63(三级) 24/42(四级) — 主突发变故、官非口舌、血光之灾。火性多变，情绪易波动。
- 六煞（凶·水）：16/61(一级) 47/74(二级) 38/83(三级) 29/92(四级) — 主桃花劫扰、人际关系复杂、情绪起伏。水性多情，易受外界影响。
- 祸害（凶·土）：17/71(一级) 89/98(二级) 46/64(三级) 23/32(四级) — 主口舌是非、小人暗算、疾病困扰。土性滞重，易积劳成疾。

### 特殊数字法则
- 0：隐藏、潜伏、减弱能量。0在数字中代表"无"和"空"，会削弱相邻数字的能量，使吉星减力约50%、凶星潜伏不发。0如同一道"能量屏障"，被0压制的数字能量虽未消失但难以显现。0越多，潜伏越深。
  - 0+1：才能潜伏（领导力被埋没）
  - 0+2：沟通闭塞（表达受阻）
  - 0+3：行动迟滞（执行力下降）
  - 0+4：智慧蒙蔽（策划力减弱）
  - 0+6：财运潜伏（财富机会难把握）
  - 0+7：口才受抑（社交能力下降）
  - 0+8：权力潜伏（事业难突破）
  - 0+9：机会错失（眼界受阻）
  - 00双0：能量完全空亡
- 5：显化、加强、连接能量。5在数字中代表"中"和"显"，会增强相邻数字的能量。5是一把双刃剑——吉星被5放大则更吉，凶星被5放大则更凶。
- 能量层级：一级（最强）→ 二级 → 三级 → 四级（最弱）。末4位为最强能量区。

### 数字组合互化
- 吉凶相邻：吉星可化解凶星，凶星会拖累吉星。需要看具体排列顺序。
- 五行相生：木生火→火生土→土生金→金生水→水生木
- 五行相克：木克土→土克水→水克火→火克金→金克木

## 测算数据
${deInfo}

## 输出要求
严格输出JSON格式，不要包含markdown代码块标记：

{
  "title": "手机号${chartData.phone || ''}数字能量分析报告",
  "overview": "150-200字总体判断，包含号码吉凶等级（大吉/中吉/小吉/凶/大凶）、主导能量星、核心优势和主要风险",
  "sections": [
    {
      "title": "核心能量解读",
      "content": "分析末4位（最强能量区）的数字组合。逐对解读每对数字的八星属性、能量层级、五行生克关系。重点解读0和5对各数字对的影响——0压制了多少能量、5放大了多少能量，给出具体数值化评估（如：某吉星被0压制至原能量的40%）。300-500字。",
      "highlights": ["末4位核心星：XX+XX", "主导能量：...", "0/5影响评估：...", "能量层级评估：..."],
      "score": 80
    },
    {
      "title": "财运事业分析",
      "content": "结合天医（正财）、延年（事业）、绝命（投资风险）等星的分布，分析财运走势、事业方向、投资建议。包含具体的能量层级判断和时间节点预估。300-400字。",
      "highlights": ["财运趋势：...", "事业方向建议：...", "投资注意事项：..."],
      "score": 75
    },
    {
      "title": "婚姻人际分析",
      "content": "结合六煞（桃花）、生气（贵人）、天医（婚姻）等星的分布，分析感情运势、人际网络、贵人方向。解读桃花是正缘还是劫扰。300-400字。",
      "highlights": ["感情趋势：...", "人际建议：...", "贵人方位：..."],
      "score": 70
    },
    {
      "title": "健康运势分析",
      "content": "结合祸害（疾病）、绝命（血光）、五鬼（意外）等星的分布，分析健康隐患、需要注意的身体部位（五行对应五脏）。给出具体的保健建议。300-400字。",
      "highlights": ["健康隐患：...", "保健重点：...", "注意事项：..."],
      "score": 65
    },
    {
      "title": "化解优化建议",
      "content": "针对号码中出现的凶星给出具体的化解方案：1）建议添加的吉星数组 2）五行调和方案（饰品/颜色/方位）3）日常行为建议。给出1-2个优化后的号码建议（保持原号其他位不变，仅优化关键位置）。300-400字。",
      "highlights": ["具体化解数组：...", "五行调和方案：...", "优化号码建议：..."],
      "score": 75
    }
  ],
  "summary": "150字精炼总结，包含：号码吉凶等级、关键能量星、最重要的1-2条建议",
  "tags": ["天医", "延年", "财富", "事业"],
  "overallScore": 75
}

## 评分标准
- overallScore：吉星占比80%+ → 85-95分，60-80% → 65-80分，40-60% → 45-65分，<40% → 20-45分
- 末4位权重50%，全号权重50%
- 0和5的特殊影响可加减5-10分

## 分析规则
1. 末4位为最强能量区（权重最高），必须详细逐对解读
2. 吉则言吉，凶则言凶，凶星必须给出具体化解方案
3. **0/5专项分析（必须）**：
   - 若有0-组合：逐组分析0压制了哪个数字的什么能量，评估压制程度（轻度30%/中度50%/重度70%），给出"破0"激活方案
   - 若有5-组合：分析5放大了哪个数字的什么能量，判断放大后是吉是凶
   - 0的化解：金属饰品（金克木破0之滞）、红色物品（火生土通0之塞）、主动社交和行动（以动破静）
   - 5的调和：若5放大凶星，用水属性（蓝/黑）平稳其波动
4. 能量层级一级最强、四级最弱，层级越高影响越大
5. 五行生克关系需在分析中体现
6. 每个section至少300字，highlights 3-5个要点
7. 语言专业但不晦涩，让普通人能理解
8. 语气温和正面，即使凶星也不危言耸听，重点放在化解方案上`;
    }

    // Health (五运六气) fallback
    if (reportType === 'health' && chartData) {
      const hlInfo = `【当前运气】目标日期：${chartData.targetDate || ''} | 干支：${chartData.yearGanZhi || ''}
岁运：${chartData.yearYun || ''} | 司天：${chartData.sitian || ''} | 在泉：${chartData.zaiquan || ''}
主气六步：${chartData.hostQi || ''}
客气六步：${chartData.guestQi || ''}
当前主客气：${chartData.currentQi || ''}
当前运气综合：${chartData.combinedAnalysis || ''}
${chartData.dailyTip ? `每日提示：${chartData.dailyTip}` : ''}
${chartData.birthYun ? `【先天运气】生于${chartData.birthYun} | ${chartData.birthAnalysis || ''}` : ''}
${chartData.baziWuxing ? `【八字五行】${chartData.baziWuxing}` : ''}
【体质倾向】${chartData.constitution || ''} | 体质评分：${chartData.constitutionScores || ''}
【燥湿分析】${chartData.drynessDampness || ''} | 燥湿建议：${chartData.drynessAdvice || ''}
【脏腑状态】${chartData.organStatus || ''}
${chartData.has_symptoms ? `【用户症状】${chartData.symptoms || ''}\n【症状辨证】${chartData.symptomMatches || ''}` : ''}
${chartData.user_question ? `【用户问题】${chartData.user_question}` : ''}
${chartData.hasWeightData ? `【体重管理数据】
身高：${chartData.height}cm | 体重：${chartData.weight}kg | BMI：${chartData.bmi}（${chartData.bmiCategory}）
《灵枢》体型分类：${chartData.tcmBodyType}
中医证型：${chartData.tcmWeightPattern}
脾胃分析：${chartData.spleenStomachAnalysis}
湿气诊断：${chartData.weightDampnessLevel}
饮食建议：${chartData.dietaryAdvice}
推荐穴位：${chartData.acupoints}
运动建议：${chartData.exerciseAdvice}
药食同源：${chartData.herbSuggestions}
《内经》引用：${chartData.neijingQuotes}` : ''}
${chartData.rule_texts ? `【规则参考】${chartData.rule_texts}` : ''}`;
      return `你是资深中医五运六气健康养生专家，精通《黄帝内经》运气七篇大论（天元纪大论、五运行大论、六微旨大论、气交变大论、五常政大论、六元正纪大论、至真要大论），以及《伤寒论》《金匮要略》《温病条辨》等经典。请以中医"天人相应"整体观为指导，进行专业五运六气健康分析。

## 核心理论框架

### 天干化运（岁运）
甲己化土、乙庚化金、丙辛化水、丁壬化木、戊癸化火。
阳干（甲丙戊庚壬）为太过——本气偏盛，邪气易乘虚而入。
阴干（乙丁己辛癸）为不及——本气不足，正气虚弱易受邪侵。
岁运统管全年气候大格局，是五运六气分析的基石。

### 地支化气（司天在泉）
子午：少阴君火司天/阳明燥金在泉。丑未：太阴湿土司天/太阳寒水在泉。
寅申：少阳相火司天/厥阴风木在泉。卯酉：阳明燥金司天/少阴君火在泉。
辰戌：太阳寒水司天/太阴湿土在泉。巳亥：厥阴风木司天/少阳相火在泉。
司天主上半年气候，在泉主下半年气候，两者对人体影响各有侧重。

### 主气六步（固定不变，从大寒起）
初之气厥阴风木→二之气少阴君火→三之气少阳相火→四之气太阴湿土→五之气阳明燥金→终之气太阳寒水。每步约60日。

### 客气六步（随司天变化）
司天位于三之气，在泉位于终之气。其余按三阴三阳（厥阴→少阴→太阴→少阳→阳明→太阳）顺序递推。

### 五行生克乘侮
相生：木生火→火生土→土生金→金生水→水生木
相克：木克土→土克水→水克火→火克金→金克木
相乘：克之太过。相侮：反克其所不胜。
岁运五行与司天在泉五行的生克关系是判断全年脏腑疾病趋势的关键。

### 五脏六腑体系
木→肝(胆)·主筋·开窍于目·其华在爪·在志为怒
火→心(小肠)·主血脉·开窍于舌·其华在面·在志为喜
土→脾(胃)·主肌肉·开窍于口·其华在唇·在志为思
金→肺(大肠)·主皮毛·开窍于鼻·其华在毛·在志为悲
水→肾(膀胱)·主骨·开窍于耳·其华在发·在志为恐

### 九种体质特征
平和质（阴阳调和）| 气虚质（元气不足·疲乏气短）| 阳虚质（阳气不足·畏寒怕冷）
阴虚质（阴液亏少·口干咽燥）| 痰湿质（体形肥胖·痰多胸闷）| 湿热质（面垢油光·口苦口干）
血瘀质（肤色晦暗·舌质紫暗）| 气郁质（神情抑郁·忧虑脆弱）| 特禀质（先天失常·过敏体质）

### 燥湿理论
燥为阳邪，易伤津液，肺为娇脏最易受燥邪侵袭。
湿为阴邪，易困脾阳，脾喜燥恶湿，湿盛则濡泻。
燥湿平衡是中医"中和"思想的核心体现，直接关联津液代谢和脾胃运化。

### 肥胖与消瘦的中医理论（《黄帝内经》体重管理）

**核心病机 — 脾主运化**：《素问·经脉别论》"饮入于胃，游溢精气，上输于脾，脾气散精，上归于肺。"脾为后天之本，主运化水谷精微和水湿。脾失健运则水湿内停，聚而为痰为饮，形成肥胖。《素问·至真要大论》"诸湿肿满，皆属于脾。"

**《灵枢·卫气失常》三类肥胖**：
- **膏人**："多气而皮纵缓，故能纵腹垂腴"——腹部型肥胖，气虚痰湿，脾阳虚衰
- **脂人**："虽脂不能大者，血清气滑少"——均匀型超重，痰湿内蕴，气血尚可
- **肉人**："上下容大"——肌肉型肥胖，痰瘀互结，三焦气化失常

**肥胖证型体系**：
1. 脾虚痰湿（最常见）：脾虚运化失职，水湿内停化痰 — 身体困重、腹胀、大便溏
2. 胃热湿阻：胃火炽盛，食欲亢进，湿热互结 — 消谷善饥、口干口臭
3. 肝郁气滞：气机不畅，脂肪分布不均 — 胸胁胀满、情绪性进食
4. 脾肾阳虚：阳气不足，代谢低下 — 畏寒、水肿、乏力
5. 阴虚燥热：阴液亏虚，虚火内生 — 形体偏瘦但腹部肥胖

**消瘦证型体系**：
1. 脾虚消瘦（最常见）：脾不运化，肌肉失养 — 食少、乏力、肌肉松软
2. 阴虚消瘦：阴液不足，形体失濡 — 口干、盗汗、五心烦热
3. 气血两虚消瘦：生化乏源，全身失养 — 面黄、心悸、月经量少

**《素问·通评虚实论》**："肥贵人则高粱之疾也。"——肥胖与饮食膏粱厚味直接相关。
**《素问·奇病论》**："此人必数食甘美而多肥也。"——过食甘美是肥胖的主要病因。
**《素问·生气通天论》**："高粱之变，足生大丁。"——膏粱厚味化热生毒，可致痈疽疔疮。
**《素问·痿论》**："脾主身之肌肉。"——脾的运化功能直接决定肌肉丰满与否。
**《灵枢·本神》**："脾气虚则四肢不用，五脏不安。"——脾虚则肌肉消瘦、乏力。
**《素问·阴阳应象大论》**："形不足者，温之以气；精不足者，补之以味。"——消瘦的补益原则。

**药食同源体重管理原则**：
- 健脾祛湿（肥胖核心）：薏苡仁、茯苓、白术、陈皮、赤小豆、冬瓜皮
- 温阳化气（阳虚肥胖）：桂枝、干姜、肉桂、黄芪
- 化痰降脂（痰瘀互结）：山楂、决明子、荷叶、丹参、泽泻
- 健脾益气（消瘦核心）：山药、大枣、黄芪、党参、白术
- 滋阴养血（阴虚消瘦）：枸杞、熟地、当归、沙参、麦冬

**体重管理关键穴位**：
- 丰隆（足阳明胃经·络穴）：化痰要穴，专治痰湿肥胖
- 阴陵泉（足太阴脾经·合穴）：健脾利湿，水湿肥胖首选
- 天枢（足阳明胃经·大肠募穴）：调理肠胃，减腹要穴
- 中脘（任脉·胃募穴）：健脾和胃，化湿降逆
- 足三里（足阳明胃经·合穴）：补脾胃、益气血，双向调节体重
- 关元（任脉·小肠募穴）：温阳化气，提升基础代谢
- 水道（足阳明胃经）：利水消肿，专治水湿滞留

### 经络穴位体系
十二正经：手三阴(太阴肺/少阴心/厥阴心包)·手三阳(阳明大肠/太阳小肠/少阳三焦)·足三阴(太阴脾/少阴肾/厥阴肝)·足三阳(阳明胃/太阳膀胱/少阳胆)
奇经八脉：督脉(阳脉之海)·任脉(阴脉之海)·冲脉(血海)·带脉(约束诸经)·阴跷阳跷·阴维阳维
常用要穴：足三里(健脾和胃)·太冲(平肝潜阳)·神门(宁心安神)·太渊(补肺益气)·太溪(滋阴补肾)·内关(宽胸理气)·关元(温阳固本)·三阴交(调经养血)·合谷(疏风解表)·百会(升阳举陷)

### 药食同源原则
辛散(姜·葱·薄荷)→酸收(乌梅·山楂·醋)→甘缓(甘草·大枣·蜂蜜)→苦坚(黄连·黄芩·苦瓜)→咸软(海藻·昆布·盐)
五色入五脏: 青入肝·赤入心·黄入脾·白入肺·黑入肾
五味入五脏: 酸入肝·苦入心·甘入脾·辛入肺·咸入肾

## 测算数据
${hlInfo}

## 输出格式（严格JSON）
{
  "title": "五运六气健康养生深度分析报告",
  "overview": "250-350字总体判断。需包含：(1)岁运和司天在泉的核心影响总结 (2)用户体质与当前运气的关系 (3)最重要的2-3条健康建议。语言专业且温暖。",
  "sections": [
    {
      "title": "五运六气深度解读",
      "content": "分四个维度分析：(1)岁运${chartData.yearYun || ''}对人体的影响——太过/不及之年，本气与五脏的关系 (2)司天${chartData.sitian || ''}在泉${chartData.zaiquan || ''}的全年作用——上半年与下半年的不同重点 (3)当前六气阶段(${chartData.currentQi || ''})的主客气关系——客主加临的吉凶判断 (4)${chartData.birthYun ? '先天运气与当前运气的叠加效应——体质基础与当前气候的相互作用' : '综合运气评估'}。引用《黄帝内经》相关原文。400-500字。",
      "highlights": ["岁运核心影响", "司天在泉重点", "客主加临判断", "运气叠加效应"],
      "score": 80
    },
    {
      "title": "体质与脏腑经络分析",
      "content": "分四个层面：(1)体质判定——基于${chartData.constitution || '计算数据'}的9种体质匹配分析，说明体质形成的运气和八字原因 (2)五行偏盛偏衰——结合八字五行${chartData.baziWuxing || '数据'}分析各脏腑功能状态 (3)${chartData.drynessDampness ? `燥湿分析——${chartData.drynessDampness}，说明对津液代谢和脾胃运化的影响` : '燥湿平衡评估'} (4)经络状态——基于脏腑虚实推演相关经络的气血盛衰。400-500字。",
      "highlights": ["体质类型及成因", "脏腑虚实状态", "燥湿影响评估", "经络气血分析"],
      "score": 75
    },
    {
      "title": "个性化饮食养生方案",
      "content": "基于运气和体质的完整食疗方案：(1)宜食——列出10种以上推荐食材并说明原因 (2)忌食——列出5种以上需避免的食物 (3)推荐药膳——2-3个具体药膳方（含食材、做法、功效） (4)茶饮建议——适合当前运气的代茶饮 (5)五味调和——基于五行生克的调味建议。400-500字。",
      "highlights": ["推荐食材清单", "需避免食物", "药膳方推荐", "茶饮建议"],
      "score": 75
    },
    {
      "title": "经络穴位保健指导",
      "content": "(1)重点穴位——推荐5-8个穴位，说明每个穴位的定位、功效、按摩方法（按压/按揉/点按）和频率 (2)经络疏通——针对当前运气影响的经络，推荐疏通方法（拍打/刮痧/拔罐） (3)艾灸方案——根据体质虚实推荐艾灸穴位、时间和注意事项 (4)足浴/药浴建议。300-400字。",
      "highlights": ["重点穴位及按摩法", "经络疏通方案", "艾灸建议", "足浴药浴"],
      "score": 70
    },
    {
      "title": "生活起居与运动情志",
      "content": "(1)作息建议——基于《黄帝内经》四气调神大论的起居时间建议 (2)运动方案——根据体质推荐运动类型（太极/八段锦/五禽戏/散步/游泳）、强度和频率 (3)情志调理——基于五脏-五志关系的情志养生法（怒伤肝·喜伤心·思伤脾·悲伤肺·恐伤肾） (4)季节养生——当前季节的具体养生要点和注意事项。300-400字。",
      "highlights": ["作息时间建议", "运动类型和强度", "情志调理方法", "季节养生要点"],
      "score": 70
    },
    {
      "title": "疾病预防与健康预警",
      "content": "(1)运气致病趋势——基于当前运气格局，分析最易发病的脏腑系统和疾病类型 (2)先天薄弱环节——结合先天运气和体质，指出需要长期关注的健康风险 (3)季节性疾病预防——当前六气阶段和下一阶段的疾病预防重点 (4)就医建议——出现何种症状应及时就医 (5)${chartData.has_symptoms ? '针对用户当前症状的专项调理建议' : '日常健康监测要点'}。300-400字。",
      "highlights": ["易发疾病预警", "先天薄弱环节", "季节性预防重点", "就医指标"],
      "score": 65
    }${chartData.hasWeightData ? `,
    {
      "title": "体重管理专项分析（基于《黄帝内经》）",
      "content": "基于《灵枢·卫气失常》和《素问》相关理论，结合用户身高${chartData.height}cm、体重${chartData.weight}kg、BMI ${chartData.bmi}（${chartData.bmiCategory}）的客观数据和中医五运六气分析：(1)《灵枢》体型判定——用户属于${chartData.tcmBodyType}类型，引用《灵枢·卫气失常》原文解释该体型的生理特征和形成机理 (2)证型分析——基于八字五行和当前五运六气，用户体重异常的证型为${chartData.tcmWeightPattern}，详细分析脾主运化功能的状态和痰湿/气血的盛衰 (3)脾胃功能诊断——${chartData.spleenStomachAnalysis}，深入分析脾失健运与体重异常的关系 (4)湿气诊断——${chartData.weightDampnessLevel}，说明燥湿平衡对体重管理的影响 (5)饮食调理——${chartData.dietaryAdvice} (6)穴位保健——推荐${chartData.acupoints}等穴位，说明定位、功效、按摩方法和频率 (7)运动方案——${chartData.exerciseAdvice} (8)药食同源——推荐${chartData.herbSuggestions}等（共引用至少2条《内经》原文）。400-500字。",
      "highlights": ["《灵枢》体型分类诊断", "脾主运化功能评估", "痰湿/气血证型分析", "药食同源具体方案", "穴位保健操作指导", "运动类型及强度建议"],
      "score": 80
    }` : ''}
  ],
  "summary": "200字精炼总结：运气核心判断+体质关键问题+最重要的3条行动建议",
  "tags": ["五运六气","体质调理","经络养生","药膳食疗","${chartData.constitution || '健康'}","${chartData.yearYun || '岁运'}"],
  "overallScore": 75
}

## 评分标准
- 平和质 + 运气和顺 → 85-95分
- 偏颇体质但运气尚可 → 65-80分
- 偏颇体质 + 运气不利 → 50-70分
- 燥湿严重失衡 + 多脏腑失调 → 40-55分
- 有具体症状时根据严重程度适当下调5-10分

## 分析原则
1. 以五运六气为纲，体质辨证为目，症状为参考
2. 必引《黄帝内经》原文至少2处（如"夫四时阴阳者，万物之根本也""正气存内，邪不可干"等）
3. 每个建议都要有运气或体质依据，不可泛泛而谈
4. 食疗、穴位、药膳等建议必须具体到名称、方法、频率
5. 语言专业但通俗，让普通人能理解并执行
6. 语气温暖、积极，即使有健康风险也不危言耸听
7. 各section至少300字，付费报告至少500字
8. highlights必须有实质性内容，而非空洞标签`;
    }

    // Bazhai fallback
    if (reportType === 'bazhai' && chartData) {
      const bzInfo = `命卦：${chartData.kuaNumber||''}${chartData.trigram||''} | 所属：${chartData.group||''}
出生年份：${chartData.birthYear||''} | 性别：${chartData.gender||''}
八方位吉凶：${chartData.directions||''}
吉方汇总：${chartData.luckyDirs||''}
${chartData.summary||''}
${chartData.user_question?`用户所问：${chartData.user_question}`:''}
${chartData.rule_texts?`规则参考：${chartData.rule_texts}`:''}`;
      return `你是八宅风水（大游年法）命理师，精通命卦计算和八卦方位吉凶判断。

## 八宅风水基础
东四命(坎震巽离):宜东四宅。西四命(乾坤艮兑):宜西四宅。
四吉星:生气(上吉/木·旺财)、天医(上吉/土·健康)、延年(中吉/金·长寿)、伏位(次吉/木·安定)
四凶星:绝命(大凶/金·破财)、五鬼(大凶/火·灾祸)、六煞(中凶/水·桃花)、祸害(次凶/土·口舌)
化解原理:五行相克 — 金(金属饰品)克木、木(绿植)克土、土(陶瓷)克水、水(鱼缸)克火、火(红色)克金

## 测算数据
${bzInfo}

## 要求
输出严格JSON：{"title":"标题","overview":"总体判断","sections":[{"title":"命卦解读","content":"...","highlights":["要点"],"score":85},{"title":"吉利方位详解","content":"...","highlights":["要点"]},{"title":"凶方化解方案","content":"...","highlights":["要点"]},{"title":"空间布局建议","content":"...","highlights":["要点"]},{"title":"宅命相配指南","content":"...","highlights":["要点"]}],"summary":"总结","tags":["标签"],"overallScore":85}
每个section至少300字，highlights 3-5个要点，东四命配东四宅给85-95分，否则70-85分`;
    }

    const isPairing = reportType === 'pairing';
    const sectionGuide = this.buildSectionGuide(reportType, isPaid, ruleResults?.pairingType);
    const lengthGuide = isPaid
      ? '请写一份3000-5000字的深度分析报告，每个章节至少500字，内容详实有深度，包含具体的年份、数据和建议。'
      : '请写一份500-800字的预览报告，包含核心分析章节，展示分析深度。';

    // Pairing-specific prompt with appropriate terminology
    if (isPairing) {
      const pairingType = ruleResults?.pairingType || 'comprehensive';
      const roleDesc = this.getPairingRoleDescription(pairingType);
      return `${roleDesc}

【双方命盘】
${pillarInfo}
${ruleInfo}

报告类型：${reportType}
${lengthGuide}
${sectionGuide}

【分析要求】
1. 结合传统子平法（格局、用神、旺衰）和盲派法（做功、宾主、体用）对双方命盘进行对比分析
2. 每个论断都要基于双方八字的干支关系（合、冲、刑、害、生、克）
3. 给出具体的时间节点（流年、大运）和量化评分
4. 语言专业但不晦涩，让普通人能理解
5. 重要论断引用古籍原文作为理论支撑
6. 语气温和、积极，不说绝对性的负面话
7. ${pairingType === 'hehun' ? '使用"男命""女命"称呼双方' : pairingType === 'career' ? '使用"甲方/合作方""乙方"等商务称呼，避免伴侣/婚姻类词汇' : pairingType === 'personality' ? '使用"双方""彼此"等中性称呼，聚焦性格特质分析，避免情感/婚姻词汇' : '根据配对类型使用恰当的称呼'}

【输出格式】
请使用纯文本Markdown格式输出，不要JSON。结构如下：
## 配对总览
200字概述双方命盘的核心特点和互补关系

## ${pairingType === 'personality' ? '性格互补分析' : pairingType === 'career' ? '事业协同分析' : pairingType === 'wealth' ? '财运互补分析' : pairingType === 'hehun' ? '合婚匹配分析' : '综合配对分析'}
详细分析（至少400字），包含天干地支的合冲关系解读

## 关键时间节点
列出3-5个重要年份及预测

## 综合建议
150字精炼总结和建议`;
    }

    return `你是一位精通传统子平命理和盲派命理的大师级命理分析师。请根据以下命盘信息进行${reportType}专业分析。

${pillarInfo}
${ruleInfo}

报告类型：${reportType}
${lengthGuide}
${sectionGuide}

【分析方法要求】
1. 结合传统子平法（格局、用神、旺衰）和盲派法（做功、宾主、体用、效率）综合分析
2. 每个论断都要有命理依据，不能空泛
3. 给出具体的时间节点（流年、大运）和量化评分
4. 语言专业但不晦涩，让普通人能理解
5. 规则直断中的结论必须体现在对应章节中
6. 重要论断引用古籍原文作为支撑

【输出格式】
请使用纯文本Markdown格式输出，不要JSON，使用## 标题分段。${hiddenStemGuard}`;
  }

  private getPairingRoleDescription(pairingType: string): string {
    const descriptions: Record<string, string> = {
      personality: `你是一位精通传统子平命理和盲派命理的资深性格分析师。请从八字命理角度分析双方的性格特质、五行禀赋和相处模式。

重要提醒：这是性格匹配分析，请聚焦双方的性格特质、思维方式、行为模式的互补性。使用"双方""彼此""甲方""乙方"等中性称呼。**严禁使用"伴侣""婚姻""感情""夫妻""恋人"等情感关系词汇。**`,

      career: `你是一位精通传统子平命理和盲派命理的商业合作顾问。请从八字命理角度分析双方在事业上的合作潜力、职能互补和协同发展。

重要提醒：这是事业合作分析，聚焦于工作能力、资源互补、合作模式。使用"甲方/合作方""乙方""合作伙伴""事业搭档"等商务称呼。**严禁使用"伴侣""婚姻""感情""夫妻""恋人"等私人关系词汇。**`,

      wealth: `你是一位精通传统子平命理和盲派命理的财富管理顾问。请从八字命理角度分析双方的财运配置、求财方式的互补性和财富协作潜力。

重要提醒：这是财运互补分析，聚焦于双方的财运特点、理财观念、资源配置。使用"双方""甲方""乙方"等中性财务称呼。**严禁使用"伴侣""婚姻""感情""夫妻"等情感关系词汇。**`,

      hehun: `你是一位精通传统子平命理和盲派命理的资深合婚命理师。请从八字命理角度分析双方的婚姻匹配度、感情运势和家庭和谐度。

说明：这是合婚匹配分析，使用传统命理称谓"男命""女命"，分析维度包括日主天合、五行互补、地支六合、冲克检查等。`,

      comprehensive: `你是一位精通传统子平命理和盲派命理的大师级综合配对分析师。请从八字命理角度全面分析双方在性格、事业、财运、合婚等多维度的匹配度。

重要提醒：这是综合配对分析，根据分析维度使用恰当的称呼。性格部分使用"双方"，事业部分使用"合作方"，财运部分使用中性称呼，合婚部分使用"男命/女命"。`,
    };
    return descriptions[pairingType] || descriptions.comprehensive;
  }
  private buildSectionGuide(reportType: string, isPaid: boolean, pairingType?: string): string {
    if (!isPaid) return "\n请包含1个核心分析章节。";

    if (reportType === "pairing" && pairingType) {
      const m: Record<string, string> = {
        personality: "\n【必备章节】\n1. 双方日主分析\n2. 五行禀赋互补\n3. 十神配置对比\n4. 相处模式建议",
        career: "\n【必备章节】\n1. 双方格局与事业特质\n2. 五行资源互补\n3. 用神协同分析\n4. 事业合作模式",
        wealth: "\n【必备章节】\n1. 双方财星配置\n2. 求财方式互补\n3. 五行财运分析\n4. 财富协作策略",
        hehun: "\n【必备章节】\n1. 日主天合分析\n2. 五行互补与地支六合\n3. 婚姻宫与配偶星\n4. 大运同步分析",
        comprehensive: "\n【必备章节】\n1. 性格匹配分析\n2. 事业合作分析\n3. 财运互补分析\n4. 合婚匹配分析",
      };
      return m[pairingType] || m.comprehensive;
    }

    const guides: Record<string, string> = {
      free: "\n【必备章节】\n1. 命盘格局解读\n2. 日主强弱与用神\n3. 盲派做功分析",
      wealth: "\n【必备章节】\n1. 财星配置与格局分析\n2. 财运层次与获取方式\n3. 盲派做功与财富效率\n4. 大运财运走势\n5. 投资理财建议",
      marriage: "\n【必备章节】\n1. 配偶星与婚姻宫分析\n2. 婚姻质量与稳定性\n3. 感情运势时间线\n4. 配偶特征画像\n5. 婚姻经营建议",
      career: "\n【必备章节】\n1. 官星事业格局\n2. 适合行业与职业类型\n3. 事业发展时间线\n4. 创业与职场建议\n5. 职场人际关系",
      annual: "\n【必备章节】\n1. 流年总体运势\n2. 财运月运详解\n3. 事业感情健康分项\n4. 重大事件预警\n5. 趋吉避凶指南",
      partner: "\n【必备章节】\n1. 双方命盘互补分析\n2. 合作协同度评估\n3. 合作风险预警\n4. 最佳合作模式",
      enterprise: "\n【必备章节】\n1. 企业命盘格局\n2. 发展周期预测\n3. 团队建设建议\n4. 风险管控预警",
      full: "\n【必备章节】\n1. 命盘格局总论\n2. 财运深度分析\n3. 婚姻感情分析\n4. 事业发展分析\n5. 健康运势分析\n6. 大运流年详解\n7. 人生规划建议",
    };
    return guides[reportType] || guides["free"] || "";
  }

  /**
   * 构建五运六气健康信息注入到 prompt 中
   */
  private buildHealthInfo(healthData: any, chartData: any): string {
    if (!healthData) {
      return '\n【五运六气与健康数据】\n健康数据服务暂时不可用。请基于中医五运六气经典理论（《黄帝内经》运气七篇），结合命主八字五行偏旺偏弱和日主强弱，自行推导先天体质倾向、脏腑强弱和当前年份的运气影响。明确指出"以下健康分析基于理论推导，仅供养生参考"。';
    }

    let info = '';

    // 1. 当年五运六气
    if (healthData.currentYearYunqi) {
      const yq = healthData.currentYearYunqi;
      info += `\n【当前年份五运六气】`;
      // Year-level fields (from /api/v1/health/wuyun)
      const yearGan = yq.年干 || '';
      const yearZhi = yq.年支 || '';
      if (yearGan && yearZhi) info += `\n年份干支：${yearGan}${yearZhi}年`;
      const huaYun = yq.天干化运 || yq.year_yun || '';
      const yunType = yq.运之太过不及 || yq.year_yun_type || '';
      if (huaYun) info += `\n天干化运（中运）：${huaYun}（${yunType}）`;
      const sitian = yq.地支化气_司天 || yq.司天 || yq.sitian || '';
      const zaiquan = yq.地支化气_在泉 || yq.在泉 || yq.zaiquan || '';
      if (sitian) info += `\n司天：${sitian}`;
      if (zaiquan) info += `\n在泉：${zaiquan}`;
      // 综合分析
      const overall = yq.综合分析 || yq.overall_analysis || '';
      if (overall) info += `\n运气综合分析：${overall}`;

      // Daily-level health tips
      if (yq.health_tips) {
        const ht = yq.health_tips;
        if (ht.重点脏腑) info += `\n运气影响重点脏腑：${ht.重点脏腑}`;
        if (ht.主运养生) info += `\n主运养生：${ht.主运养生}`;
        if (ht.主运饮食) info += `\n主运饮食：${ht.主运饮食}`;
        if (ht.主运经络) info += `\n主运经络：${ht.主运经络}`;
        if (ht.客气养生) info += `\n客气养生：${ht.客气养生}`;
        if (ht.客气易患疾病) info += `\n客气易患疾病：${ht.客气易患疾病}`;
        if (ht.客气预防) info += `\n客气预防：${ht.客气预防}`;
        if (ht.调养建议) info += `\n运气调养建议：${ht.调养建议}`;
      }
    }

    // 2. 身体器官五行分析
    if (healthData.organAnalysis) {
      info += `\n\n【八字五行与脏腑分析】`;
      const organStatus = healthData.organAnalysis.器官状态 || healthData.organAnalysis['器官状态'] || [];
      if (Array.isArray(organStatus) && organStatus.length > 0) {
        for (const org of organStatus) {
          const name = org.器官 || org.organ || '';
          const wx = org.五行 || org.wuxing || '';
          const state = org.状态 || org.state || '';
          const energy = org.能量值 ?? org.energy ?? '';
          const issues = org.易患问题 || org.issues || '';
          const care = org.养护建议 || org.care || '';
          info += `\n${name}（${wx}）：${state}（能量${energy}/10）`;
          if (issues) info += ` — 易患：${issues}`;
          if (care) info += ` — 养护：${care}`;
        }
      }
      const imbalance = healthData.organAnalysis.五行失衡 || healthData.organAnalysis['五行失衡'] || null;
      if (imbalance) {
        info += `\n五行失衡评估：${imbalance.整体评估 || imbalance.overall || ''}`;
        if (imbalance.最强 || imbalance.maxWx) info += `，最强五行：${imbalance.最强 || imbalance.maxWx}`;
        if (imbalance.最弱 || imbalance.minWx) info += `，最弱五行：${imbalance.最弱 || imbalance.minWx}`;
      }
    }

    // 3. 健康预警
    if (healthData.healthWarnings) {
      const warnings = healthData.healthWarnings.预警 || healthData.healthWarnings.warnings || [];
      if (Array.isArray(warnings) && warnings.length > 0) {
        info += `\n\n【健康预警】`;
        for (const w of warnings) {
          const severity = w.严重程度 || w.severity || '';
          const type = w.类型 || w.type || '';
          const organ = w.器官 || w.organ || '';
          const desc = w.描述 || w.description || '';
          const prevention = w.建议 || w.prevention || '';
          info += `\n[${severity}] ${type} — ${organ}：${desc}`;
          if (prevention) info += ` 预防：${prevention}`;
        }
      }
    }

    // 4. 未来10年流年运气预测
    if (healthData.multiYearYunqi && healthData.multiYearYunqi.length > 0) {
      info += `\n\n【未来10年流年运气与脏腑重点】`;
      info += `\n（以下为每年干支对应的五运六气，分析时请结合命主八字判断对健康的具体影响）`;
      for (const yr of healthData.multiYearYunqi) {
        info += `\n${yr.year}年（${yr.ganzhi}）：年运${yr.yearYun}（${yr.yearYunType}），司天${yr.sitian}，在泉${yr.zaiquan}，重点脏腑：${yr.focusOrgan}`;
      }
    }

    // 5. 运气查表参考
    if (healthData.yunqiReference) {
      const ref = healthData.yunqiReference;
      info += `\n\n【五运六气查表参考】`;
      info += `\n${ref.description}`;
      info += `\n${ref.liuqiDescription}`;
    }

    // 6. 体重管理数据
    if (chartData?.hasWeightData) {
      info += `\n\n【体重管理·中医分析数据】`;
      info += `\n身高：${chartData.height}cm | 体重：${chartData.weight}kg | BMI：${chartData.bmi}（${chartData.bmiCategory}）`;
      info += `\n《灵枢》体型分类：${chartData.tcmBodyType}`;
      info += `\n中医证型：${chartData.tcmWeightPattern}`;
      info += `\n脾胃功能诊断：${chartData.spleenStomachAnalysis}`;
      info += `\n湿气诊断：${chartData.weightDampnessLevel}`;
      info += `\n饮食建议：${chartData.dietaryAdvice}`;
      info += `\n推荐穴位：${chartData.acupoints}`;
      info += `\n运动建议：${chartData.exerciseAdvice}`;
      info += `\n药食同源推荐：${chartData.herbSuggestions}`;
      info += `\n《内经》引用：${chartData.neijingQuotes}`;
    }

    return info;
  }

  private generateFreeUpsell(options: AiGenerateOptions): string {
    const hooks: Record<string, string> = {
      'free': '您的命盘显示未来几年有重要的运势转折点，想了解详细的财运/事业分析？解锁完整报告仅需9.9元。',
      'wealth': '您的命盘中财星配置独特，深度财运分析可以帮您精准把握最佳投资时机。',
      'marriage': '您的命盘桃花星有特殊组合，详细的婚姻分析能帮您找到最佳的感情方向。',
    };
    return hooks[options.reportType] || hooks['free'];
  }

  private generatePaidUpsell(options: AiGenerateOptions): string {
    return '根据您的命盘特征，建议进一步做合伙人匹配分析或流年大运详解，为重大决策提供更精准的参考。';
  }

  private getFallbackContent(options: AiGenerateOptions): string {
    return '基于您的命盘数据，规则引擎已完成分析。请稍后重试获取AI详细解读。';
  }
}
