import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as crypto from 'crypto';

export interface SiteConfig {
  title: string;
  subtitle: string;
  description: string;
  keywords: string;
  favicon: string;
  logo: string;
  brandName: string;
  brandNameEn: string;
  footer: string;
  icp: string;
  contactEmail: string;
  contactPhone: string;
}

export interface PaymentMethodConfig {
  enabled: boolean;
  label: string;
  sortOrder: number;
}

export interface PaymentConfig {
  wechat: PaymentMethodConfig;
  alipay: PaymentMethodConfig;
  balance: PaymentMethodConfig;
  card_key: PaymentMethodConfig;
}

const DEFAULT_SITE_CONFIG: SiteConfig = {
  title: 'ShengRi 生日命理',
  subtitle: '专业八字排盘 · AI智能批命',
  description:
    '专业级八字排盘平台，融合传统命理学与AI技术，提供精准的八字分析、命理解读、运势预测等服务。',
  keywords: '八字排盘,命理分析,AI批命,生辰八字,运势预测,生日命理',
  favicon: '/favicon.ico',
  logo: '',
  brandName: '生日命理',
  brandNameEn: 'ShengRi',
  footer: '命理分析仅供参考，人生选择由您做主',
  icp: '',
  contactEmail: '',
  contactPhone: '',
};

const DEFAULT_URL_CONFIG: UrlConfig = {
  apiUrl: '',
  webUrl: '',
  adminUrl: '',
};

export interface WechatPayCredentials {
  appId: string;
  mchId: string;
  serialNo: string;
  privateKey: string;
  notifyUrl: string;
  apiV3Key: string;
}

export interface AlipayCredentials {
  appId: string;
  privateKey: string;
  alipayPublicKey: string;
  notifyUrl: string;
  returnUrl: string;
  signType: 'RSA2';
}

export interface PaymentCredentialsConfig {
  wechat: WechatPayCredentials;
  alipay: AlipayCredentials;
}

export interface UrlConfig {
  apiUrl: string;
  webUrl: string;
  adminUrl: string;
}

const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  wechat: { enabled: false, label: '微信支付', sortOrder: 1 },
  alipay: { enabled: false, label: '支付宝', sortOrder: 2 },
  balance: { enabled: true, label: '余额支付', sortOrder: 3 },
  card_key: { enabled: true, label: '卡密支付', sortOrder: 4 },
};

const DEFAULT_PAYMENT_CREDENTIALS: PaymentCredentialsConfig = {
  wechat: {
    appId: '', mchId: '', serialNo: '', privateKey: '',
    notifyUrl: '', apiV3Key: '',
  },
  alipay: {
    appId: '', privateKey: '', alipayPublicKey: '',
    notifyUrl: '', returnUrl: '', signType: 'RSA2',
  },
};

const SENSITIVE_FIELDS = ['privateKey', 'apiV3Key'];

@Injectable()
export class ConfigService {
  private encryptionKey: string;

  constructor(
    private prisma: PrismaService,
    private nestConfig: NestConfigService,
  ) {
    this.encryptionKey = this.nestConfig.get<string>('ENCRYPTION_KEY') || 'default-key-change-me';
  }

  private encrypt(text: string): string {
    if (!text) return text;
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `enc:${iv.toString('hex')}:${encrypted}`;
  }

