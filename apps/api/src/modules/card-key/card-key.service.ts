import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { randomBytes } from 'crypto';

@Injectable()
export class CardKeyService {
  constructor(private prisma: PrismaService) {}

  async generateBatch(params: {
    amount: number;
    count: number;
    remark?: string;
    expireAt?: string;
    creatorId?: number;
    deductBalance?: boolean;
  }) {
    const { amount, count, remark, expireAt, creatorId, deductBalance } = params;

    if (amount <= 0) throw new BadRequestException('面值必须大于0');
    if (count <= 0 || count > 1000) throw new BadRequestException('数量必须在 1-1000 之间');

    const totalCost = amount * count;
    const batchNo = `${creatorId ? 'AG' : 'CK'}${Date.now()}${this.randomAlpha(4)}`;
    const expireDate = expireAt ? new Date(expireAt) : null;

    // Generate unique codes (no side effects)
    const codes = new Set<string>();
    while (codes.size < count) {
      codes.add(this.generateCode());
    }

    const existing = await this.prisma.cardKey.findMany({
      where: { code: { in: [...codes] } },
      select: { code: true },
    });
    const existingSet = new Set(existing.map((e) => e.code));
    for (const c of existingSet) codes.delete(c);
    while (codes.size < count) {
      const nc = this.generateCode();
      if (!existingSet.has(nc)) codes.add(nc);
    }

    // Balance deduction + card creation in single transaction
    await this.prisma.$transaction(async (tx) => {
      if (deductBalance && creatorId) {
        const user = await tx.user.findUniqueOrThrow({ where: { id: creatorId } });
        const balance = Number(user.balance || 0);
        if (balance < totalCost) {
          throw new BadRequestException(
            `余额不足：当前余额 ¥${balance.toFixed(2)}，需 ¥${totalCost.toFixed(2)}`,
          );
        }

        const updated = await tx.user.update({
          where: { id: creatorId },
          data: { balance: { decrement: totalCost } },
        });

        await tx.balanceTransaction.create({
          data: {
            userId: creatorId,
            type: 'agent_card_cost',
            amount: -totalCost,
            balanceAfter: updated.balance,
            refType: 'card_key',
            remark: `生成卡密 ${count}张×¥${amount} 批号: ${batchNo}`,
          },
        });
      }

      await tx.cardKey.createMany({
        data: [...codes].map((code) => ({
          code,
          amount: new Decimal(amount),
          batchNo,
          remark: remark || null,
          expireAt: expireDate,
          creatorId: creatorId || null,
        })),
      });
    });

    return { batchNo, count: codes.size, amount, totalCost: deductBalance ? totalCost : undefined };
  }

  async redeemCardKey(userId: number, code: string) {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) throw new BadRequestException('请输入卡密');

    return this.prisma.$transaction(async (tx) => {
      const cardKey = await tx.cardKey.findUnique({
        where: { code: trimmedCode },
      });

      if (!cardKey) throw new NotFoundException('卡密不存在');
      if (cardKey.status === 1) throw new BadRequestException('该卡密已被使用');
      if (cardKey.status === 2) throw new BadRequestException('该卡密已作废');
      if (cardKey.expireAt && cardKey.expireAt < new Date()) {
        throw new BadRequestException('该卡密已过期');
      }

      await tx.cardKey.update({
        where: { id: cardKey.id },
        data: { status: 1, usedById: userId, usedAt: new Date() },
      });

      const user = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: cardKey.amount } },
      });

      const tx_record = await tx.balanceTransaction.create({
        data: {
          userId,
          type: 'recharge',
          amount: cardKey.amount,
          balanceAfter: user.balance,
          refId: cardKey.code,
          refType: 'card_key',
          remark: `卡密充值 ¥${cardKey.amount}`,
        },
      });

      return {
        success: true,
        amount: cardKey.amount,
        balance: user.balance,
        transactionId: tx_record.id,
      };
    });
  }

  async voidCardKey(id: number) {
    const cardKey = await this.prisma.cardKey.findUnique({ where: { id } });
    if (!cardKey) throw new NotFoundException('卡密不存在');
    if (cardKey.status !== 0) {
      throw new BadRequestException('只能作废未使用的卡密');
    }

    return this.prisma.cardKey.update({
      where: { id },
      data: { status: 2 },
    });
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = randomBytes(16);
    let code = '';
    for (let i = 0; i < 16; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  private randomAlpha(len: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const bytes = randomBytes(len);
    let s = '';
    for (let i = 0; i < len; i++) {
      s += chars[bytes[i] % chars.length];
    }
    return s;
  }
}
