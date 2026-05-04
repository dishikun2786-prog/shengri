import { Controller, Get, Put, Body, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface PairingTypeConfig {
  price: number;
  freeCount: number;
  enabled: boolean;
}

export interface PairingPricingConfig {
  personality: PairingTypeConfig;
  career: PairingTypeConfig;
  wealth: PairingTypeConfig;
  hehun: PairingTypeConfig;
  comprehensive: PairingTypeConfig;
}

const DEFAULT_PAIRING_CONFIG: PairingPricingConfig = {
  personality: { price: 29.9, freeCount: 3, enabled: true },
  career: { price: 39.9, freeCount: 2, enabled: true },
  wealth: { price: 39.9, freeCount: 2, enabled: true },
  hehun: { price: 49.9, freeCount: 1, enabled: true },
  comprehensive: { price: 99.9, freeCount: 1, enabled: true },
};

@Controller('admin/pairing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminPairingController {
  private readonly logger = new Logger(AdminPairingController.name);

  constructor(private prisma: PrismaService) {}

  @Get('config')
  async getConfig(): Promise<PairingPricingConfig> {
    const row = await this.prisma.systemConfig.findUnique({
      where: { key: 'pairing' },
    });
    if (!row) {
      return DEFAULT_PAIRING_CONFIG;
    }
    const stored = row.value as any;
    const merged: PairingPricingConfig = { ...DEFAULT_PAIRING_CONFIG };
    for (const key of Object.keys(merged) as (keyof PairingPricingConfig)[]) {
      if (stored[key]) {
        merged[key] = { ...merged[key], ...stored[key] };
      }
    }
    return merged;
  }

  @Put('config')
  async updateConfig(@Body() body: Partial<PairingPricingConfig>) {
    const current = await this.prisma.systemConfig.findUnique({
      where: { key: 'pairing' },
    });

    const merged: PairingPricingConfig = { ...DEFAULT_PAIRING_CONFIG };
    if (current?.value) {
      const stored = current.value as any;
      for (const key of Object.keys(merged) as (keyof PairingPricingConfig)[]) {
        if (stored[key]) {
          merged[key] = { ...merged[key], ...stored[key] };
        }
      }
    }
    for (const key of Object.keys(body) as (keyof PairingPricingConfig)[]) {
      if (body[key]) {
        merged[key] = { ...merged[key], ...body[key] };
      }
    }

    await this.prisma.systemConfig.upsert({
      where: { key: 'pairing' },
      update: { value: merged as any },
      create: { key: 'pairing', value: merged as any },
    });

    this.logger.log(`配对定价配置已更新`);
    return { success: true, config: merged };
  }
}
