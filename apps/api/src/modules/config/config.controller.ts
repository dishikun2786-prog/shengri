import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from './config.service';

@ApiTags('config')
@Controller('config')
export class ConfigController {
  constructor(private configService: ConfigService) {}

  @Get('site')
  @ApiOperation({ summary: '获取站点基础信息（公开）' })
  getSiteConfig() {
    return this.configService.getSiteConfig();
  }

  @Get('payment-methods')
  @ApiOperation({ summary: '获取已启用的支付方式列表（公开）' })
  getPaymentMethods() {
    return this.configService.getEnabledPaymentMethods();
  }
}
