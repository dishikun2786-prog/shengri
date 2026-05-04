import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import * as crypto from 'crypto';

@Injectable()
export class OpenApiService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async validateApiKey(apiKey: string): Promise<{ userId: number; rateLimit: number }> {
    const cached = await this.redis.getJson<any>(`apikey:${apiKey}`);
    if (cached) return cached;

    // Fallback: check env-configured test key for development
    const testKey = process.env.OPEN_API_TEST_KEY;
    if (testKey && apiKey === testKey) {
      const result = { userId: 0, rateLimit: 60 };
      await this.redis.setJson(`apikey:${apiKey}`, result, 3600);
      return result;
    }

    throw new UnauthorizedException('Invalid API key');
  }

  async checkRateLimit(apiKey: string, limit: number): Promise<boolean> {
    const key = `ratelimit:${apiKey}:${Math.floor(Date.now() / 60000)}`;
    const client = this.redis.getClient();
    const current = await client.incr(key);
    if (current === 1) {
      await client.expire(key, 60);
    }
    return current <= limit;
  }

  generateApiKey(): string {
    return `sr_${crypto.randomBytes(24).toString('hex')}`;
  }

  async registerApiKey(userId: number, rateLimit: number = 60): Promise<string> {
    const key = this.generateApiKey();
    await this.redis.setJson(`apikey:${key}`, { userId, rateLimit }, 86400 * 365);
    return key;
  }
}
