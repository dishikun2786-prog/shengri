import { Injectable, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';

interface SmsDbConfig {
  accessKeyId?: string;
  accessKeySecret?: string;
  signName?: string;
  templateCode?: string;
  endpoint?: string;
}

@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private signName: string;
  private templateCode: string;
  private accessKeyId: string;
  private accessKeySecret: string;
  private endpoint: string;
  private client: Dysmsapi20170525 | null = null;

  constructor(
    private config: ConfigService,
    private redis: RedisService,
    private prisma: PrismaService,
  ) {
    // Init with env var defaults
    this.accessKeyId = this.config.get('ALIBABA_CLOUD_ACCESS_KEY_ID', '');
    this.accessKeySecret = this.config.get('ALIBABA_CLOUD_ACCESS_KEY_SECRET', '');
    this.signName = this.config.get('SMS_SIGN_NAME', '生辰');
    this.templateCode = this.config.get('SMS_TEMPLATE_CODE', '');
    this.endpoint = this.config.get('SMS_ENDPOINT', 'dysmsapi.aliyuncs.com');
  }

  async onModuleInit() {
    await this.loadDbConfig();
  }

  /** Load SMS config from SystemConfig table (admin后台配置优先于.env) */
  private async loadDbConfig() {
    try {
      const row = await this.prisma.systemConfig.findUnique({ where: { key: 'sms' } });
      if (row?.value) {
        const db = row.value as SmsDbConfig;
        if (db.accessKeyId) this.accessKeyId = db.accessKeyId;
        if (db.accessKeySecret) this.accessKeySecret = db.accessKeySecret;
        if (db.signName) this.signName = db.signName;
        if (db.templateCode) this.templateCode = db.templateCode;
        if (db.endpoint) this.endpoint = db.endpoint;
        this.client = null; // reset client to use new credentials
        this.logger.log('SMS config loaded from database');
      }
    } catch (err: any) {
      this.logger.warn(`Failed to load SMS config from DB, using env vars: ${err.message}`);
    }
  }

  /** Reload config after admin update — called internally after upsert */
  async reloadConfig() {
    await this.loadDbConfig();
  }

  private getClient(): Dysmsapi20170525 {
    if (!this.client) {
      const cfg = new $OpenApi.Config({
        accessKeyId: this.accessKeyId,
        accessKeySecret: this.accessKeySecret,
      });
      cfg.endpoint = this.endpoint;
      this.client = new Dysmsapi20170525(cfg);
    }
    return this.client;
  }

  private redisKey(phone: string): string {
    return `sms:code:${phone}`;
  }

  private rateLimitKey(phone: string): string {
    return `sms:ratelimit:${phone}`;
  }

  async sendVerificationCode(phone: string): Promise<{ ok: boolean }> {
    const normalized = this.normalizePhone(phone);

    // Rate limit: 1 SMS per 60 seconds
    const rateKey = this.rateLimitKey(normalized);
    const lastSent = await this.redis.get(rateKey);
    if (lastSent) {
      throw new BadRequestException('验证码已发送，请60秒后再试');
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Reload config from DB before sending (picks up admin changes without restart)
    await this.loadDbConfig();

    // Dev/test mode: skip actual SMS sending, log code to console
    if (!this.accessKeyId || !this.accessKeySecret || !this.templateCode) {
      this.logger.warn(`[DEV MODE] SMS not configured — verification code for ${normalized}: ${code}`);
    } else {
      // Send via Alibaba Cloud SMS
      try {
        const client = this.getClient();
        const sendReq = new $Dysmsapi20170525.SendSmsRequest({
          phoneNumbers: this.toAliPhone(normalized),
          signName: this.signName,
          templateCode: this.templateCode,
          templateParam: JSON.stringify({ code }),
        });
        const resp = await client.sendSms(sendReq);
        if (!resp.body || resp.body.code !== 'OK') {
          throw new Error(`AliSMS error: ${resp.body?.code || 'UNKNOWN'} - ${resp.body?.message || 'no response'}`);
        }
        this.logger.log(`SMS sent to ${normalized}, BizId: ${resp.body.bizId}`);
      } catch (err: any) {
        this.logger.error(`SMS send failed for ${normalized}: ${err.message}`);
        throw new BadRequestException('短信发送失败，请稍后重试');
      }
    }

    // Store code in Redis with 5-minute TTL
    await this.redis.set(this.redisKey(normalized), code, 300);
    // Set rate limit
    await this.redis.set(rateKey, '1', 60);

    return { ok: true };
  }

  async verifyCode(phone: string, code: string): Promise<boolean> {
    const normalized = this.normalizePhone(phone);

    // Rate limit verification attempts: max 5 failures per phone per 5 min
    const attemptKey = `sms:attempt:${normalized}`;
    const attempts = parseInt(await this.redis.get(attemptKey) || '0', 10);
    if (attempts >= 5) {
      throw new BadRequestException('验证次数过多，请5分钟后再试');
    }

    const key = this.redisKey(normalized);
    const stored = await this.redis.get(key);

    if (!stored || stored !== String(code).trim()) {
      // Increment failed attempt counter (TTL matches code TTL)
      await this.redis.set(attemptKey, String(attempts + 1), 300);
      return false;
    }

    // Delete code + attempt counter after successful verification (one-time use)
    await this.redis.del(key);
    await this.redis.del(attemptKey);
    return true;
  }

  /** Normalize phone to E.164 format for consistent Redis key and DB storage */
  normalizePhone(phone: string): string {
    let normalized = phone.replace(/\s+/g, '');
    if (!normalized.startsWith('+')) {
      if (normalized.startsWith('86') && normalized.length === 13) {
        normalized = '+' + normalized;
      } else if (normalized.length === 11 && normalized.startsWith('1')) {
        normalized = '+86' + normalized;
      } else {
        normalized = '+' + normalized;
      }
    }
    return normalized;
  }

  /** Convert E.164 (+8613800138000) to Alibaba Cloud format (13800138000) */
  private toAliPhone(normalized: string): string {
    return normalized.replace(/^\+86/, '');
  }
}