  private decrypt(text: string): string {
    if (!text || !text.startsWith('enc:')) return text;
    const parts = text.split(':');
    if (parts.length !== 3) return text;
    const iv = Buffer.from(parts[1], 'hex');
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(parts[2], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private maskSensitive(value: string): string {
    if (!value) return '';
    if (value.length <= 12) return '****';
    return value.substring(0, 8) + '****';
  }

  async getConfig<T>(key: string, defaultValue: T): Promise<T> {
    const row = await this.prisma.systemConfig.findUnique({ where: { key } });
    if (!row) {
      await this.prisma.systemConfig.create({
        data: { key, value: defaultValue as any },
      });
      return defaultValue;
    }
    return { ...defaultValue, ...(row.value as any) } as T;
  }

  async setConfig(key: string, value: any): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async getSiteConfig(): Promise<SiteConfig> {
    return this.getConfig('site', DEFAULT_SITE_CONFIG);
  }

  async setSiteConfig(value: Partial<SiteConfig>): Promise<SiteConfig> {
    const current = await this.getSiteConfig();
    const merged = { ...current, ...value };
    await this.setConfig('site', merged);
    return merged;
  }

  async getUrlConfig(): Promise<UrlConfig> {
    return this.getConfig('url', DEFAULT_URL_CONFIG);
  }

  async setUrlConfig(value: Partial<UrlConfig>): Promise<UrlConfig> {
    const current = await this.getUrlConfig();
    const merged = { ...current, ...value };
    await this.setConfig('url', merged);
    return merged;
  }

  async getPaymentConfig(): Promise<PaymentConfig> {
    return this.getConfig('payment', DEFAULT_PAYMENT_CONFIG);
  }

  async setPaymentConfig(
    value: Partial<PaymentConfig>,
  ): Promise<PaymentConfig> {
    const current = await this.getPaymentConfig();
    const merged = { ...current, ...value };
    await this.setConfig('payment', merged);
    return merged;
  }

  async getEnabledPaymentMethods(): Promise<
    Array<{ key: string; label: string; sortOrder: number }>
  > {
    const config = await this.getPaymentConfig();
    return Object.entries(config)
      .filter(([, v]) => v.enabled)
      .map(([k, v]) => ({ key: k, label: v.label, sortOrder: v.sortOrder }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getPaymentCredentials(): Promise<PaymentCredentialsConfig> {
    const raw = await this.getConfig('payment_credentials', DEFAULT_PAYMENT_CREDENTIALS);
    const decrypted = JSON.parse(JSON.stringify(raw));
    for (const channel of ['wechat', 'alipay'] as const) {
      for (const field of SENSITIVE_FIELDS) {
        if (decrypted[channel]?.[field]) {
          decrypted[channel][field] = this.decrypt(decrypted[channel][field]);
        }
      }
    }
    return decrypted;
  }

  async getPaymentCredentialsMasked(): Promise<PaymentCredentialsConfig> {
    const full = await this.getPaymentCredentials();
    const masked = JSON.parse(JSON.stringify(full));
    for (const channel of ['wechat', 'alipay'] as const) {
      for (const field of SENSITIVE_FIELDS) {
        if (masked[channel]?.[field]) {
          masked[channel][field] = this.maskSensitive(masked[channel][field]);
        }
      }
    }
    return masked;
  }

  // ─── Promotion config ──────────────────────────────────────────────

  async getPromotionCommissionRates(): Promise<any> {
    return this.getConfig('promotion.commission_rates', {
      defaultL1Rate: 0.15,
      defaultL2Rate: 0.05,
      levelBonuses: {
        '1': { l1Bonus: 0, l2Bonus: 0 },
        '2': { l1Bonus: 0.05, l2Bonus: 0 },
        '3': { l1Bonus: 0.10, l2Bonus: 0.05 },
      },
    });
  }

  async setPromotionCommissionRates(value: any): Promise<any> {
    const current = await this.getPromotionCommissionRates();
    const merged = { ...current, ...value };
    await this.setConfig('promotion.commission_rates', merged);
    return merged;
  }

  async getPromotionLevelConfig(): Promise<any> {
    return this.getConfig('promotion.level_config', {
      autoUpgrade: false,
      levels: {
        '1': { name: '普通推广员', minTeamSize: 0, minEarnings: 0 },
        '2': { name: '金牌推广员', minTeamSize: 10, minEarnings: 5000 },
        '3': { name: '钻石推广员', minTeamSize: 50, minEarnings: 20000 },
      },
    });
  }

  async setPromotionLevelConfig(value: any): Promise<any> {
    const current = await this.getPromotionLevelConfig();
    const merged = { ...current, ...value };
    await this.setConfig('promotion.level_config', merged);
    return merged;
  }

  async setPaymentCredentials(
    value: Partial<PaymentCredentialsConfig>,
  ): Promise<PaymentCredentialsConfig> {
    const current = await this.getPaymentCredentials();
    const merged: any = { ...current };
    for (const channel of ['wechat', 'alipay'] as const) {
      if (value[channel]) {
        merged[channel] = { ...current[channel], ...value[channel] };
      }
    }
    const encrypted = JSON.parse(JSON.stringify(merged));
    for (const channel of ['wechat', 'alipay'] as const) {
      for (const field of SENSITIVE_FIELDS) {
        if (encrypted[channel]?.[field] && !encrypted[channel][field].startsWith('enc:')) {
          encrypted[channel][field] = this.encrypt(encrypted[channel][field]);
        }
      }
    }
    await this.setConfig('payment_credentials', encrypted);
    return merged;
  }
}
