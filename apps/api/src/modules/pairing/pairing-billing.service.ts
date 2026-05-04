import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderService } from '../order/order.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface PairingTypePricing {
  price: number;
  freeCount: number;
  enabled: boolean;
}

export interface FreeTrialStatus {
  hasFree: boolean;
  remaining: number;
  total: number;
}

const DEFAULT_PAIRING_CONFIG: Record<string, PairingTypePricing> = {
  personality: { price: 29.9, freeCount: 3, enabled: true },
  career: { price: 39.9, freeCount: 2, enabled: true },
  wealth: { price: 39.9, freeCount: 2, enabled: true },
  hehun: { price: 49.9, freeCount: 1, enabled: true },
  comprehensive: { price: 99.9, freeCount: 1, enabled: true },
};

@Injectable()
export class PairingBillingService {
  private readonly logger = new Logger(PairingBillingService.name);

  constructor(
    private prisma: PrismaService,
    private orderService: OrderService,
  ) {}

  async getPricingConfig(): Promise<Record<string, PairingTypePricing>> {
    const row = await this.prisma.systemConfig.findUnique({
      where: { key: 'pairing' },
    });
    if (!row) return { ...DEFAULT_PAIRING_CONFIG };

    const stored = row.value as any;
    const merged = { ...DEFAULT_PAIRING_CONFIG };
    for (const key of Object.keys(merged)) {
      if (stored[key]) {
        merged[key] = { ...merged[key], ...stored[key] };
      }
    }
    return merged;
  }

  async getPricing(pairingType: string): Promise<PairingTypePricing> {
    const config = await this.getPricingConfig();
    const pricing = config[pairingType];
    if (!pricing) throw new NotFoundException(`未知的配对类型: ${pairingType}`);
    return pricing;
  }

  async checkFreeTrial(userId: number, pairingType: string): Promise<FreeTrialStatus> {
    const pricing = await this.getPricing(pairingType);

    let record = await this.prisma.pairingFreeTrial.findUnique({
      where: { userId_pairingType: { userId, pairingType } },
    });

    if (!record) {
      record = await this.prisma.pairingFreeTrial.create({
        data: {
          userId,
          pairingType,
          totalFree: pricing.freeCount,
          usedFree: 0,
        },
      });
    }

    return {
      hasFree: record.usedFree < record.totalFree,
      remaining: Math.max(0, record.totalFree - record.usedFree),
      total: record.totalFree,
    };
  }

  async consumeFreeTrial(userId: number, pairingType: string): Promise<boolean> {
    const record = await this.prisma.pairingFreeTrial.findUnique({
      where: { userId_pairingType: { userId, pairingType } },
    });
    if (!record) return false;
    if (record.usedFree >= record.totalFree) return false;

    await this.prisma.pairingFreeTrial.update({
      where: { id: record.id },
      data: { usedFree: { increment: 1 } },
    });
    return true;
  }

  async createPairingOrder(
    userId: number,
    pairingRequestUuid: string,
    pairingType: string,
  ) {
    const pricing = await this.getPricing(pairingType);
    if (!pricing.enabled) {
      throw new BadRequestException('该配对类型已关闭');
    }
    if (pricing.price <= 0) {
      throw new BadRequestException('该配对类型为免费，无需支付');
    }

    const product = await this.prisma.product.findUnique({
      where: { productCode: 'PAIRING_REPORT' },
    });
    if (!product) {
      throw new NotFoundException('配对报告产品未配置');
    }

    const order = await this.orderService.createOrder({
      userId,
      productId: product.id,
    });

    // Update order with pairing-specific price
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        originalAmount: new Decimal(pricing.price),
        paidAmount: new Decimal(pricing.price),
      },
    });

    // Link order to pairing request
    await this.prisma.pairingRequest.update({
      where: { uuid: pairingRequestUuid },
      data: { orderId: order.id },
    });

    return this.prisma.order.findUnique({
      where: { id: order.id },
    });
  }

  async initFreeTrialsForUser(userId: number): Promise<void> {
    const config = await this.getPricingConfig();
    for (const [type, pricing] of Object.entries(config)) {
      if (pricing.enabled && pricing.freeCount > 0) {
        await this.prisma.pairingFreeTrial.upsert({
          where: { userId_pairingType: { userId, pairingType: type } },
          update: {},
          create: {
            userId,
            pairingType: type,
            totalFree: pricing.freeCount,
            usedFree: 0,
          },
        });
      }
    }
  }
}
