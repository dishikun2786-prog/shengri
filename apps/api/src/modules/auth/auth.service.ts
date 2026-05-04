import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CaptchaService } from './captcha.service';
import { RegisterDto, LoginRequestDto } from './auth.dto';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private captcha: CaptchaService,
  ) {}

  private normalizeUsername(raw: string): string {
    return raw.trim().toLowerCase();
  }

  private resolveAccount(dto: LoginRequestDto): string {
    return (dto.account ?? dto.phone ?? '').trim();
  }

  async register(dto: RegisterDto) {
    if (!this.captcha.verify(dto.captchaId, dto.captcha)) {
      throw new BadRequestException('验证码错误或已过期');
    }

    const username = this.normalizeUsername(dto.username);
    if (!USERNAME_RE.test(username)) {
      throw new BadRequestException('用户名仅支持 3–20 位字母、数字或下划线');
    }

    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new ConflictException('用户名已存在');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Build create data with optional referrer
    const createData: any = {
      username,
      passwordHash,
      nickname: dto.nickname || `用户${username.slice(-4)}`,
    };

    if (dto.referrerId) {
      const referrer = await this.prisma.user.findUnique({ where: { id: dto.referrerId } });
      if (referrer) {
        createData.referrerId = dto.referrerId;
        createData.sourceChannel = 'referral';
      }
    }

    const user = await this.prisma.user.create({ data: createData });

    // Create free quota for new user
    await this.prisma.userFreeQuota.create({
      data: {
        userId: user.id,
        permanentFree: 5,
        dailyFree: 3,
        lastDailyReset: new Date(),
      },
    }).catch(err => { /* quota creation is best-effort */ });

    // Initialize pairing free trials for new user
    const pairingConfig = await this.prisma.systemConfig.findUnique({
      where: { key: 'pairing' },
    });
    if (pairingConfig) {
      const config = pairingConfig.value as any;
      for (const [type, cfg] of Object.entries(config)) {
        const typedCfg = cfg as any;
        if (typedCfg.enabled && typedCfg.freeCount > 0) {
          await this.prisma.pairingFreeTrial.upsert({
            where: { userId_pairingType: { userId: user.id, pairingType: type } },
            update: {},
            create: { userId: user.id, pairingType: type, totalFree: typedCfg.freeCount, usedFree: 0 },
          }).catch(() => { /* best-effort */ });
        }
      }
    }

    const token = this.signToken(user.id, user.uuid);
    return { user: this.sanitizeUser(user), token };
  }

  async login(dto: LoginRequestDto) {
    const account = this.resolveAccount(dto);
    if (!account) {
      throw new BadRequestException('请填写账号');
    }

    const byUsername = this.normalizeUsername(account);
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: byUsername },
          { phone: account },
          { email: { equals: account, mode: 'insensitive' } },
        ],
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('账号或密码错误');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('账号或密码错误');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.signToken(user.id, user.uuid);
    return { user: this.sanitizeUser(user), token };
  }

  async validateUser(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 1) return null;
    return this.sanitizeUser(user);
  }

  private signToken(userId: number, uuid: string) {
    return this.jwt.sign({ sub: userId, uuid });
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
