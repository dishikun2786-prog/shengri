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
    if (jsonMode) params.response_format = { type: 'json_object' };
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

      try {
        const parsed = JSON.parse(rawContent);
        structuredContent = parsed;
        content = rawContent;
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

      if (provider !== defaultProv) {
        this.logger.warn(`Falling back to default provider: ${defaultProv}`);
        return this.generateReport({ ...options, provider: defaultProv });
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

    return `
四柱：${chart.year_pillar?.gan || ''}${chart.year_pillar?.zhi || ''} ${chart.month_pillar?.gan || ''}${chart.month_pillar?.zhi || ''} ${chart.day_pillar?.gan || ''}${chart.day_pillar?.zhi || ''} ${chart.hour_pillar?.gan || ''}${chart.hour_pillar?.zhi || ''}
日主：${chart.day_master || ''} (${chart.day_master_wuxing || ''})
日主强弱：${chart.strength_level || ''} (${chart.day_master_strength || 0}分)
五行分布：${JSON.stringify(chart.wuxing_counts || {})}
神煞：${(chart.shensha_list || []).join('、')}
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

      return info;
    })();

    const healthInfo = this.buildHealthInfo(healthData, chartData);

    if (template) {
      return template
        .replace('{{pillar_info}}', pillarInfo)
        .replace('{{rule_info}}', ruleInfo)
        .replace('{{health_info}}', healthInfo)
        .replace('{{report_type}}', reportType);
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
请使用纯文本Markdown格式输出，不要JSON，使用## 标题分段。`;
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
    if (!healthData) return '';

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
