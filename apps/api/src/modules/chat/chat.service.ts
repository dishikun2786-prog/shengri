import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Mem0Service, LayeredSearchResult } from '../../common/mem0/mem0.service';
import { AiService } from '../ai/ai.service';
import { TokenService } from '../token/token.service';
import {
  buildProfileMemory,
  buildRuleSummary,
  buildReportContext,
  enhanceSearchQuery,
  formatLayeredMemories,
  getExpirationDate,
} from './memory-builder';

const AGENT_ID = 'bazi_advisor_v1';
const FIRST_TOKEN_TIMEOUT_MS = 15000;
const STREAM_IDLE_TIMEOUT_MS = 20000;
const TOTAL_STREAM_TIMEOUT_MS = 90000;

interface StreamCallbacks {
  onAccepted?: (result: { userUuid: string; userContent: string }) => void;
  onChunk: (delta: string, index: number) => void;
  onEnd: (result: {
    assistantUuid: string;
    content: string;
    suggestedQuestions: string[];
    tokenUsed: number;
  }) => void;
  onFailed?: (result: { assistantUuid: string; content: string }) => void;
  onError: (error: Error) => void;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private mem0: Mem0Service,
    private aiService: AiService,
    private tokenService: TokenService,
    private config: ConfigService,
  ) {}

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
    let timeoutRef: NodeJS.Timeout | null = null;
    try {
      const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutRef = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      });
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutRef) clearTimeout(timeoutRef);
    }
  }

  async getOrCreateSession(userId: number, reportId: number) {
    const report = await this.prisma.analysisReport.findUnique({
      where: { id: reportId },
      select: { id: true, userId: true, reportType: true, aiSummary: true },
    });
    if (!report) throw new NotFoundException('报告不存在');

    // Check access: report owner OR pairing participant
    if (report.userId !== userId) {
      const pairingReq = await this.prisma.pairingRequest.findFirst({
        where: { reportId },
        select: { initiatorId: true, receiverId: true },
      });
      const isPairingParticipant = pairingReq &&
        (pairingReq.initiatorId === userId || pairingReq.receiverId === userId);
      if (!isPairingParticipant) {
        throw new ForbiddenException('无权访问该报告');
      }
    }

    const existing = await this.prisma.chatSession.findFirst({
      where: { userId, reportId },
    });
    if (existing) return existing;

    try {
      return await this.prisma.chatSession.create({
        data: {
          userId,
          reportId,
          title: report.aiSummary?.slice(0, 50) || '测算顾问对话',
          mem0UserId: `user_${userId}`,
          mem0AgentId: AGENT_ID,
        },
      });
    } catch (err: any) {
      // 并发创建时可能违反唯一约束，重试一次查询
      if (err?.code === 'P2002') {
        const retry = await this.prisma.chatSession.findFirst({
          where: { userId, reportId },
        });
        if (retry) return retry;
      }
      throw err;
    }
  }

  async createPairingSessions(
    reportId: number,
    userIdA: number,
    userIdB: number,
    pairingType: string,
  ) {
    // Get user names for personalized titles
    const [userA, userB] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userIdA }, select: { nickname: true, username: true } }),
      this.prisma.user.findUnique({ where: { id: userIdB }, select: { nickname: true, username: true } }),
    ]);
    const nameA = userA?.nickname || userA?.username || '用户A';
    const nameB = userB?.nickname || userB?.username || '用户B';

    const typeLabels: Record<string, string> = {
      personality: '性格匹配',
      career: '事业合作',
      wealth: '财运互补',
      hehun: '合婚分析',
      comprehensive: '综合配对',
    };
    const typeLabel = typeLabels[pairingType] || '配对';
    const titleA = `与${nameB}的${typeLabel}对话`;
    const titleB = `与${nameA}的${typeLabel}对话`;

    const sessions = await Promise.all([
      this.prisma.chatSession.upsert({
        where: { userId_reportId: { userId: userIdA, reportId } },
        create: {
          userId: userIdA,
          reportId,
          title: titleA,
          mem0UserId: `user_${userIdA}`,
          mem0AgentId: AGENT_ID,
        },
        update: { title: titleA },
      }),
      this.prisma.chatSession.upsert({
        where: { userId_reportId: { userId: userIdB, reportId } },
        create: {
          userId: userIdB,
          reportId,
          title: titleB,
          mem0UserId: `user_${userIdB}`,
          mem0AgentId: AGENT_ID,
        },
        update: { title: titleB },
      }),
    ]);

    return { sessionA: sessions[0], sessionB: sessions[1] };
  }

  async createPairingSession(
    reportId: number,
    userId: number,
    pairingType: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, username: true },
    });
    const userName = user?.nickname || user?.username || '用户';

    const typeLabels: Record<string, string> = {
      personality: '性格匹配',
      career: '事业合作',
      wealth: '财运互补',
      hehun: '合婚分析',
      comprehensive: '综合配对',
    };
    const typeLabel = typeLabels[pairingType] || '配对';
    const title = `${userName}的${typeLabel}分析对话`;

    return this.prisma.chatSession.upsert({
      where: { userId_reportId: { userId, reportId } },
      create: {
        userId,
        reportId,
        title,
        mem0UserId: `user_${userId}`,
        mem0AgentId: AGENT_ID,
      },
      update: { title },
    });
  }

  async getSessionById(sessionId: number, userId: number) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('会话不存在');
    if (session.userId !== userId) throw new ForbiddenException('无权访问');
    return session;
  }

  async getSessionByReportUuid(reportUuid: string, userId: number) {
    const report = await this.prisma.analysisReport.findUnique({
      where: { uuid: reportUuid },
      select: { id: true, userId: true },
    });
    if (!report) throw new NotFoundException('报告不存在');

    // Check if this is a pairing report
    const pairingRequest = await this.prisma.pairingRequest.findFirst({
      where: { reportId: report.id },
      select: { initiatorId: true, receiverId: true, pairingType: true },
    });

    // Access check: report owner OR pairing participant
    const isOwner = report.userId === userId;
    const isPairingParticipant = pairingRequest &&
      (pairingRequest.initiatorId === userId || pairingRequest.receiverId === userId);

    if (!isOwner && !isPairingParticipant) {
      throw new ForbiddenException('无权访问');
    }

    // For pairing reports, create personalized titles for both users
    if (pairingRequest) {
      const [u1, u2] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: pairingRequest.initiatorId }, select: { nickname: true, username: true } }),
        this.prisma.user.findUnique({ where: { id: pairingRequest.receiverId }, select: { nickname: true, username: true } }),
      ]);
      const name1 = u1?.nickname || u1?.username || '用户A';
      const name2 = u2?.nickname || u2?.username || '用户B';

      const typeLabels: Record<string, string> = {
        personality: '性格匹配', career: '事业合作', wealth: '财运互补',
        hehun: '合婚分析', comprehensive: '综合配对',
      };
      const typeLabel = typeLabels[pairingRequest.pairingType] || '配对';

      const myTitle = `与${userId === pairingRequest.initiatorId ? name2 : name1}的${typeLabel}对话`;
      const otherUserId = pairingRequest.initiatorId === userId
        ? pairingRequest.receiverId : pairingRequest.initiatorId;
      const otherTitle = `与${userId === pairingRequest.initiatorId ? name1 : name2}的${typeLabel}对话`;

      const [mySession] = await Promise.all([
        this.prisma.chatSession.upsert({
          where: { userId_reportId: { userId, reportId: report.id } },
          create: {
            userId, reportId: report.id, title: myTitle,
            mem0UserId: `user_${userId}`, mem0AgentId: AGENT_ID,
          },
          update: { title: myTitle },
        }),
        this.prisma.chatSession.upsert({
          where: { userId_reportId: { userId: otherUserId, reportId: report.id } },
          create: {
            userId: otherUserId, reportId: report.id, title: otherTitle,
            mem0UserId: `user_${otherUserId}`, mem0AgentId: AGENT_ID,
          },
          update: { title: otherTitle },
        }),
      ]);

      return mySession;
    }

    // Non-pairing report: use generic session creation
    return this.getOrCreateSession(userId, report.id);
  }

  /**
   * Initialize User-layer profile in Mem0 on first consultation.
   * Extracts structured bazi profile from chart + report and stores permanently.
   */
  private static readonly SYNC_LOCK_TTL = 30; // seconds

  private async ensureUserProfile(userId: number, report: any): Promise<void> {
    if (!this.mem0.isReady()) return;

    const syncKey = `mem0_profile_sync:${userId}`;
    // Use raw Redis client for SET NX (distributed lock)
    const locked = await this.redis.getClient().set(syncKey, '1', 'EX', ChatService.SYNC_LOCK_TTL, 'NX');
    if (!locked) return; // another process is syncing

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { mem0ProfileSynced: true },
      });
      if (user?.mem0ProfileSynced) return;

      const profileText = buildProfileMemory(report.chart, report);
      if (!profileText) return;

      await this.mem0.addUserProfile(`user_${userId}`, profileText, {
        reportType: report.reportType,
        expirationDate: null,
      });

      const ruleSummary = buildRuleSummary(report);
      if (ruleSummary) {
        await this.mem0.addMemory(
          [{ role: 'system', content: ruleSummary }],
          {
            userId: `user_${userId}`,
            metadata: {
              memoryType: 'analysis',
              reportType: report.reportType,
              expirationDate: getExpirationDate('medium', report.chart) ?? undefined,
            },
          },
        );
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { mem0ProfileSynced: true },
      });
      this.logger.log(`User ${userId} bazi profile synced to Mem0`);
    } catch (error) {
      this.logger.warn(`Failed to sync user profile: ${error.message}`);
    } finally {
      await this.redis.del(syncKey);
    }
  }

  async sendMessageStream(
    userId: number,
    sessionId: number,
    content: string,
    msgId: string,
    callbacks: StreamCallbacks,
  ) {
    const session = await this.getSessionById(sessionId, userId);

    const report = await this.prisma.analysisReport.findUnique({
      where: { id: session.reportId },
      include: { chart: true, xlrRecord: true },
    });
    if (!report) throw new NotFoundException('关联报告不存在');

    // Do not block the main chain on profile sync.
    this.ensureUserProfile(userId, report).catch((err) => {
      this.logger.warn(`ensureUserProfile async failed: ${err.message}`);
    });

    const recentMessages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 6, // reduced from 10, Mem0 replaces redundant history
      select: { role: true, content: true },
    });
    recentMessages.reverse();

    const userMsg = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content,
      },
    });
    callbacks.onAccepted?.({
      userUuid: userMsg.uuid,
      userContent: userMsg.content,
    });

    let fullContent = '';
    let estimatedInput = 0;
    let freeze:
      | { consumptionId: number; usedFreeQuota: boolean; frozenAmount: number }
      | undefined;

    try {
      // Multi-layer memory retrieval with query enhancement
      let layeredMemories: LayeredSearchResult = {
        userMemories: [], agentMemories: [], sessionMemories: [], all: [],
      };

      if (this.mem0.isReady()) {
        const enhancedQuery = enhanceSearchQuery(content, report.reportType, report.chart);
        layeredMemories = await this.withTimeout(
          this.mem0.searchMultiLayer(
            enhancedQuery,
            `user_${userId}`,
            {
              agentId: AGENT_ID,
              runId: `session_${sessionId}`,
              userLimit: 3,
              agentLimit: 2,
              sessionLimit: 2,
              filterExpired: true,
            },
          ),
          1500,
          'MEM0_TIMEOUT',
        ).catch((err) => {
          this.logger.warn(`Mem0 search timeout/degraded: ${err.message}`);
          return {
            userMemories: [],
            agentMemories: [],
            sessionMemories: [],
            all: [],
          } as LayeredSearchResult;
        });
      }

      const systemPrompt = this.buildSystemPrompt(report, layeredMemories);

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...recentMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content },
      ];

      const provider = await this.aiService.getDefaultProvider();
      const providerConfig = await this.aiService.getProviderConfig(provider);
      const model = providerConfig.defaultModel;
      const client = await this.aiService.getClient(provider);

      // Token estimation and pre-deduction
      const allText = messages.map(m => m.content || '').join('');
      estimatedInput = this.tokenService.estimateTokens(allText);
      const estimatedOutput = 600; // generous for ~400 char Chinese response
      try {
        freeze = await this.tokenService.estimateAndFreeze({
          userId,
          provider,
          model,
          source: 'chat',
          sourceRefId: sessionId.toString(),
          estimatedInputTokens: estimatedInput,
          estimatedOutputTokens: estimatedOutput,
        });
      } catch (freezeErr: any) {
        callbacks.onError(freezeErr);
        return;
      }

      const stream = await client.chat.completions.create({
        model,
        messages,
        stream: true,
        stream_options: { include_usage: true },
      });

      let chunkIndex = 0;
      let hasFirstToken = false;
      let streamUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null = null;
      const startedAt = Date.now();
      const iterator = stream[Symbol.asyncIterator]();

      while (true) {
        const elapsed = Date.now() - startedAt;
        if (elapsed > TOTAL_STREAM_TIMEOUT_MS) {
          throw new Error('STREAM_TIMEOUT: total timeout');
        }

        const stepTimeout = hasFirstToken ? STREAM_IDLE_TIMEOUT_MS : FIRST_TOKEN_TIMEOUT_MS;
        const next = await this.withTimeout(
          iterator.next(),
          stepTimeout,
          hasFirstToken ? 'STREAM_TIMEOUT: idle timeout' : 'STREAM_TIMEOUT: first token timeout',
        );

        if (next.done) break;

        const delta = next.value?.choices?.[0]?.delta?.content || '';
        if (delta) {
          hasFirstToken = true;
          fullContent += delta;
          callbacks.onChunk(delta, chunkIndex++);
        }
        // Capture usage from final chunk (some providers send usage in final chunk)
        if (next.value?.usage) {
          streamUsage = next.value.usage;
        }
      }

      let suggestedQuestions: string[] = [];
      let parsedContent = fullContent;
      try {
        const parsed = JSON.parse(fullContent);
        if (parsed.content) parsedContent = parsed.content;
        if (parsed.suggestedQuestions) suggestedQuestions = parsed.suggestedQuestions;
      } catch {
        if (fullContent.startsWith('{') || fullContent.startsWith('[')) {
          this.logger.warn(`AI returned incomplete JSON (${fullContent.length} chars), using raw text`);
        }
      }

      // Settle token consumption
      const actualInput = streamUsage?.prompt_tokens ?? estimatedInput;
      const actualOutput = streamUsage?.completion_tokens
        ?? this.tokenService.estimateOutputTokens(parsedContent);
      const actualTotal = actualInput + actualOutput;
      let tokenCost = 0;
      if (freeze) {
        try {
          const settleResult = await this.tokenService.settle(
            freeze.consumptionId,
            actualInput,
            actualOutput,
          );
          tokenCost = settleResult.actualCost;
        } catch (settleErr: any) {
          this.logger.warn(`Token settlement failed: ${settleErr.message}`);
        }
      }

      const assistantMsg = await this.prisma.$transaction(async (tx) => {
        const created = await tx.chatMessage.create({
          data: {
            sessionId,
            role: 'assistant',
            content: parsedContent,
            tokenUsed: actualTotal,
            tokenCost,
            model,
            metadata: suggestedQuestions.length > 0 ? { suggestedQuestions } : undefined,
          },
        });

        await tx.chatSession.update({
          where: { id: sessionId },
          data: {
            messageCount: { increment: 2 },
            lastMessageAt: new Date(),
          },
        });
        return created;
      });

      callbacks.onEnd({
        assistantUuid: assistantMsg.uuid,
        content: parsedContent,
        suggestedQuestions,
        tokenUsed: actualTotal,
      });

      // Store conversation into Session layer with short TTL
      if (this.mem0.isReady()) {
        const msgIds = [userMsg.id, assistantMsg.id];
        this.storeMessagesToMem0(msgIds, [
          { role: 'user', content },
          { role: 'assistant', content: parsedContent },
        ], {
          runId: `session_${sessionId}`,
          userId: `user_${userId}`,
          metadata: {
            memoryType: 'temporary',
            sessionId,
            reportType: report.reportType,
            expirationDate: getExpirationDate('short') ?? undefined,
          },
        });
      }
    } catch (error: any) {
      this.logger.error(`Chat stream error: ${error.message}`);
      if (fullContent.trim()) {
        // Settle with partial content
        const partialOutput = this.tokenService.estimateOutputTokens(fullContent);
        if (freeze) {
          this.tokenService.settle(freeze.consumptionId, estimatedInput, partialOutput)
            .catch(e => this.logger.warn(`Partial settle failed: ${e.message}`));
        }
        try {
          const failedAssistant = await this.prisma.$transaction(async (tx) => {
            const created = await tx.chatMessage.create({
              data: {
                sessionId,
                role: 'assistant',
                content: fullContent,
                tokenUsed: estimatedInput + partialOutput,
                metadata: { streamFailed: true },
              },
            });
            await tx.chatSession.update({
              where: { id: sessionId },
              data: {
                messageCount: { increment: 2 },
                lastMessageAt: new Date(),
              },
            });
            return created;
          });
          callbacks.onFailed?.({
            assistantUuid: failedAssistant.uuid,
            content: fullContent,
          });
        } catch (persistErr: any) {
          this.logger.warn(`Persist failed stream content error: ${persistErr.message}`);
        }
      } else {
        // No content — full refund
        if (freeze) {
          this.tokenService.voidFreeze(freeze.consumptionId)
            .catch(e => this.logger.warn(`Token void failed: ${e.message}`));
        }
      }
      if ((error?.message || '').includes('STREAM_TIMEOUT')) {
        callbacks.onError(new Error('STREAM_TIMEOUT'));
        return;
      }
      callbacks.onError(error);
    }
  }

  /**
   * Process user feedback on an AI message.
   * Stores feedback into appropriate memory layers.
   */
  async processFeedback(
    userId: number,
    messageUuid: string,
    score: number,
    text?: string,
  ) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { uuid: messageUuid },
      include: { session: true },
    });
    if (!message) throw new NotFoundException('消息不存在');
    if (message.session.userId !== userId) throw new ForbiddenException('无权操作');

    await this.prisma.chatMessage.update({
      where: { uuid: messageUuid },
      data: { feedbackScore: score, feedbackText: text || null },
    });

    if (!this.mem0.isReady()) return { success: true };

    const feedbackContent = score > 0
      ? `用户认可此分析方法：${message.content.slice(0, 200)}`
      : `用户不认可此分析角度，需要调整：${message.content.slice(0, 200)}${text ? `。用户反馈: ${text}` : ''}`;

    if (score > 0) {
      // Positive → User layer: remember preferred analysis style
      await this.mem0.addMemory(
        [{ role: 'system', content: feedbackContent }],
        {
          userId: `user_${userId}`,
          metadata: {
            memoryType: 'preference',
            feedbackScore: score,
            expirationDate: getExpirationDate('medium') ?? undefined,
          },
        },
      );
    } else {
      // Negative → Agent layer: AI behavior learning
      await this.mem0.addAgentLearning(AGENT_ID, feedbackContent, {
        feedbackScore: score,
        userId: `user_${userId}`,
      });
    }

    return { success: true };
  }

  async getHistory(
    sessionId: number,
    userId: number,
    page = 1,
    size = 20,
    afterCreatedAt?: string,
    afterId?: number,
  ) {
    await this.getSessionById(sessionId, userId);
    const hasCursor = !!afterCreatedAt;
    const cursorDate = afterCreatedAt ? new Date(afterCreatedAt) : null;
    const cursorId = afterId || 0;

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: {
          sessionId,
          ...(hasCursor && cursorDate
            ? {
                OR: [
                  { createdAt: { gt: cursorDate } },
                  { createdAt: cursorDate, id: { gt: cursorId } },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: hasCursor ? 0 : (page - 1) * size,
        take: size,
        select: {
          uuid: true,
          role: true,
          content: true,
          metadata: true,
          feedbackScore: true,
          createdAt: true,
        },
      }),
      this.prisma.chatMessage.count({ where: { sessionId } }),
    ]);

    return {
      messages,
      total,
      page,
      size,
      totalPages: hasCursor ? undefined : Math.ceil(total / size),
    };
  }

  async getSessions(userId: number) {
    const sessions = await this.prisma.chatSession.findMany({
      where: { userId, status: 1 },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        report: {
          select: { id: true, uuid: true, reportType: true, aiSummary: true },
        },
      },
    });

    // For pairing reports, attach the pairing request UUID
    // so the frontend can navigate to the correct chat page
    const pairingReportIds = sessions
      .filter((s) => s.report?.reportType === 'pairing')
      .map((s) => s.report!.id);

    if (pairingReportIds.length > 0) {
      const pairingRequests = await this.prisma.pairingRequest.findMany({
        where: { reportId: { in: pairingReportIds } },
        select: { uuid: true, reportId: true },
      });
      const pairingMap = new Map(pairingRequests.map((p) => [p.reportId, p.uuid]));

      return sessions.map((s) => ({
        ...s,
        pairingRequestUuid: s.report ? pairingMap.get(s.report.id) || null : null,
      }));
    }

    return sessions.map((s) => ({ ...s, pairingRequestUuid: null }));
  }

  async getMemories(sessionId: number, userId: number) {
    const session = await this.getSessionById(sessionId, userId);
    if (!this.mem0.isReady()) return [];

    return this.mem0.searchMultiLayer(
      '',
      `user_${userId}`,
      {
        agentId: AGENT_ID,
        runId: `session_${sessionId}`,
      },
    );
  }

  async deleteSession(sessionId: number, userId: number) {
    const session = await this.getSessionById(sessionId, userId);

    // Clean Session-layer memories
    if (this.mem0.isReady()) {
      try {
        await this.mem0.cleanSessionMemories(`session_${sessionId}`);
      } catch (err) {
        this.logger.warn(`Failed to clean Mem0 memories for session ${sessionId}: ${err.message}`);
      }
    }

    await this.prisma.chatMessage.deleteMany({ where: { sessionId: session.id } });
    await this.prisma.chatSession.delete({ where: { id: session.id } });
    return { success: true };
  }

  /** 管理端删除会话：不校验 userId，并尽量清理 Mem0 会话层记忆 */
  async deleteSessionForAdmin(sessionId: number) {
    const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('会话不存在');

    if (this.mem0.isReady()) {
      try {
        await this.mem0.cleanSessionMemories(`session_${sessionId}`);
      } catch (err: any) {
        this.logger.warn(`Failed to clean Mem0 memories for session ${sessionId}: ${err?.message ?? err}`);
      }
    }

    await this.prisma.chatMessage.deleteMany({ where: { sessionId: session.id } });
    await this.prisma.chatSession.delete({ where: { id: session.id } });
    return { success: true };
  }

  /**
   * Enhanced system prompt with full bazi data, rule engine results,
   * and three-layer memory injection.
   */
  private buildSystemPrompt(report: any, layeredMemories: LayeredSearchResult): string {
    const reportContext = buildReportContext(report);

    // Build data section based on report type
    const dataParts: string[] = [];
    let advisorRole = '你是用户的专属八字命理测算顾问';
    let analysisRules = '';

    if (report.reportType === 'xiaoliuren') {
      // 小六壬模式
      advisorRole = '你是用户的小六壬（马前课）占卜顾问，精通小六壬掌诀推算法和六神解读';
      const xlr = report.xlrRecord;
      if (xlr) {
        dataParts.push(`占卜结果: ${xlr.resultName}（第${xlr.resultPosition}位）`);
        if (xlr.question) dataParts.push(`用户所问: ${xlr.question}`);
        dataParts.push(`推算方式: ${xlr.inputType === 'time' ? '时间推算' : '随机数推算'}`);
        if (xlr.inputDetail) {
          if (xlr.inputType === 'time') {
            dataParts.push(`输入参数: 月${xlr.inputDetail.month} 日${xlr.inputDetail.day} ${xlr.inputDetail.hourBranch}时`);
          } else {
            dataParts.push(`输入参数: 上数${xlr.inputDetail.r1} 中数${xlr.inputDetail.r2} 下数${xlr.inputDetail.r3}`);
          }
        }
      }
      // 掌诀六神对照
      const LIUSHEN_MAP: Record<string, string> = {
        '大安': '青龙·木·大吉', '留连': '玄武·水·凶', '速喜': '朱雀·火·中吉',
        '赤口': '白虎·金·大凶', '小吉': '六合·水·小吉', '空亡': '勾陈·土·大凶',
      };
      if (xlr?.resultName) {
        dataParts.push(`掌诀属性: ${LIUSHEN_MAP[xlr.resultName] || xlr.resultName}`);
      }
      dataParts.push('六掌诀参考: 1.大安(青龙·木·吉) 2.留连(玄武·水·凶) 3.速喜(朱雀·火·吉) 4.赤口(白虎·金·凶) 5.小吉(六合·水·吉) 6.空亡(勾陈·土·凶)');
      analysisRules = `## 分析规则
1. **掌诀为核心**: 所有分析必须以掌诀落位为核心依据，结合五行生克和六神属性
2. **实事求是**: 吉则言吉，凶则言凶，不可过分渲染。凶兆需给出化解方向
3. **行动导向**: 给出具体可行的建议，包括有利方位、有利时机、注意事项
4. **专业表达**: 使用小六壬专业术语，语气专业温和
5. **简洁明了**: 回复控制在 300 字以内
6. 回答以 JSON 格式输出：{"content": "正文", "citeBooks": ["小六壬断诀"], "suggestedQuestions": ["建议问题1", "建议问题2"]}`;
    } else {
      // 八字命理模式
      const chart = report.chart;
      if (chart) {
        const fourPillars = `${chart.yearGan}${chart.yearZhi} ${chart.monthGan}${chart.monthZhi} ${chart.dayGan}${chart.dayZhi} ${chart.hourGan || ''}${chart.hourZhi || ''}`.trim();
        dataParts.push(`四柱: ${fourPillars}`);
        dataParts.push(`日主: ${chart.dayGan} | 身强弱: ${chart.strengthLevel || '未知'}`);
        if (chart.patternName || chart.patternType) {
          dataParts.push(`格局: ${chart.patternName || chart.patternType}`);
        }
        if (chart.yongShen) dataParts.push(`用神: ${chart.yongShen}`);
        if (chart.xiShen) dataParts.push(`喜神: ${chart.xiShen}`);
        if (chart.jiShen) {
          const ji = Array.isArray(chart.jiShen) ? chart.jiShen.join('、') : JSON.stringify(chart.jiShen);
          dataParts.push(`忌神: ${ji}`);
        }
        if (chart.wuxingScore && typeof chart.wuxingScore === 'object') {
          const scores = Object.entries(chart.wuxingScore).map(([k, v]) => `${k}:${v}`).join(' ');
          dataParts.push(`五行评分: ${scores}`);
        }
        if (chart.tenGodsMap && typeof chart.tenGodsMap === 'object') {
          const gods = Object.entries(chart.tenGodsMap).map(([k, v]) => `${k}→${v}`).join('、');
          dataParts.push(`十神: ${gods}`);
        }
        if (chart.shenshaList && Array.isArray(chart.shenshaList) && chart.shenshaList.length > 0) {
          dataParts.push(`神煞: ${chart.shenshaList.join('、')}`);
        }
        if (chart.dayunList && Array.isArray(chart.dayunList)) {
          const currentYear = new Date().getFullYear();
          const current = chart.dayunList.find((d: any) =>
            d.start_year <= currentYear && d.end_year >= currentYear
          );
          if (current) {
            dataParts.push(`当前大运: ${current.gan || ''}${current.zhi || ''}（${current.start_year}-${current.end_year}年）`);
          }
        }
      }
      advisorRole = '你是用户的专属八字命理测算顾问，精通《滴天髓》、《渊海子平》、《三命通会》、《子平真诠》等古籍经典';
      analysisRules = `## 分析规则
1. **核心依据**：所有运势判断必须以用户的喜用神/忌神为核心依据。引用《滴天髓》："用神不可损伤，日主无透伤捷。"
2. **大运参考**：结合当前大运天干地支进行流年分析。引用《三命通会》大运论断法则。
3. **古籍引用规范**：每使用一个专业术语必须注明出处，如"正官（《渊海子平》）"、"七杀（《渊海子平》）"、"正印（《滴天髓》）"等。
4. **重要论断引用**：涉及格局、用神、喜忌等重要判断时，需引用1-2句古籍原文作为支撑。
5. **专业表达**：使用命理专业术语（如十神、格局、神煞等），首次出现时注明古籍出处。
6. **积极引导**：语气专业但温和正面，给出可行建议。
7. **简洁明了**：回复控制在 300 字以内，引用控制在2-3句以内。
8. 如用户问到报告未覆盖的维度，可建议购买对应的深度分析
9. 回答以 JSON 格式输出：{"content": "正文（包含古籍引用）", "citeBooks": ["《滴天髓》", "《渊海子平》"], "suggestedQuestions": ["建议问题1", "建议问题2"]}`;
    }

    // Rule engine summary
    const ruleSummary = buildRuleSummary(report);

    // Three-layer memory formatted text
    const memoryText = formatLayeredMemories(layeredMemories);

    return `${advisorRole}。以下是用户的完整数据、分析报告和分层记忆。

## 用户数据
${dataParts.join('\n') || '无数据'}

## 分析报告摘要
${reportContext || '无报告摘要'}
报告类型: ${report.reportType || '未知'}

${ruleSummary ? `## 规则引擎分析\n${ruleSummary}\n` : ''}
## 分层记忆
${memoryText}

${analysisRules}`;
  }

  /**
   * Store messages to Mem0 and mark them as mem0Added in DB.
   * Runs fire-and-forget with proper error handling.
   * Only marks mem0Added=true after Mem0 successfully accepts the memory.
   */
  private storeMessagesToMem0(
    msgIds: number[],
    messages: Array<{ role: string; content: string }>,
    options: Parameters<Mem0Service['addMemory']>[1],
  ): void {
    this.mem0.addMemory(messages, options).then((result) => {
      if (result && msgIds.length > 0) {
        this.prisma.chatMessage.updateMany({
          where: { id: { in: msgIds } },
          data: { mem0Added: true },
        }).catch((err) => {
          this.logger.warn(`Failed to mark mem0Added for messages [${msgIds.join(',')}]: ${err.message}`);
        });
      }
    }).catch((err) => {
      this.logger.warn(`Mem0 addMemory failed: ${err.message}`);
    });
  }
}
