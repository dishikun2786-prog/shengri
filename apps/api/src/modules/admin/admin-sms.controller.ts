import { Controller, Get, Put, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface SmsConfig {
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  templateCode: string;
  endpoint: string;
}

const DEFAULT_SMS_CONFIG: SmsConfig = {
  accessKeyId: '',
  accessKeySecret: '',
  signName: '生辰',
  templateCode: '',
  endpoint: 'dysmsapi.aliyuncs.com',
};

@ApiTags('管理后台 - 短信配置')
@Controller('admin/sms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminSmsController {
  private readonly logger = new Logger(AdminSmsController.name);

  constructor(private prisma: PrismaService) {}

  @Get('config')
  @ApiOperation({ summary: '获取短信配置' })
  async getConfig(): Promise<SmsConfig> {
    const row = await this.prisma.systemConfig.findUnique({ where: { key: 'sms' } });
    if (!row) return DEFAULT_SMS_CONFIG;
    return { ...DEFAULT_SMS_CONFIG, ...(row.value as any) };
  }

  @Put('config')
  @ApiOperation({ summary: '更新短信配置' })
  async updateConfig(@Body() body: Partial<SmsConfig>) {
    const current = await this.prisma.systemConfig.findUnique({ where: { key: 'sms' } });
    const merged = { ...DEFAULT_SMS_CONFIG, ...(current?.value as any || {}), ...body };

    await this.prisma.systemConfig.upsert({
      where: { key: 'sms' },
      update: { value: merged as any },
      create: { key: 'sms', value: merged as any },
    });

    this.logger.log('SMS 配置已更新');
    return { success: true };
  }
}
