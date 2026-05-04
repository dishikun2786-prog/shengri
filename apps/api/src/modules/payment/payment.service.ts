import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { OrderService } from '../order/order.service';
import { ConfigService } from '../config/config.service';
import * as crypto from 'crypto';
import * as fs from 'fs';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private orderService: OrderService,
    private nestConfig: NestConfigService,
    private configService: ConfigService,
  ) {}

  // ─── WeChat Pay V3 ──────────────────────────────────────────────────

  private async getWxConfig() {
    const creds = await this.configService.getPaymentCredentials();
    const wc = creds.wechat;
    if (!wc.appId || !wc.mchId) {
      throw new BadRequestException('微信支付尚未配置');
    }

    let privateKey = wc.privateKey;
    if (!privateKey) {
      const keyPath = this.nestConfig.get<string>('WECHAT_PRIVATE_KEY_PATH');
      if (keyPath && fs.existsSync(keyPath)) {
        privateKey = fs.readFileSync(keyPath, 'utf-8');
      }
    }
    if (!privateKey) {
      throw new BadRequestException('微信支付商户私钥未配置');
    }

    return { ...wc, privateKey };
  }

  async createWechatPay(orderNo: string, clientType: string = 'native') {
    const order = await this.orderService.getOrderByNo(orderNo);
    if (!order) throw new BadRequestException('订单不存在');
    if (order.status !== 0) throw new BadRequestException('订单状态异常');

    const wc = await this.getWxConfig();
    const totalFee = Math.round(Number(order.paidAmount) * 100);
    const notifyUrl = wc.notifyUrl || this.nestConfig.get('WECHAT_NOTIFY_URL');

    const baseParams = {
      appid: wc.appId,
      mchid: wc.mchId,
      description: `生日命理-${order.product?.name || '订单'}`.substring(0, 127),
      out_trade_no: orderNo,
      notify_url: notifyUrl,
      amount: { total: totalFee, currency: 'CNY' },
      time_expire: this.getWxExpireTime(),
    };

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');

    try {
      const url = clientType === 'h5' ? '/v3/pay/transactions/h5' : '/v3/pay/transactions/native';
      const params = clientType === 'h5' ? {
        ...baseParams,
        scene_info: {
          payer_client_ip: '127.0.0.1',
          h5_info: { type: 'Wap', app_name: '生日命理', app_url: 'https://shengri.com' },
        },
      } : baseParams;

      const body = JSON.stringify(params);
      const signStr = `POST\n${url}\n${timestamp}\n${nonce}\n${body}\n`;
      const signature = crypto.createSign('RSA-SHA256')
        .update(signStr)
        .sign(wc.privateKey, 'base64');

      const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${wc.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${wc.serialNo}"`;

      const axios = require('axios');
      const res = await axios.post(`https://api.mch.weixin.qq.com${url}`, params, {
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      if (clientType === 'h5') {
        return { orderNo, amount: order.paidAmount, h5Url: res.data.h5_url, type: 'h5' };
      }
      return { orderNo, amount: order.paidAmount, codeUrl: res.data.code_url, type: 'native' };
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message;
      this.logger.error(`微信下单失败: ${errMsg}`, err.stack);
      throw new BadRequestException(`微信支付下单失败: ${errMsg}`);
    }
  }

  private getWxExpireTime(): string {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().replace(/\.\d{3}Z$/, '+08:00');
  }

  async handleWechatNotify(headers: Record<string, string>, rawBody: string): Promise<string> {
    try {
      const creds = await this.configService.getPaymentCredentials();
      const apiV3Key = creds.wechat.apiV3Key;
      if (!apiV3Key) throw new Error('微信 APIv3Key 未配置');

      const timestamp = headers['wechatpay-timestamp'];
      const nonce = headers['wechatpay-nonce'];

      if (!timestamp || !nonce) {
        throw new Error('缺少微信验签头');
      }

      const body = JSON.parse(rawBody);
      const { resource } = body;
      if (!resource) throw new Error('回调数据缺少 resource');

      const { ciphertext, nonce: resNonce, associated_data } = resource;
      const keyBuf = Buffer.alloc(32);
      Buffer.from(apiV3Key, 'utf-8').copy(keyBuf);
      const ciphertextBuf = Buffer.from(ciphertext, 'base64');
      const authTag = ciphertextBuf.subarray(ciphertextBuf.length - 16);
      const encData = ciphertextBuf.subarray(0, ciphertextBuf.length - 16);
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, Buffer.from(resNonce, 'utf-8'));
      decipher.setAuthTag(authTag);
      if (associated_data) decipher.setAAD(Buffer.from(associated_data, 'utf-8'));
      let decrypted = decipher.update(encData, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      const result = JSON.parse(decrypted);
      this.logger.log(`微信回调解密: orderNo=${result.out_trade_no}, state=${result.trade_state}`);

      if (result.trade_state === 'SUCCESS') {
        const existingOrder = await this.orderService.getOrderByNo(result.out_trade_no);
        if (existingOrder && existingOrder.status === 0) {
          await this.orderService.markPaid(result.out_trade_no, {
            paymentMethod: 'wechat',
            paymentNo: result.transaction_id,
          });
        }
      }

      return JSON.stringify({ code: 'SUCCESS', message: '成功' });
    } catch (err: any) {
      this.logger.error(`微信回调处理失败: ${err.message}`, err.stack);
      return JSON.stringify({ code: 'FAIL', message: err.message });
    }
  }

  // ─── Alipay ─────────────────────────────────────────────────────────

  private async getAlipayInstance() {
    const creds = await this.configService.getPaymentCredentials();
    const ali = creds.alipay;
    if (!ali.appId || !ali.privateKey) {
      throw new BadRequestException('支付宝尚未配置');
    }

    const { AlipaySdk } = require('alipay-sdk');
    return new AlipaySdk({
      appId: ali.appId,
      privateKey: ali.privateKey,
      alipayPublicKey: ali.alipayPublicKey,
      signType: ali.signType || 'RSA2',
    });
  }

  async createAlipayPay(orderNo: string, clientType: string = 'page') {
    const order = await this.orderService.getOrderByNo(orderNo);
    if (!order) throw new BadRequestException('订单不存在');
    if (order.status !== 0) throw new BadRequestException('订单状态异常');

    const creds = await this.configService.getPaymentCredentials();
    const alipaySdk = await this.getAlipayInstance();
    const amount = Number(order.paidAmount).toFixed(2);

    const method = clientType === 'wap' ? 'alipay.trade.wap.pay' : 'alipay.trade.page.pay';

    try {
      const formData = alipaySdk.pageExec(method, {
        notify_url: creds.alipay.notifyUrl || this.nestConfig.get('ALIPAY_NOTIFY_URL'),
        return_url: creds.alipay.returnUrl || this.nestConfig.get('ALIPAY_RETURN_URL'),
        bizContent: {
          out_trade_no: orderNo,
          total_amount: amount,
          subject: `生日命理-${order.product?.name || '订单'}`,
          product_code: clientType === 'wap' ? 'QUICK_WAP_WAY' : 'FAST_INSTANT_TRADE_PAY',
        },
      });

      return { orderNo, amount: order.paidAmount, formHtml: formData, type: clientType };
    } catch (err: any) {
      this.logger.error(`支付宝下单失败: ${err.message}`, err.stack);
      throw new BadRequestException(`支付宝下单失败: ${err.message}`);
    }
  }

  async handleAlipayNotify(body: Record<string, string>): Promise<string> {
    try {
      const alipaySdk = await this.getAlipayInstance();
      const signVerified = alipaySdk.checkNotifySign(body);

      if (!signVerified) {
        this.logger.warn('支付宝回调验签失败');
        return 'fail';
      }

      const { out_trade_no, trade_no, trade_status } = body;
      this.logger.log(`支付宝回调: orderNo=${out_trade_no}, status=${trade_status}`);

      if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
        const existingOrder = await this.orderService.getOrderByNo(out_trade_no);
        if (existingOrder && existingOrder.status === 0) {
          await this.orderService.markPaid(out_trade_no, {
            paymentMethod: 'alipay',
            paymentNo: trade_no,
          });
        }
      }

      return 'success';
    } catch (err: any) {
      this.logger.error(`支付宝回调处理失败: ${err.message}`, err.stack);
      return 'fail';
    }
  }

  // ─── 查单 ───────────────────────────────────────────────────────────

  async queryPaymentStatus(orderNo: string) {
    const order = await this.orderService.getOrderByNo(orderNo);
    if (!order) throw new BadRequestException('订单不存在');

    return {
      orderNo: order.orderNo,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentNo: order.paymentNo,
      paidAt: order.paidAt,
      amount: order.paidAmount,
      isPaid: order.status === 1,
    };
  }
}
