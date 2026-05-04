import { Controller, Get, Put, Post, Body, Param, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ConfigService,
  SiteConfig,
  PaymentConfig,
  PaymentCredentialsConfig,
  UrlConfig,
} from '../config/config.service';

@Controller('admin/config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminConfigController {
  private readonly logger = new Logger(AdminConfigController.name);

  constructor(private configService: ConfigService) {}

  @Get('site')
  getSiteConfig() {
    return this.configService.getSiteConfig();
  }

  @Put('site')
  updateSiteConfig(@Body() body: Partial<SiteConfig>) {
    return this.configService.setSiteConfig(body);
  }

  @Get('payment')
  getPaymentConfig() {
    return this.configService.getPaymentConfig();
  }

  @Put('payment')
  updatePaymentConfig(@Body() body: Partial<PaymentConfig>) {
    return this.configService.setPaymentConfig(body);
  }

  @Get('payment-credentials')
  getPaymentCredentials() {
    return this.configService.getPaymentCredentialsMasked();
  }

  @Put('payment-credentials')
  updatePaymentCredentials(@Body() body: Partial<PaymentCredentialsConfig>) {
    return this.configService.setPaymentCredentials(body);
  }

  @Get('url')
  getUrlConfig() {
    return this.configService.getUrlConfig();
  }

  @Put('url')
  updateUrlConfig(@Body() body: Partial<UrlConfig>) {
    return this.configService.setUrlConfig(body);
  }

  @Get('promotion/commission-rates')
  getPromotionCommissionRates() {
    return this.configService.getPromotionCommissionRates();
  }

  @Put('promotion/commission-rates')
  updatePromotionCommissionRates(@Body() body: any) {
    return this.configService.setPromotionCommissionRates(body);
  }

  @Get('promotion/level-config')
  getPromotionLevelConfig() {
    return this.configService.getPromotionLevelConfig();
  }

  @Put('promotion/level-config')
  updatePromotionLevelConfig(@Body() body: any) {
    return this.configService.setPromotionLevelConfig(body);
  }

  @Post('payment-test/:channel')
  async testPaymentChannel(@Param('channel') channel: string) {
    try {
      const creds = await this.configService.getPaymentCredentials();

      if (channel === 'wechat') {
        const wc = creds.wechat;
        if (!wc.appId || !wc.mchId || !wc.privateKey) {
          return { success: false, message: '微信支付配置不完整，请先填写 AppID、商户号和私钥' };
        }
        const WxPay = require('wechatpay-node-v3');
        const wxPay = new WxPay({
          appid: wc.appId,
          mchid: wc.mchId,
          publicKey: Buffer.from('placeholder'),
          privateKey: Buffer.from(wc.privateKey),
          serial_no: wc.serialNo,
          key: wc.apiV3Key,
        });
        return { success: true, message: '微信支付配置已保存，SDK 初始化成功。实际连通需真实商户号验证。' };
      }

      if (channel === 'alipay') {
        const ali = creds.alipay;
        if (!ali.appId || !ali.privateKey) {
          return { success: false, message: '支付宝配置不完整，请先填写 AppID 和应用私钥' };
        }
        const { AlipaySdk } = require('alipay-sdk');
        const sdk = new AlipaySdk({
          appId: ali.appId,
          privateKey: ali.privateKey,
          alipayPublicKey: ali.alipayPublicKey,
          signType: ali.signType || 'RSA2',
        });
        return { success: true, message: '支付宝配置已保存，SDK 初始化成功。实际连通需真实应用验证。' };
      }

      return { success: false, message: `不支持的渠道: ${channel}` };
    } catch (err: any) {
      this.logger.error(`支付渠道测试失败: ${err.message}`, err.stack);
      return { success: false, message: `配置错误: ${err.message}` };
    }
  }
}
