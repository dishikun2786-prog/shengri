import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface QuotaResult {
  hasFreeQuota: boolean;
  permanentRemaining: number;
  dailyRemaining: number;
  dailyUsed: number;
  dailyFree: number;
}

interface FreezeParams {
  userId: number;
  provider: string;
  model: string;
  source: string;
  sourceRefId?: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
}

interface FreezeResult {
  consumptionId: number;
  usedFreeQuota: boolean;
  frozenAmount: number;
  balanceAfter: number;
}

interface SettlementResult {
  actualCost: number;
  totalTokens: number;
  freeQuotaUsed: boolean;
  refundAmount: number;
}

const DEFAULT_TOKEN_CONFIG = {
  registrationGift: 5,
  dailyFree: 3,
  chargeEnabled: true,
  estimationSafetyFactor: 1.5,
};

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(private prisma: PrismaService) {}

  // ── Estimation ──

  /**
   * Estimate token count from text.
   * CJK characters ~1.5-2 tokens each (DeepSeek/OpenAI tokenizers).
   * English ~4 chars per token. Spaces/newlines are negligible.
   */
  estimateTokens(text: string): number {
    if (!text) return 0;
    let cjkChars = 0;
    let otherChars = 0;
    for (const ch of text) {
      if (/[\p{Script=Han}\p{Script=Katakana}\p{Script=Hiragana}]/u.test(ch)) {
        cjkChars++;
      } else if (ch !== ' ' && ch !== '\n') {
        otherChars++;
      }
    }
    // CJK: ~1.8 tokens per char (avg between 1.5-2.0 across providers)
    // Latin: ~0.25 tokens per char (4 chars per token)
    return Math.ceil(cjkChars * 1.8 + otherChars * 0.25);
  }

  /** Estimate output tokens from response text (already generated). */
  estimateOutputTokens(responseText: string): number {
    return this.estimateTokens(responseText);
  }

  // ── Pricing ──

  /** Get per-model pricing. Returns null if not configured (track but don't charge). */
  async getPricing(provider: string, model: string) {
    const pricing = await this.prisma.tokenPricing.findFirst({
      where: { provider, modelName: model, isActive: true },
    });
    if (!pricing) {
      return null; // track only, no charge
    }
    return {
      pricePer1kInput: Number(pricing.pricePer1kInput),
      pricePer1kOutput: Number(pricing.pricePer1kOutput),
    };
  }

  // ── Token Config ──

  private async getTokenConfig(): Promise<typeof DEFAULT_TOKEN_CONFIG> {
    const row = await this.prisma.systemConfig.findUnique({
      where: { key: 'token' },
    });
    if (!row) {
      await this.prisma.systemConfig.create({
        data: { key: 'token', value: DEFAULT_TOKEN_CONFIG as any },
      });
      return DEFAULT_TOKEN_CONFIG;
    }
    return { ...DEFAULT_TOKEN_CONFIG, ...(row.value as any) };
  }

  // ── Free Quota ──

  async checkFreeQuota(userId: number): Promise<QuotaResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let quota = await this.prisma.userFreeQuota.findUnique({ where: { userId } });

    if (!quota) {
      const config = await this.getTokenConfig();
      quota = await this.prisma.userFreeQuota.create({
        data: {
          userId,
          permanentFree: config.registrationGift,
          dailyFree: config.dailyFree,
          dailyUsed: 0,
          lifetimeUsed: 0,
          lastDailyReset: today,
        },
      });
    }

    // Daily reset
    if (quota.lastDailyReset && new Date(quota.lastDailyReset) < today) {
      quota = await this.prisma.userFreeQuota.update({
        where: { userId },
        data: { dailyUsed: 0, lastDailyReset: today },
      });
    }

    const permanentRemaining = Math.max(0, quota.permanentFree - quota.lifetimeUsed);
    const dailyRemaining = Math.max(0, quota.dailyFree - quota.dailyUsed);

    return {
      hasFreeQuota: dailyRemaining > 0 || permanentRemaining > 0,
      permanentRemaining,
      dailyRemaining,
      dailyUsed: quota.dailyUsed,
      dailyFree: quota.dailyFree,
    };
  }

  // ── Pre-deduction: Estimate + Freeze ──

  async estimateAndFreeze(params: FreezeParams): Promise<FreezeResult> {
    const config = await this.getTokenConfig();
    const estimatedTotal = params.estimatedInputTokens + params.estimatedOutputTokens;
    const safetyFactor = config.estimationSafetyFactor || 1.5;

    // Check free quota first
    const quota = await this.checkFreeQuota(params.userId);

    if (quota.hasFreeQuota) {
      // Consume free quota: permanent first, then daily
      const consumption = await this.prisma.$transaction(async (tx) => {
        const current = await tx.userFreeQuota.findUniqueOrThrow({
          where: { userId: params.userId },
        });

        let source: 'permanent' | 'daily';
        const permanentRemaining = Math.max(0, current.permanentFree - current.lifetimeUsed);

        if (permanentRemaining > 0) {
          source = 'permanent';
          await tx.userFreeQuota.update({
            where: { userId: params.userId },
            data: { lifetimeUsed: { increment: 1 } },
          });
        } else {
          source = 'daily';
          await tx.userFreeQuota.update({
            where: { userId: params.userId },
            data: { dailyUsed: { increment: 1 } },
          });
        }

        return tx.tokenUsage.create({
          data: {
            userId: params.userId,
            source: params.source,
            sourceRefId: params.sourceRefId,
            provider: params.provider,
            model: params.model,
            estimatedTokens: estimatedTotal,
            estimatedCost: 0,
            frozenAmount: 0,
            freeUsed: true,
            freeSource: source,
            status: 'pending',
          },
        });
      });

      return {
        consumptionId: consumption.id,
        usedFreeQuota: true,
        frozenAmount: 0,
        balanceAfter: 0, // not relevant for free
      };
    }

    // Charge from balance
    if (!config.chargeEnabled) {
      throw new ForbiddenException('免费次数已用完，当前暂不支持付费咨询');
    }

    const pricing = await this.getPricing(params.provider, params.model);
    if (!pricing) {
      // No pricing configured — allow but track only
      const consumption = await this.prisma.tokenUsage.create({
        data: {
          userId: params.userId,
          source: params.source,
          sourceRefId: params.sourceRefId,
          provider: params.provider,
          model: params.model,
          estimatedTokens: estimatedTotal,
          estimatedCost: 0,
          frozenAmount: 0,
          freeUsed: false,
          status: 'pending',
        },
      });
      return {
        consumptionId: consumption.id,
        usedFreeQuota: false,
        frozenAmount: 0,
        balanceAfter: 0,
      };
    }

    // Calculate estimated cost with safety factor
    const estimatedCost = this.calculateCost(
      params.estimatedInputTokens,
      params.estimatedOutputTokens,
      pricing.pricePer1kInput,
      pricing.pricePer1kOutput,
    );
    const frozenAmount = Math.round(estimatedCost * safetyFactor * 100) / 100;

    if (frozenAmount <= 0) {
      const consumption = await this.prisma.tokenUsage.create({
        data: {
          userId: params.userId,
          source: params.source,
          sourceRefId: params.sourceRefId,
          provider: params.provider,
          model: params.model,
          estimatedTokens: estimatedTotal,
          pricePer1kInput: pricing.pricePer1kInput,
          pricePer1kOutput: pricing.pricePer1kOutput,
          estimatedCost,
          frozenAmount: 0,
          freeUsed: false,
          status: 'pending',
        },
      });
      return {
        consumptionId: consumption.id,
        usedFreeQuota: false,
        frozenAmount: 0,
        balanceAfter: 0,
      };
    }

    // Atomic balance deduction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: params.userId } });
      const currentBalance = Number(user.balance || 0);

      if (currentBalance < frozenAmount) {
        throw new ForbiddenException(
          `余额不足：当前余额 ¥${currentBalance.toFixed(2)}，本次预估费用 ¥${frozenAmount.toFixed(2)}。请充值后重试。`,
        );
      }

      const newBalance = currentBalance - frozenAmount;

      await tx.user.update({
        where: { id: params.userId },
        data: { balance: newBalance },
      });

      const balanceTx = await tx.balanceTransaction.create({
        data: {
          userId: params.userId,
          type: 'token_freeze',
          amount: -frozenAmount,
          balanceAfter: newBalance,
          refType: 'token_usage',
          remark: `${params.source} ${params.provider}/${params.model}`,
        },
      });

      const consumption = await tx.tokenUsage.create({
        data: {
          userId: params.userId,
          source: params.source,
          sourceRefId: params.sourceRefId,
          provider: params.provider,
          model: params.model,
          estimatedTokens: estimatedTotal,
          pricePer1kInput: pricing.pricePer1kInput,
          pricePer1kOutput: pricing.pricePer1kOutput,
          estimatedCost,
          frozenAmount,
          balanceTxId: balanceTx.id,
          freeUsed: false,
          status: 'pending',
        },
      });

      return { consumptionId: consumption.id, frozenAmount, balanceAfter: newBalance };
    });

    return {
      consumptionId: result.consumptionId,
      usedFreeQuota: false,
      frozenAmount: result.frozenAmount,
      balanceAfter: result.balanceAfter,
    };
  }

  // ── Settlement ──

  async settle(
    consumptionId: number,
    actualInputTokens: number,
    actualOutputTokens: number,
  ): Promise<SettlementResult> {
    const record = await this.prisma.tokenUsage.findUniqueOrThrow({
      where: { id: consumptionId },
    });

    if (record.status === 'settled' || record.status === 'voided') {
      this.logger.warn(`TokenUsage ${consumptionId} already ${record.status}, skipping settle`);
      return {
        actualCost: Number(record.actualCost),
        totalTokens: record.totalTokens,
        freeQuotaUsed: record.freeUsed,
        refundAmount: 0,
      };
    }

    const totalTokens = actualInputTokens + actualOutputTokens;

    // Free: just update the record
    if (record.freeUsed) {
      await this.prisma.tokenUsage.update({
        where: { id: consumptionId },
        data: {
          inputTokens: actualInputTokens,
          outputTokens: actualOutputTokens,
          totalTokens,
          status: 'settled',
          settledAt: new Date(),
        },
      });
      return { actualCost: 0, totalTokens, freeQuotaUsed: true, refundAmount: 0 };
    }

    // Calculate actual cost
    const pricePer1kInput = Number(record.pricePer1kInput || 0);
    const pricePer1kOutput = Number(record.pricePer1kOutput || 0);
    const actualCost = this.calculateCost(
      actualInputTokens,
      actualOutputTokens,
      pricePer1kInput,
      pricePer1kOutput,
    );
    const frozenAmount = Number(record.frozenAmount);
    const diff = Math.round((frozenAmount - actualCost) * 100) / 100;

    // Atomic settlement
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: record.userId } });
      let newBalance = Number(user.balance || 0);

      if (diff > 0.001) {
        // Refund over-estimate
        newBalance += diff;
        await tx.user.update({
          where: { id: record.userId },
          data: { balance: newBalance },
        });
        await tx.balanceTransaction.create({
          data: {
            userId: record.userId,
            type: 'token_settle',
            amount: diff,
            balanceAfter: newBalance,
            refId: String(consumptionId),
            refType: 'token_usage',
            remark: `退款: 预估${frozenAmount.toFixed(2)} 实际${actualCost.toFixed(4)}`,
          },
        });
      } else if (diff < -0.001) {
        // Additional charge (rare, safety factor should prevent)
        const extra = Math.min(-diff, newBalance); // cap at available balance
        newBalance -= extra;
        await tx.user.update({
          where: { id: record.userId },
          data: { balance: newBalance },
        });
        await tx.balanceTransaction.create({
          data: {
            userId: record.userId,
            type: 'token_settle',
            amount: -extra,
            balanceAfter: newBalance,
            refId: String(consumptionId),
            refType: 'token_usage',
            remark: `补扣: 预估${frozenAmount.toFixed(2)} 实际${actualCost.toFixed(4)}`,
          },
        });
        this.logger.warn(
          `TokenUsage ${consumptionId}: actual cost ${actualCost.toFixed(4)} exceeds frozen ${frozenAmount.toFixed(2)}, extra ${extra.toFixed(2)}`,
        );
      }

      await tx.tokenUsage.update({
        where: { id: consumptionId },
        data: {
          inputTokens: actualInputTokens,
          outputTokens: actualOutputTokens,
          totalTokens,
          actualCost,
          status: 'settled',
          settledAt: new Date(),
        },
      });
    });

    return { actualCost, totalTokens, freeQuotaUsed: false, refundAmount: Math.max(diff, 0) };
  }

  // ── Void (refund on failure) ──

  async voidFreeze(consumptionId: number): Promise<void> {
    const record = await this.prisma.tokenUsage.findUniqueOrThrow({
      where: { id: consumptionId },
    });

    if (record.status === 'voided') return;

    // Free: restore quota
    if (record.freeUsed) {
      await this.prisma.$transaction(async (tx) => {
        const quota = await tx.userFreeQuota.findUniqueOrThrow({
          where: { userId: record.userId },
        });

        if (record.freeSource === 'permanent') {
          await tx.userFreeQuota.update({
            where: { userId: record.userId },
            data: { lifetimeUsed: Math.max(0, quota.lifetimeUsed - 1) },
          });
        } else if (record.freeSource === 'daily') {
          await tx.userFreeQuota.update({
            where: { userId: record.userId },
            data: { dailyUsed: Math.max(0, quota.dailyUsed - 1) },
          });
        }

        await tx.tokenUsage.update({
          where: { id: consumptionId },
          data: { status: 'voided' },
        });
      });
      return;
    }

    // Paid: refund frozen amount
    const frozenAmount = Number(record.frozenAmount);
    if (frozenAmount <= 0) {
      await this.prisma.tokenUsage.update({
        where: { id: consumptionId },
        data: { status: 'voided' },
      });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: record.userId } });
      const newBalance = Number(user.balance || 0) + frozenAmount;

      await tx.user.update({
        where: { id: record.userId },
        data: { balance: newBalance },
      });

      await tx.balanceTransaction.create({
        data: {
          userId: record.userId,
          type: 'token_settle',
          amount: frozenAmount,
          balanceAfter: newBalance,
          refId: String(consumptionId),
          refType: 'token_usage',
          remark: `失败退款: ${record.source} ${record.provider}/${record.model}`,
        },
      });

      await tx.tokenUsage.update({
        where: { id: consumptionId },
        data: { status: 'voided' },
      });
    });
  }

  // ── Track Only (no balance impact, for pre-paid products) ──

  /** Record token usage for statistics without any balance deduction.
   *  Used when the product purchase already covers the AI cost (e.g. reports). */
  async trackOnly(params: {
    userId: number;
    provider: string;
    model: string;
    source: string;
    sourceRefId?: string;
    inputTokens: number;
    outputTokens: number;
  }): Promise<void> {
    await this.prisma.tokenUsage.create({
      data: {
        userId: params.userId,
        source: params.source,
        sourceRefId: params.sourceRefId,
        provider: params.provider,
        model: params.model,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        totalTokens: params.inputTokens + params.outputTokens,
        freeUsed: true,
        freeSource: 'product_paid',
        status: 'settled',
        settledAt: new Date(),
      },
    });
  }

  // ── User History ──

  async getUserUsages(userId: number, page: number, size: number) {
    const [items, total] = await Promise.all([
      this.prisma.tokenUsage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
        select: {
          id: true,
          source: true,
          provider: true,
          model: true,
          totalTokens: true,
          actualCost: true,
          freeUsed: true,
          freeSource: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.tokenUsage.count({ where: { userId } }),
    ]);
    return { items, total, page, size, totalPages: Math.ceil(total / size) };
  }

  // ── Private Helpers ──

  private calculateCost(
    inputTokens: number,
    outputTokens: number,
    pricePer1kInput: number,
    pricePer1kOutput: number,
  ): number {
    const inputCost = (inputTokens / 1000) * pricePer1kInput;
    const outputCost = (outputTokens / 1000) * pricePer1kOutput;
    return Math.round((inputCost + outputCost) * 1e6) / 1e6;
  }
}
