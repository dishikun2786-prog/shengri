import { Injectable, Logger, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import OpenAI from 'openai';
import { RedisService } from '../../common/redis/redis.service';
import { Mem0Service } from '../../common/mem0/mem0.service';
import { TokenService } from '../token/token.service';

export interface WuyunliuqiAiOptions {
  targetDate: string;
  userId?: string; // 用于 Mem0 记忆查询
  billingUserId?: number; // 用于 Token 计费（数值型 userId）
  skipTokenCheck?: boolean; // 跳过 Token 计费（内部调用/公共端点）
  baziData?: {
    yearPillar: string;
    monthPillar: string;
    dayPillar: string;
    hourPillar: string;
    dayMaster: string;
    dayMasterWuxing: string;
    wuxingCounts: Record<string, number>;
  };
  liunianData?: {
    gan: string;
    zhi: string;
    year: number;
  };
  liuyueData?: {
    gan: string;
    zhi: string;
    month: number;
  };
  liuriData?: {
    gan: string;
    zhi: string;
    day: number;
  };
  isPaid?: boolean;
}

export interface WuyunliuqiAiResult {
  content: string;
  structuredContent?: WuyunliuqiStructured;
  summary: string;
  tokenUsed: number;
  model: string;
  provider: string;
}

export interface WuyunliuqiStructured {
  title: string;
  overview: string;
  yunqiAnalysis: {
    yearYun: string;
    yearYunType: string;
    sitian: string;
    zaiquan: string;
    mainYun: string;
    keQi: string;
  };
  healthSuggestions: {
    diet: string[];
    lifestyle: string[];
    emotions: string[];
    exercises: string[];
    seasonal: string[];
  };
  organCare: {
    organ: string;
    wuxing: string;
    suggestions: string[];
  }[];
  constitution?: {
    type: string;
    description: string;
    strengths: string[];
    weaknesses: string[];
    lifetimeCare: string;
  };
  warnings: {
    type: string;
    severity: string;
    description: string;
    prevention: string;
  }[];
  liunianGuidance?: {
    year: number;
    ganzhi: string;
    analysis: string;
    healthFocus: string;
  };
  liuyueGuidance?: {
    month: number;
    ganzhi: string;
    analysis: string;
    healthFocus: string;
  };
  liuriGuidance?: {
    day: number;
    ganzhi: string;
    analysis: string;
    healthFocus: string;
  };
  summary: string;
  tags: string[];
}

@Injectable()
export class WuyunliuqiService {
  private readonly logger = new Logger(WuyunliuqiService.name);
  private calendarUrl: string;
  private static readonly CACHE_TTL = 86400; // 24小时缓存

  constructor(
    private config: ConfigService,
    private redisService: RedisService,
    private mem0Service: Mem0Service,
    private tokenService: TokenService,
  ) {
    this.calendarUrl = this.config.get('CALENDAR_ENGINE_URL', 'http://localhost:8100');
  }

  /**
   * 生成缓存 Key
   */
  private getCacheKey(options: WuyunliuqiAiOptions): string {
    const { targetDate, liunianData, liuyueData, liuriData, baziData } = options;
    const liunian = liunianData ? `${liunianData.gan}${liunianData.zhi}` : '';
    const liuyue = liuyueData ? `${liuyueData.gan}${liuyueData.zhi}` : '';
    const liuri = liuriData ? `${liuriData.gan}${liuriData.zhi}` : '';
    // 包含出生年干支，避免不同先天体质的用户共享缓存
    const birthYearGanzhi = baziData?.yearPillar || '';
    return `wuyun:cache:${targetDate}:${birthYearGanzhi}:${liunian}:${liuyue}:${liuri}`;
  }

  /**
   * 生成 Mem0 搜索查询（用于查找已保存的健康分析记忆）
   */
  private buildMem0Query(options: WuyunliuqiAiOptions): string {
    const { targetDate, liunianData, liuyueData, liuriData } = options;
    let query = `五运六气健康分析 ${targetDate}`;
    if (liunianData) query += ` 流年${liunianData.gan}${liunianData.zhi}`;
    if (liuyueData) query += ` 流月${liuyueData.gan}${liuyueData.zhi}`;
    if (liuriData) query += ` 流日${liuriData.gan}${liuriData.zhi}`;
    return query;
  }

  /**
   * 从 Mem0 记忆系统搜索已保存的健康分析
   */
  async searchMem0Memories(
    userId: string,
    options: WuyunliuqiAiOptions,
  ): Promise<WuyunliuqiAiResult | null> {
    if (!this.mem0Service.isReady()) {
      this.logger.warn('Mem0 未初始化，跳过记忆搜索');
      return null;
    }

    const query = this.buildMem0Query(options);
    try {
      const memories = await this.mem0Service.searchMemory(query, { userId }, 3);
      if (memories && memories.length > 0) {
        // 找到匹配的记忆，返回最新的一个
        const latest = memories[0];
        if (latest.content) {
          this.logger.log(`从 Mem0 记忆恢复五运六气结果`);
          // 尝试解析存储的内容
          try {
            return typeof latest.content === 'string'
              ? JSON.parse(latest.content)
              : latest.content;
          } catch {
            return latest.content;
          }
        }
      }
    } catch (error: any) {
      this.logger.warn(`Mem0 搜索失败: ${error.message}`);
    }
    return null;
  }

  /**
   * 保存到 Mem0 记忆系统（User 层，永久）
   */
  private async saveToMem0(
    userId: string,
    options: WuyunliuqiAiOptions,
    result: WuyunliuqiAiResult,
  ): Promise<void> {
    if (!this.mem0Service.isReady()) {
      this.logger.warn('Mem0 未初始化，跳过保存记忆');
      return;
    }

    const query = this.buildMem0Query(options);
    const content = JSON.stringify(result);

    try {
      await this.mem0Service.addUserProfile(userId, content, {
        memoryType: 'analysis',
        reportType: '五运六气养生分析',
        targetDate: options.targetDate,
        liunian: options.liunianData ? `${options.liunianData.gan}${options.liunianData.zhi}` : undefined,
        liuyue: options.liuyueData ? `${options.liuyueData.gan}${options.liuyueData.zhi}` : undefined,
        liuri: options.liuriData ? `${options.liuriData.gan}${options.liuriData.zhi}` : undefined,
      });
      this.logger.log(`保存五运六气结果到 Mem0 记忆`);
    } catch (error: any) {
      this.logger.warn(`Mem0 保存失败: ${error.message}`);
    }
  }

  /**
   * 从缓存获取已生成的五运六气分析结果
   */
  async getCachedResult(options: WuyunliuqiAiOptions): Promise<WuyunliuqiAiResult | null> {
    const cacheKey = this.getCacheKey(options);
    const cached = await this.redisService.getJson<WuyunliuqiAiResult>(cacheKey);
    if (cached) {
      this.logger.log(`从缓存获取五运六气结果: ${cacheKey}`);
      return cached;
    }
    return null;
  }

  /**
   * 保存结果到缓存
   */
  private async saveToCache(options: WuyunliuqiAiOptions, result: WuyunliuqiAiResult): Promise<void> {
    const cacheKey = this.getCacheKey(options);
    await this.redisService.setJson(cacheKey, result, WuyunliuqiService.CACHE_TTL);
    this.logger.log(`保存五运六气结果到缓存: ${cacheKey}`);
  }

  /**
   * 使用 AI 生成五运六气详解和养生建议
   */
  async generateWuyunliuqiWithAi(options: WuyunliuqiAiOptions): Promise<WuyunliuqiAiResult> {
    // 先检查缓存
    const cached = await this.getCachedResult(options);
    if (cached) {
      this.logger.log('使用缓存的五运六气结果');
      return cached;
    }

    // 从 Mem0 记忆搜索已保存的结果
    const userId = options.userId || 'anonymous';
    const mem0Result = await this.searchMem0Memories(userId, options);
    if (mem0Result) {
      this.logger.log('使用 Mem0 记忆的五运六气结果');
      // 同时保存到 Redis 缓存
      await this.saveToCache(options, mem0Result);
      return mem0Result;
    }

    const { targetDate, baziData, liunianData, liuyueData, liuriData, isPaid = false } = options;

    // Token 计费：仅当已认证且未跳过时追踪
    const shouldTrack = options.billingUserId && !options.skipTokenCheck;
    let freeze: { consumptionId: number; usedFreeQuota: boolean; frozenAmount: number } | undefined;

    try {
      // 获取五运六气基础数据
      const wuyunData = await this.getWuyunData(targetDate, liunianData?.gan, liunianData?.zhi);

      // 构建 AI 提示词
      const { systemPrompt, userPrompt } = this.buildAiPrompt(wuyunData, baziData, liunianData, liuyueData, liuriData);

      // Token: 预估并冻结
      const estimatedInput = this.tokenService.estimateTokens(systemPrompt + userPrompt);
      const estimatedOutput = 2000;
      if (shouldTrack) {
        try {
          freeze = await this.tokenService.estimateAndFreeze({
            userId: options.billingUserId!,
            provider: 'deepseek',
            model: this.config.get('DEEPSEEK_MODEL', 'deepseek-v4-flash'),
            source: 'health',
            sourceRefId: targetDate,
            estimatedInputTokens: estimatedInput,
            estimatedOutputTokens: estimatedOutput,
          });
        } catch (freezeErr: any) {
          this.logger.warn(`健康分析 Token 冻结失败: ${freezeErr.message}`);
          throw freezeErr;
        }
      }

      // 直接调用 DeepSeek API 生成内容
      const aiResult = await this.callDeepSeekDirect(systemPrompt, userPrompt);

      // Token: 结算
      if (freeze) {
        this.tokenService.settle(freeze.consumptionId, estimatedInput, aiResult.tokenUsed)
          .catch(err => this.logger.warn(`健康分析 Token 结算失败: ${err.message}`));
      }

      let structuredContent: WuyunliuqiStructured | undefined;
      try {
        if (aiResult.structuredContent) {
          structuredContent = aiResult.structuredContent;
        } else {
          structuredContent = this.parseAiContentToStructure(aiResult.content);
        }
      } catch (e) {
        this.logger.warn('解析 AI 返回内容为结构化数据失败');
      }

      // 规范化字段名（中文 key → 英文 key）
      let normalized = this.normalizeChineseFields(structuredContent);

      // 后处理校验：检测 AI 输出与预计算数据的矛盾并自动修正
      normalized = this.validateAndCorrect(normalized, {
        yearGanzhi: options.liunianData ? `${options.liunianData.gan}${options.liunianData.zhi}` : undefined,
        yearYun: options.liunianData ? this.getTianGanHuaYun(options.liunianData.gan) : undefined,
        yearYunType: options.liunianData
          ? (['甲', '丙', '戊', '庚', '壬'].includes(options.liunianData.gan) ? '太过' : '不及')
          : undefined,
        sitian: options.liunianData ? this.getSitianZaiquan(options.liunianData.zhi).sitian : undefined,
        zaiquan: options.liunianData ? this.getSitianZaiquan(options.liunianData.zhi).zaiquan : undefined,
        mainYun: wuyunData.当日主运,
        keQi: wuyunData.当日客气,
      });

      const result: WuyunliuqiAiResult = {
        content: aiResult.content,
        structuredContent: normalized,
        summary: normalized?.summary || aiResult.content.slice(0, 200) || '',
        tokenUsed: aiResult.tokenUsed,
        model: this.config.get('DEEPSEEK_MODEL', 'deepseek-v4-flash'),
        provider: 'deepseek',
      };

      // 保存到 Redis 缓存
      await this.saveToCache(options, result);

      // 保存到 Mem0 记忆系统（User 层，永久）
      await this.saveToMem0(userId, options, result);

      return result;
    } catch (error: any) {
      this.logger.error(`AI 五运六气生成失败: ${error?.message || String(error)}`);
      // Token: 失败退款/恢复配额
      if (shouldTrack) {
        this.tokenService.voidFreeze(freeze!.consumptionId)
          .catch(err => this.logger.warn(`健康分析 Token 退款失败: ${err.message}`));
      }
      throw error;
    }
  }

  /**
   * 获取五运六气基础数据
   */
  private async getWuyunData(
    targetDate: string,
    liunianGan?: string,
    liunianZhi?: string,
  ): Promise<any> {
    try {
      const params: Record<string, string> = { target_date: targetDate };
      if (liunianGan && liunianZhi) {
        params.liunian_gan = liunianGan;
        params.liunian_zhi = liunianZhi;
      }
      const response = await axios.get(`${this.calendarUrl}/api/v1/health/wuyun/daily`, { params });
      return response.data;
    } catch (error: any) {
      this.logger.error(`获取五运六气数据失败: ${error?.message || String(error)}`);
      // 返回默认数据
      return this.getDefaultWuyunData();
    }
  }

  /**
   * 获取默认五运六气数据
   */
  private getDefaultWuyunData() {
    return {
      日期: new Date().toISOString().split('T')[0],
      当日主运: '木',
      当日客气: '少阴君火',
      司天: '太阴湿土',
      在泉: '太阳寒水',
      运之太过不及: '不及',
      主气: '少阴君火',
      养生重点: {
        主运养生: '宜疏肝利胆，顺应春季生发之气。',
        主运饮食: '多食青绿色蔬菜、酸味食物。',
        主运经络: '宜按摩太冲穴、肝俞穴。',
        主运情志: '戒怒戒郁，保持心态平和。',
        主运时辰: '宜在寅时（3-5点）起床活动。',
        客气养生: '注意防暑热，心火易旺。',
        客气调理: '可莲子心泡茶清火。',
        客气易患: '失眠、心悸、口腔溃疡。',
        客气预防: '午时避免暴晒，午睡15-30分钟。',
        重点脏腑: ['肝', '心'],
        调养建议: '木气与火气双重影响，建议综合调理。',
      },
      综合分析: '年干土运不及，脾土较弱，需注意脾胃调养。',
    };
  }

  /**
   * 构建 AI 提示词
   */
  private buildAiPrompt(
    wuyunData: any,
    baziData?: any,
    liunianData?: any,
    liuyueData?: any,
    liuriData?: any,
  ): { systemPrompt: string; userPrompt: string } {
    const date = wuyunData.日期 || new Date().toISOString().split('T')[0];
    const mainYun = wuyunData.当日主运 || '未知';
    const keQi = wuyunData.当日客气 || '未知';
    const sitian = wuyunData.司天 || '太阴湿土';
    const zaiquan = wuyunData.在泉 || '太阳寒水';
    const yunType = wuyunData.运之太过不及 || '不及';
    const healthTip = wuyunData.养生重点 || {};

    // 计算先天体质（出生年五运六气）
    let birthYearWuyun: { ganzhi: string; yearYun: string; yearYunType: string; sitian: string; zaiquan: string } | null = null;
    if (baziData?.yearPillar && baziData.yearPillar.length >= 2) {
      const yearGan = baziData.yearPillar[0];
      const yearZhi = baziData.yearPillar[1];
      const yun = this.getTianGanHuaYun(yearGan);
      const sz = this.getSitianZaiquan(yearZhi);
      const yangGans = ['甲', '丙', '戊', '庚', '壬'];
      birthYearWuyun = {
        ganzhi: baziData.yearPillar,
        yearYun: yun,
        yearYunType: yangGans.includes(yearGan) ? '太过' : '不及',
        sitian: sz.sitian,
        zaiquan: sz.zaiquan,
      };
    }

    const systemPrompt = `你是一位专业的中医五运六气专家，精通《黄帝内经》运气七篇大论、《伤寒论》、《温病条辨》等中医经典。

## 数据使用原则（最高优先级）

**所有年运、司天、在泉、主运、客气等核心数据已由专业引擎预计算完毕，直接使用传入数据进行分析，严禁自行推导！**

传入数据中的每个字段都是确定性的计算结果，你必须直接引用：
- yearYun（年运）→ 直接用，不要推算
- sitian/zaiquan（司天/在泉）→ 直接用
- mainYun/keQi（主运/客气）→ 直接用
- liunianList/liuyueList/liuriList → 每个条目的五行隶属关系已预计算

## 概念参考（仅用于分析写作，禁止用于推导）

天干化运口诀（仅背景知识）：甲己化土、乙庚化金、丙辛化水、丁壬化木、戊癸化火
阳干（甲丙戊庚壬）化运为太过 | 阴干（乙丁己辛癸）化运为不及
注意：化运口诀仅用于理解传入数据的来源，**严禁用于自行推导年运**！

## 五行生克术语规范
- 正克: A克B → "A气偏胜，乘克B"，不是"反克"
- 反克（相侮）: 被克一方反制克己一方（如木反克金），仅在有明确数据支持时使用
- 相乘: 克我之气过盛而克伐 → 正克加重

## 三层体质分析模型（《黄帝内经》天人合一框架）

中医「人生于地，悬命于天」——健康由三个时间维度共构：

### 第一层：先天体质（出生年五运六气）— 禀赋之基
由出生年的天干化运 + 司天/在泉决定，是终身脏腑偏性基础：
- 出生年运太过 → 该行脏气先天偏盛，气有余便是火
- 出生年运不及 → 该行脏气先天不足，易受所不胜之气乘克
- 司天在泉 → 胎孕期的半年维度气候大环境对体质的塑造
- 例：壬年（木运太过）出生 → 肝气先天偏旺，优势在生发条达，易患倾向在肝阳上亢、头晕目眩
- 例：辛年（水运不及）出生 → 肾气先天偏弱，优势在阴血宁静，易患倾向在腰膝酸软、生殖发育迟缓

### 第二层：命局特征（八字四柱）— 脏腑格局
由八字日主五行强弱 + 五行分布决定后天脏腑虚实格局：
- 与先天体质相互印证或对冲，决定体质复杂程度
- 日主五行与先天年运同气 → 该行偏盛确凿，调养以疏泄为主
- 日主五行与先天年运相克 → 存在先天后天的制约关系，需调停

### 第三层：当前运气（流年/流月/流日）— 时令加临
由当前时间五运六气决定，反映时令对体质的激发或抑制：
- 岁运生/同先天年运 → 体质优势期，顺势增强
- 岁运克先天年运 → 体质受抑期，重点防护先天薄弱脏腑
- 岁运被先天年运克 → 体质主动制约外环境，适度调适即可

## 三层综合分析方法
1. 先判定先天体质类型（如"木运太过体质，司天厥阴风木"）
2. 再分析八字日主与先天体质的生克印证关系
3. 最后叠加当前运气，给出时令对先天体质的影响判断
4. 调养总则：补不足、损有余，以平为期。先天为根，命局为本，时令为标

## 输出格式
必须输出标准 JSON，所有字段使用英文 key。严格按以下结构，勿含任何其他文字：

{
  "yunqiAnalysis": {
    "yearYun": "年运干支（如丙午）",
    "yearYunType": "太过或不及",
    "sitian": "司天",
    "zaiquan": "在泉",
    "mainYun": "当日主运",
    "keQi": "当日客气"
  },
  "healthSuggestions": {
    "diet": ["饮食建议"],
    "lifestyle": ["起居建议"],
    "emotions": ["情志建议"],
    "exercises": ["运动建议"],
    "seasonal": ["节气建议"]
  },
  "organCare": [{"organ": "器官名", "wuxing": "五行", "suggestions": ["建议"]}],
  "constitution": {
    "type": "先天体质类型（如：木运太过体质，司天厥阴风木，在泉少阳相火）",
    "description": "结合出生年运与司天在泉的先天体质特征描述（50字以内）",
    "strengths": ["体质优势1", "先天强项2"],
    "weaknesses": ["易患倾向1", "先天弱项2"],
    "lifetimeCare": "基于先天体质的终身调养总纲（50字以内）"
  },
  "warnings": [{"type": "预警类型", "severity": "严重程度(高/中/低)", "description": "描述", "prevention": "预防措施"}],
  "liunianGuidance": {"year": 年份, "ganzhi": "干支", "analysis": "流年分析", "healthFocus": "健康重点"},
  "liuyueGuidance": {"month": 月份, "ganzhi": "干支", "analysis": "流月分析", "healthFocus": "健康重点"},
  "liuriGuidance": {"day": 日期, "ganzhi": "干支", "analysis": "流日分析", "healthFocus": "健康重点"},
  "summary": "总结（100字以内）"
}

## 分析要求
- 流年/流月/流日 analysis 必须包含具体的五行生克分析
- 必须结合：岁运（年干化运结果）、司天在泉、月令、日干地支之间的生克关系
- 健康建议必须具体可执行（具体穴位、食材、动作、时辰）
- 所有分析必须以传入的预计算结论为基础，不能脱离数据自行发挥`;

    // 预计算流年结论（确定性数据，AI 不可修改）
    let precomputedYun = '';
    let precomputedYunType = yunType;
    let precomputedSitian = sitian;
    let precomputedZaiquan = zaiquan;
    let precomputedYearGanzhi = '';

    if (liunianData) {
      const liunianYun = this.getTianGanHuaYun(liunianData.gan);
      precomputedYun = liunianYun;
      precomputedYearGanzhi = `${liunianData.gan}${liunianData.zhi}`;
      const sq = this.getSitianZaiquan(liunianData.zhi);
      precomputedSitian = sq.sitian;
      precomputedZaiquan = sq.zaiquan;
      const yangGans = ['甲', '丙', '戊', '庚', '壬'];
      precomputedYunType = yangGans.includes(liunianData.gan) ? '太过' : '不及';
    }

    let userPrompt = `## 预计算结论（确定性数据，直接使用，禁止修改！）
年运干支：${precomputedYearGanzhi || '未知'}
年运（天干化运）：${precomputedYun}（${precomputedYunType}）
  ⚠️ 关键提醒：年运由天干化运规则决定（丙辛化水、丁壬化木等），不是天干本义五行！
司天：${precomputedSitian}
在泉：${precomputedZaiquan}
当日主运：${mainYun}（这是五步推运的结果，不等于年运）
当日客气：${keQi}

## 当前日期与运气信息
目标日期：${date}
运之太过不及：${precomputedYunType}

## 当日养生重点（《黄帝内经》经典参考）
${healthTip.主运养生 || ''}
饮食建议：${healthTip.主运饮食 || ''}
经络调理：${healthTip.主运经络 || ''}
情志调摄：${healthTip.主运情志 || ''}
时辰养生：${healthTip.主运时辰 || ''}
客气养生：${healthTip.客气养生 || ''}
调理方法：${healthTip.客气调理 || ''}
易患疾病：${healthTip.客气易患 || ''}
预防措施：${healthTip.客气预防 || ''}
重点脏腑：${(healthTip.重点脏腑 || []).join('、')}
综合调养建议：${healthTip.调养建议 || ''}`;

    // 添加八字信息
    if (baziData) {
      userPrompt += `

## 八字命盘信息
四柱：${baziData.yearPillar || ''} ${baziData.monthPillar || ''} ${baziData.dayPillar || ''} ${baziData.hourPillar || ''}
日主：${baziData.dayMaster || ''} (${baziData.dayMasterWuxing || ''}行)
五行分布：${JSON.stringify(baziData.wuxingCounts || {})}`;
    }

    // 添加出生年五运六气（先天体质基础）
    if (birthYearWuyun) {
      userPrompt += `

## 出生年五运六气（先天体质基础 ⭐ 请重点分析这一层）
出生年干支：${birthYearWuyun.ganzhi}
天干化运：${birthYearWuyun.yearYun}（${birthYearWuyun.yearYunType}）
司天：${birthYearWuyun.sitian} | 在泉：${birthYearWuyun.zaiquan}
先天体质类型：${birthYearWuyun.yearYun}${birthYearWuyun.yearYunType}体质，司天${birthYearWuyun.sitian}，在泉${birthYearWuyun.zaiquan}

分析指引：
- 此人的先天体质禀赋由上述出生年运气环境决定，这是终身健康的基础底色
- 请基于「三层综合分析方法」，先剖析这种体质类型的生理特征、优势脏腑与薄弱环节
- 再将先天体质与八字日主五行对比印证：日主${baziData?.dayMasterWuxing || ''}行与先天${birthYearWuyun.yearYun}是相得还是相抑？
- 最后叠加当前运气，分析时令对先天体质的激发或抑制效应
- 综合调养方案需以先天体质为根、命局特征为本、时令运气为标`;
    }

    // 添加流年信息（补充细节）
    if (liunianData) {
      const liunianYun = this.getTianGanHuaYun(liunianData.gan);
      const liunianQi = this.getDiZhiHuaQi(liunianData.zhi);
      userPrompt += `

## 流年信息（年运 = ${precomputedYun}，已在上方预计算结论中确定）
流年干支：${liunianData.gan}${liunianData.zhi}
流年：${liunianData.year}年
天干化运：${liunianData.gan} → ${liunianYun}（即年运，已在预计算结论中标注为"${precomputedYun}"）`;
    }

    // 添加流月信息
    if (liuyueData) {
      const liuyueYun = this.getTianGanHuaYun(liuyueData.gan);
      const liuyueQi = this.getDiZhiHuaQi(liuyueData.zhi);
      userPrompt += `

## 流月信息
流月干支：${liuyueData.gan}${liuyueData.zhi}
流月：${liuyueData.month}月`;
    }

    // 添加流日信息
    if (liuriData) {
      userPrompt += `

## 流日信息
流日干支：${liuriData.gan}${liuriData.zhi}
流日：${liuriData.day}日`;
    }

    userPrompt += `

## 分析要求（三层综合）
1. **先天体质分析**（约200字）：根据出生年五运六气，阐述先天体质类型的特征、生理优势、易患倾向
2. **命局印证分析**（约150字）：结合八字日主五行强弱，与先天体质对比，印证或修正体质判断
3. **时令运气分析**（约200字）：分析当前岁运/司天/在泉/主运/客气对先天体质的影响（相助/相抑/平和）
4. **综合调养方案**：以先天体质为根、当前运气为标，给出具体可操作的饮食/经络/情志/运动建议
5. 养生建议必须具体（穴位名称+定位、食材名称+性味、功法名称+要领）

## 输出格式
请严格按照以下JSON格式输出，不要包含任何其他文字：
{
  "title": "五运六气养生分析报告",
  "overview": "整体概述（100字以内）",
  "yunqiAnalysis": {
    "yearYun": "年运",
    "yearYunType": "太过/不及",
    "sitian": "司天",
    "zaiquan": "在泉",
    "mainYun": "当日主运",
    "keQi": "当日客气"
  },
  "healthSuggestions": {
    "diet": ["饮食建议1", "饮食建议2"],
    "lifestyle": ["起居建议1", "起居建议2"],
    "emotions": ["情志建议1", "情志建议2"],
    "exercises": ["运动建议1", "运动建议2"],
    "seasonal": ["节气建议1", "节气建议2"]
  },
  "organCare": [
    {"organ": "器官名", "wuxing": "五行", "suggestions": ["建议1", "建议2"]}
  ],
  "constitution": {
    "type": "先天体质类型（如：木运太过体质，司天厥阴风木，在泉少阳相火）",
    "description": "结合出生年运与司天在泉的先天体质特征描述（50字以内）",
    "strengths": ["体质优势1", "先天强项2"],
    "weaknesses": ["易患倾向1", "先天弱项2"],
    "lifetimeCare": "基于先天体质的终身调养总纲（50字以内）"
  },
  "warnings": [
    {"type": "预警类型", "severity": "严重程度", "description": "描述", "prevention": "预防措施"}
  ],
  "liunianGuidance": {
    "year": 年份,
    "ganzhi": "干支",
    "analysis": "流年分析",
    "healthFocus": "健康重点"
  },
  "liuyueGuidance": {
    "month": 月份,
    "ganzhi": "干支",
    "analysis": "流月分析",
    "healthFocus": "健康重点"
  },
  "liuriGuidance": {
    "day": 日期,
    "ganzhi": "干支",
    "analysis": "流日分析",
    "healthFocus": "健康重点"
  },
  "summary": "总结（100字以内）",
  "tags": ["标签1", "标签2"]
}`;

    return { systemPrompt, userPrompt };
  }

  /**
   * 解析 AI 返回内容为结构化数据
   */
  private parseAiContentToStructure(content: string): WuyunliuqiStructured | undefined {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      this.logger.warn('解析结构化内容失败');
    }
    return undefined;
  }

  /**
   * 规范化字段名（中文 key 转英文 key）
   * 解决 AI 返回中文 key 导致前端读取不到的问题
   */
  private normalizeChineseFields(obj: any): WuyunliuqiStructured | undefined {
    if (!obj || typeof obj !== 'object') return obj;

    // 处理 yunqiAnalysis 字段
    let yunqiAnalysis = obj.yunqiAnalysis || obj.年运分析 || obj.yunQiAnalysis;
    if (yunqiAnalysis) {
      // yearYun 应该是完整干支，如"丙午"，而非"火运"
      let yearYun = yunqiAnalysis.yearYun || yunqiAnalysis.年运 || '';
      // 如果只有"火运"这样的格式，补充干支信息
      if (yearYun && !yearYun.includes('年') && yearYun.length <= 2) {
        // 干支已经在流年/流月/流日指导中提供，这里保持原样
      }
      yunqiAnalysis = {
        yearYun: yearYun,
        yearYunType: yunqiAnalysis.yearYunType || yunqiAnalysis.太过不及 || yunqiAnalysis.运之太过 || '',
        sitian: yunqiAnalysis.sitian || yunqiAnalysis.司天 || '',
        zaiquan: yunqiAnalysis.zaiquan || yunqiAnalysis.在泉 || '',
        mainYun: yunqiAnalysis.mainYun || yunqiAnalysis.主运 || '',
        keQi: yunqiAnalysis.keQi || yunqiAnalysis.客气 || '',
      };
    }

    // 处理 healthSuggestions 字段
    let healthSuggestions = obj.healthSuggestions || obj.养生建议 || obj.health_suggestions;
    if (healthSuggestions) {
      const getArray = (val: any) => Array.isArray(val) ? val : (val ? [val] : []);
      healthSuggestions = {
        diet: getArray(healthSuggestions.diet || healthSuggestions.饮食 || healthSuggestions.饮食建议 || []),
        lifestyle: getArray(healthSuggestions.lifestyle || healthSuggestions.起居 || healthSuggestions.起居建议 || []),
        emotions: getArray(healthSuggestions.emotions || healthSuggestions.情志 || healthSuggestions.情志调摄 || []),
        exercises: getArray(healthSuggestions.exercises || healthSuggestions.运动 || healthSuggestions.运动建议 || []),
        seasonal: getArray(healthSuggestions.seasonal || healthSuggestions.节气 || healthSuggestions.节气建议 || []),
      };
    }

    // 处理 organCare 字段
    let organCare = obj.organCare || obj.脏腑调养 || obj.organ_care || [];
    if (organCare && Array.isArray(organCare)) {
      organCare = organCare.map((item: any) => ({
        organ: item.organ || item.器官 || item.脏腑 || '',
        wuxing: item.wuxing || item.五行 || '',
        suggestions: Array.isArray(item.suggestions) ? item.suggestions : (item.建议 ? [item.建议] : []),
      }));
    }

    // 处理 constitution 字段（先天体质）
    let constitution = obj.constitution || obj.先天体质;
    if (constitution) {
      constitution = {
        type: constitution.type || constitution.体质类型 || '',
        description: constitution.description || constitution.描述 || '',
        strengths: Array.isArray(constitution.strengths || constitution.优势) ? (constitution.strengths || constitution.优势) : [],
        weaknesses: Array.isArray(constitution.weaknesses || constitution.易患倾向) ? (constitution.weaknesses || constitution.易患倾向) : [],
        lifetimeCare: constitution.lifetimeCare || constitution.终身调养 || '',
      };
    }

    // 处理 warnings 字段
    let warnings = obj.warnings || obj.健康预警 || obj.warnings_list || [];
    if (warnings && Array.isArray(warnings)) {
      warnings = warnings.map((item: any) => ({
        type: item.type || item.类型 || item.预警类型 || '',
        severity: item.severity || item.严重程度 || item.level || '中',
        description: item.description || item.描述 || item.描述内容 || '',
        prevention: item.prevention || item.预防 || item.预防措施 || '',
      }));
    }

    // 处理流年/流月/流日指导
    const liunianGuidance = obj.liunianGuidance || obj.流年指导 || obj.liuNian;
    const liuyueGuidance = obj.liuyueGuidance || obj.流月指导 || obj.liuYue;
    const liuriGuidance = obj.liuriGuidance || obj.流日指导 || obj.liuRi;

    // 如果 liunianGuidance 或 liuyueGuidance 或 liuriGuidance 为空，
    // 尝试从 content 中解析（AI 可能把分析放在 content 中）
    const contentAnalysis = obj.content || '';
    let finalLiunianGuidance = liunianGuidance;
    let finalLiuyueGuidance = liuyueGuidance;
    let finalLiuriGuidance = liuriGuidance;

    // 如果流日指导为空但有 content 且有 liuriData（通过参数传入），尝试解析
    // 注意：这里无法访问调用上下文的 liuriData，需要在调用时传入
    // 暂时注释掉这个解析逻辑，因为缺少上下文信息
    // if (!finalLiuriGuidance && contentAnalysis) {
    //   // 从 content 中提取流日分析需要更多信息，暂时跳过
    // }

    return {
      title: obj.title || obj.标题 || '五运六气养生分析报告',
      overview: obj.overview || obj.概述 || '',
      yunqiAnalysis,
      healthSuggestions,
      organCare,
      constitution,
      warnings,
      liunianGuidance: finalLiunianGuidance ? {
        year: finalLiunianGuidance.year || finalLiunianGuidance.年份 || 0,
        ganzhi: finalLiunianGuidance.ganzhi || finalLiunianGuidance.干支 || '',
        analysis: finalLiunianGuidance.analysis || finalLiunianGuidance.分析 || finalLiunianGuidance.流年分析 || '',
        healthFocus: finalLiunianGuidance.healthFocus || finalLiunianGuidance.健康重点 || '',
      } : undefined,
      liuyueGuidance: finalLiuyueGuidance ? {
        month: finalLiuyueGuidance.month || finalLiuyueGuidance.月份 || 0,
        ganzhi: finalLiuyueGuidance.ganzhi || finalLiuyueGuidance.干支 || '',
        analysis: finalLiuyueGuidance.analysis || finalLiuyueGuidance.分析 || finalLiuyueGuidance.流月分析 || '',
        healthFocus: finalLiuyueGuidance.healthFocus || finalLiuyueGuidance.健康重点 || '',
      } : undefined,
      liuriGuidance: finalLiuriGuidance ? {
        day: finalLiuriGuidance.day || finalLiuriGuidance.日期 || 0,
        ganzhi: finalLiuriGuidance.ganzhi || finalLiuriGuidance.干支 || '',
        analysis: finalLiuriGuidance.analysis || finalLiuriGuidance.分析 || finalLiuriGuidance.流日分析 || '',
        healthFocus: finalLiuriGuidance.healthFocus || finalLiuriGuidance.健康重点 || '',
      } : undefined,
      summary: obj.summary || obj.总结 || '',
      tags: Array.isArray(obj.tags) ? obj.tags : (obj.标签 ? [obj.标签] : []),
    };
  }

  /**
   * 获取五行描述
   */
  private getWuxingDesc(wx: string): string {
    const descs: Record<string, string> = {
      '木': '生长升发之气',
      '火': '炎热向上之气',
      '土': '承载化育之气',
      '金': '收敛肃杀之气',
      '水': '寒凉闭藏之气',
    };
    return descs[wx] || '平衡之气';
  }

  /**
   * 后处理校验：检测 AI 输出与预计算数据的矛盾，自动修正
   */
  private validateAndCorrect(
    structured: WuyunliuqiStructured | undefined,
    precomputed: {
      yearGanzhi?: string;
      yearYun?: string;
      yearYunType?: string;
      sitian?: string;
      zaiquan?: string;
      mainYun?: string;
      keQi?: string;
    },
  ): WuyunliuqiStructured | undefined {
    if (!structured) return structured;

    let corrections = 0;

    // 校验 yunqiAnalysis
    if (structured.yunqiAnalysis && precomputed.yearYun) {
      const ya = structured.yunqiAnalysis;

      // 校验 yearYunType
      if (precomputed.yearYunType && ya.yearYunType !== precomputed.yearYunType) {
        this.logger.warn(
          `[校验修正] yearYunType 不匹配: AI返回="${ya.yearYunType}" 正确值="${precomputed.yearYunType}"`,
        );
        ya.yearYunType = precomputed.yearYunType;
        corrections++;
      }

      // 校验 sitian
      if (precomputed.sitian && ya.sitian !== precomputed.sitian) {
        this.logger.warn(
          `[校验修正] sitian 不匹配: AI返回="${ya.sitian}" 正确值="${precomputed.sitian}"`,
        );
        ya.sitian = precomputed.sitian;
        corrections++;
      }

      // 校验 zaiquan
      if (precomputed.zaiquan && ya.zaiquan !== precomputed.zaiquan) {
        this.logger.warn(
          `[校验修正] zaiquan 不匹配: AI返回="${ya.zaiquan}" 正确值="${precomputed.zaiquan}"`,
        );
        ya.zaiquan = precomputed.zaiquan;
        corrections++;
      }

      // 校验 mainYun（当日主运）
      if (precomputed.mainYun && ya.mainYun !== precomputed.mainYun) {
        this.logger.warn(
          `[校验修正] mainYun 不匹配: AI返回="${ya.mainYun}" 正确值="${precomputed.mainYun}"`,
        );
        ya.mainYun = precomputed.mainYun;
        corrections++;
      }

      // 校验 keQi（当日客气）
      if (precomputed.keQi && ya.keQi !== precomputed.keQi) {
        this.logger.warn(
          `[校验修正] keQi 不匹配: AI返回="${ya.keQi}" 正确值="${precomputed.keQi}"`,
        );
        ya.keQi = precomputed.keQi;
        corrections++;
      }
    }

    // 校验流年指导中的 analysis 文本是否包含错误的年运表述
    if (structured.liunianGuidance?.analysis && precomputed.yearYun) {
      const analysis = structured.liunianGuidance.analysis;
      const correctYunWuxing = precomputed.yearYun.replace('运', ''); // "水运" → "水"

      // 检测错误的年运表述模式
      const wrongPatterns: { pattern: RegExp; correct: string }[] = [];
      if (correctYunWuxing === '水') {
        wrongPatterns.push({ pattern: /火运(太过|不及)?/, correct: '水运' });
      } else if (correctYunWuxing === '木') {
        wrongPatterns.push({ pattern: /火运(太过|不及)?/, correct: '木运' });
      } else if (correctYunWuxing === '火') {
        wrongPatterns.push({ pattern: /水运(太过|不及)?/, correct: '火运' });
      }

      for (const wp of wrongPatterns) {
        if (wp.pattern.test(analysis)) {
          this.logger.warn(
            `[校验修正] 流年分析文本包含错误的年运表述，自动替换: "${wp.correct}"`,
          );
          structured.liunianGuidance.analysis = analysis.replace(wp.pattern, wp.correct);
          corrections++;
        }
      }
    }

    if (corrections > 0) {
      this.logger.log(`[校验修正] 共修正 ${corrections} 处 AI 输出错误`);
    }

    return structured;
  }

  /**
   * 天干化运（公开方法）
   */
  public getTianGanHuaYun(gan: string): string {
    const map: Record<string, string> = {
      '甲': '土运', '乙': '金运', '丙': '水运', '丁': '木运', '戊': '火运',
      '己': '土运', '庚': '金运', '辛': '水运', '壬': '木运', '癸': '火运',
    };
    return map[gan] || '土运';
  }

  /**
   * 地支化气（公开方法）
   */
  public getDiZhiHuaQi(zhi: string): string {
    const map: Record<string, string> = {
      '子': '少阴君火', '午': '少阴君火',
      '丑': '太阴湿土', '未': '太阴湿土',
      '寅': '少阳相火', '申': '少阳相火',
      '卯': '阳明燥金', '酉': '阳明燥金',
      '辰': '太阳寒水', '戌': '太阳寒水',
      '巳': '厥阴风木', '亥': '厥阴风木',
    };
    return map[zhi] || '太阴湿土';
  }

  /**
   * 根据地支获取完整的司天/在泉对（公开方法）
   */
  public getSitianZaiquan(zhi: string): { sitian: string; zaiquan: string } {
    const map: Record<string, { sitian: string; zaiquan: string }> = {
      '子': { sitian: '少阴君火', zaiquan: '阳明燥金' },
      '午': { sitian: '少阴君火', zaiquan: '阳明燥金' },
      '丑': { sitian: '太阴湿土', zaiquan: '太阳寒水' },
      '未': { sitian: '太阴湿土', zaiquan: '太阳寒水' },
      '寅': { sitian: '少阳相火', zaiquan: '厥阴风木' },
      '申': { sitian: '少阳相火', zaiquan: '厥阴风木' },
      '卯': { sitian: '阳明燥金', zaiquan: '少阴君火' },
      '酉': { sitian: '阳明燥金', zaiquan: '少阴君火' },
      '辰': { sitian: '太阳寒水', zaiquan: '太阴湿土' },
      '戌': { sitian: '太阳寒水', zaiquan: '太阴湿土' },
      '巳': { sitian: '厥阴风木', zaiquan: '少阳相火' },
      '亥': { sitian: '厥阴风木', zaiquan: '少阳相火' },
    };
    return map[zhi] || { sitian: '太阴湿土', zaiquan: '太阳寒水' };
  }

  /**
   * 天干对应五行（公开方法）
   */
  public getGanWuxing(gan: string): string {
    const map: Record<string, string> = {
      '甲': '木', '乙': '木', '丙': '火', '丁': '火',
      '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
    };
    return map[gan] || '土';
  }

  /**
   * 生成流年五运六气分析
   */
  async generateLiuNianAnalysis(
    targetDate: string,
    liunianGan: string,
    liunianZhi: string,
    year: number,
    baziData?: any,
    isPaid?: boolean,
  ): Promise<WuyunliuqiAiResult> {
    return this.generateWuyunliuqiWithAi({
      targetDate,
      liunianData: { gan: liunianGan, zhi: liunianZhi, year },
      baziData,
      isPaid,
    });
  }

  /**
   * 生成流月五运六气分析
   */
  async generateLiuYueAnalysis(
    targetDate: string,
    liuyueGan: string,
    liuyueZhi: string,
    month: number,
    baziData?: any,
    isPaid?: boolean,
  ): Promise<WuyunliuqiAiResult> {
    return this.generateWuyunliuqiWithAi({
      targetDate,
      liuyueData: { gan: liuyueGan, zhi: liuyueZhi, month },
      baziData,
      isPaid,
    });
  }

  /**
   * 生成流日五运六气分析
   */
  async generateLiuRiAnalysis(
    targetDate: string,
    liuriGan: string,
    liuriZhi: string,
    day: number,
    baziData?: any,
    isPaid?: boolean,
  ): Promise<WuyunliuqiAiResult> {
    return this.generateWuyunliuqiWithAi({
      targetDate,
      liuriData: { gan: liuriGan, zhi: liuriZhi, day },
      baziData,
      isPaid,
    });
  }

  /**
   * 综合生成流年流月流日分析
   */
  async generateComprehensiveAnalysis(
    targetDate: string,
    liunian: { gan: string; zhi: string; year: number },
    liuyue: { gan: string; zhi: string; month: number },
    liuri: { gan: string; zhi: string; day: number },
    baziData?: any,
    isPaid?: boolean,
    userId?: string,
  ): Promise<WuyunliuqiAiResult> {
    return this.generateWuyunliuqiWithAi({
      targetDate,
      userId,
      baziData,
      liunianData: liunian,
      liuyueData: liuyue,
      liuriData: liuri,
      isPaid,
    });
  }

  /**
   * 直接调用 DeepSeek API 生成五运六气分析（绕过 AiService 的通用逻辑）
   */
  private async callDeepSeekDirect(systemPrompt: string, userPrompt: string): Promise<{
    content: string;
    structuredContent: any;
    tokenUsed: number;
  }> {
    const apiKey = this.config.get('DEEPSEEK_API_KEY', '');
    if (!apiKey) {
      throw new HttpException('DeepSeek API Key 未配置，请联系管理员', 503);
    }

    const baseURL = this.config.get('DEEPSEEK_BASE_URL', 'https://api.deepseek.com');
    const model = this.config.get('DEEPSEEK_MODEL', 'deepseek-v4-flash');

    const client = new OpenAI({ apiKey, baseURL });

    let response: OpenAI.Chat.Completions.ChatCompletion;
    try {
      response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      });
    } catch (apiError: any) {
      const status = apiError?.status || apiError?.response?.status;
      const message = apiError?.message || 'AI 服务调用失败';
      this.logger.error(
        `DeepSeek API 调用失败: status=${status} message=${message} model=${model}`,
        apiError?.stack?.slice(0, 300),
      );
      if (status === 401 || status === 403) {
        throw new HttpException('AI 服务鉴权失败，请检查 API Key 配置', 502);
      }
      if (status === 429) {
        throw new HttpException('AI 服务请求过于频繁，请稍后重试', 503);
      }
      throw new HttpException(`AI 服务暂时不可用: ${message}`, 502);
    }

    const rawContent = response.choices?.[0]?.message?.content || '';
    const tokenUsed = response.usage?.total_tokens || 0;

    if (!rawContent) {
      this.logger.warn('DeepSeek 返回空内容');
      throw new HttpException('AI 服务返回空内容，请稍后重试', 502);
    }

    let structuredContent: any = null;
    try {
      // 清理可能的 markdown 代码块标记
      const cleanContent = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      structuredContent = JSON.parse(cleanContent);
    } catch (e) {
      this.logger.warn(`解析 DeepSeek 返回内容失败: ${rawContent.slice(0, 200)}`);
    }

    return {
      content: rawContent,
      structuredContent,
      tokenUsed,
    };
  }

  /**
   * 获取五运六气基础数据（供报告生成使用，公开方法）
   */
  public async getWuyunComputationData(
    targetDate: string,
    wuxingCounts?: Record<string, number>,
  ): Promise<any> {
    try {
      // Use the year-level wuyun endpoint for annual overview data
      const response = await axios.get(`${this.calendarUrl}/api/v1/health/wuyun`, {
        params: { target_date: targetDate },
      });
      const data = response.data;

      // Also get daily detail for health tips if wuxing counts provided
      let healthTips = null;
      if (wuxingCounts) {
        try {
          const dailyResponse = await axios.get(`${this.calendarUrl}/api/v1/health/wuyun/daily`, {
            params: {
              target_date: targetDate,
              bazi_wuxing_json: JSON.stringify(wuxingCounts),
            },
          });
          healthTips = dailyResponse.data.养生重点 || dailyResponse.data.health_tips || null;
        } catch {
          // Non-critical, continue without daily tips
        }
      }

      return { ...data, health_tips: healthTips };
    } catch (error: any) {
      this.logger.error(`获取五运六气数据失败: ${error?.message || String(error)}`);
      return this.getDefaultWuyunData();
    }
  }

  /**
   * 获取身体器官五行分析（供报告生成使用，公开方法）
   */
  public async getOrganAnalysisComputation(
    baziJson: string,
    wuxingCountsJson: string,
  ): Promise<any> {
    try {
      const response = await axios.get(`${this.calendarUrl}/api/v1/health/organs`, {
        params: { bazi_json: baziJson, wuxing_counts_json: wuxingCountsJson },
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(`获取器官分析数据失败: ${error?.message || String(error)}`);
      return null;
    }
  }

  /**
   * 获取健康预警数据（供报告生成使用，公开方法）
   */
  public async getHealthWarningsComputation(
    baziJson: string,
    wuxingCountsJson: string,
    wuyunJson: string | null,
  ): Promise<any> {
    try {
      const params: Record<string, string> = {
        bazi_json: baziJson,
        wuxing_counts_json: wuxingCountsJson,
      };
      if (wuyunJson) params.wuyun_json = wuyunJson;
      const response = await axios.get(`${this.calendarUrl}/api/v1/health/warnings`, { params });
      return response.data;
    } catch (error: any) {
      this.logger.error(`获取健康预警数据失败: ${error?.message || String(error)}`);
      return null;
    }
  }

  /**
   * 获取五运六气参考查表（供报告生成使用）
   */
  public getYunqiReferenceTables() {
    const GAN_YUN_TYPE: Record<string, string> = {
      '甲': '太过', '丙': '太过', '戊': '太过', '庚': '太过', '壬': '太过',
      '乙': '不及', '丁': '不及', '己': '不及', '辛': '不及', '癸': '不及',
    };

    const YUN_ORGANS: Record<string, string> = {
      '木运': '肝/胆', '火运': '心/小肠', '土运': '脾/胃', '金运': '肺/大肠', '水运': '肾/膀胱',
    };

    const QI_ORGANS: Record<string, string> = {
      '厥阴风木': '肝/胆', '少阴君火': '心/小肠', '少阳相火': '心包/三焦',
      '太阴湿土': '脾/胃', '阳明燥金': '肺/大肠', '太阳寒水': '肾/膀胱',
    };

    return {
      GAN_YUN_TYPE,
      YUN_ORGANS,
      QI_ORGANS,
      description: '天干化运：甲己化土、乙庚化金、丙辛化水、丁壬化木、戊癸化火。阳干（甲丙戊庚壬）为太过，阴干（乙丁己辛癸）为不及。',
      liuqiDescription: '六气脏腑对应：厥阴风木→肝/胆，少阴君火→心/小肠，少阳相火→心包/三焦，太阴湿土→脾/胃，阳明燥金→肺/大肠，太阳寒水→肾/膀胱。',
    };
  }

  /**
   * 批量计算多年份的五运六气（纯本地运算）
   * @param years 年份数组 [{gan, zhi, year}]
   * @returns 各年运气信息
   */
  public getMultiYearYunqi(years: Array<{ gan: string; zhi: string; year: number }>): Array<{
    year: number;
    ganzhi: string;
    yearYun: string;
    yearYunType: string;
    sitian: string;
    zaiquan: string;
    focusOrgan: string;
  }> {
    const ref = this.getYunqiReferenceTables();

    return years.map(({ gan, zhi, year }) => {
      const yearYun = this.getTianGanHuaYun(gan);
      const yearYunType = ref.GAN_YUN_TYPE[gan] || '平气';
      const sz = this.getSitianZaiquan(zhi);
      const qi = this.getDiZhiHuaQi(zhi);
      const yunOrgan = ref.YUN_ORGANS[yearYun] || '全身';
      const qiOrgan = ref.QI_ORGANS[qi] || '全身';

      return {
        year,
        ganzhi: `${gan}${zhi}`,
        yearYun,
        yearYunType,
        sitian: sz.sitian,
        zaiquan: sz.zaiquan,
        focusOrgan: `${yunOrgan}（运）、${qiOrgan}（气）`,
      };
    });
  }
}