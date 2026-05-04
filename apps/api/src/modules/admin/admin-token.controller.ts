import { Controller, Get, Put, Body, UseGuards, Logger, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

const DEFAULT_TOKEN_CONFIG = {
  registrationGift: 5,
  dailyFree: 3,
  chargeEnabled: true,
  estimationSafetyFactor: 1.5,
};

@Controller('admin/token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminTokenController {
  private readonly logger = new Logger(AdminTokenController.name);

  constructor(private prisma: PrismaService) {}

  @Get('config')
  async getConfig() {
    const row = await this.prisma.systemConfig.findUnique({
      where: { key: 'token' },
    });
    if (!row) {
      return DEFAULT_TOKEN_CONFIG;
    }
    return { ...DEFAULT_TOKEN_CONFIG, ...(row.value as any) };
  }

  @Put('config')
  async updateConfig(@Body() body: any) {
    const current = await this.prisma.systemConfig.findUnique({
      where: { key: 'token' },
    });

    const merged = {
      ...DEFAULT_TOKEN_CONFIG,
      ...(current?.value as any || {}),
      ...body,
    };

    await this.prisma.systemConfig.upsert({
      where: { key: 'token' },
      update: { value: merged as any },
      create: { key: 'token', value: merged as any },
    });

    this.logger.log(`Token 配置已更新: ${JSON.stringify(merged)}`);
    return { success: true, config: merged };
  }
}
