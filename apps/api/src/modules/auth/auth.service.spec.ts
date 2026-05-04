import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CaptchaService } from './captcha.service';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const jwt = { sign: jest.fn(() => 'jwt-token') };
  const captcha = { verify: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: CaptchaService, useValue: captcha },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  /* ─── register ──────────────────────────────────── */
  describe('register', () => {
    const baseDto = {
      username: 'user1',
      password: 'secret12',
      captchaId: 'id1',
      captcha: 'abcd',
    };

    it('rejects when captcha invalid', async () => {
      captcha.verify.mockReturnValue(false);
      await expect(service.register(baseDto)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects invalid username format (too short)', async () => {
      captcha.verify.mockReturnValue(true);
      await expect(
        service.register({ ...baseDto, username: 'ab' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects invalid username format (special chars)', async () => {
      captcha.verify.mockReturnValue(true);
      await expect(
        service.register({ ...baseDto, username: 'user@name!' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when username taken', async () => {
      captcha.verify.mockReturnValue(true);
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      await expect(
        service.register({ ...baseDto, username: 'taken' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('normalizes username to lowercase', async () => {
      captcha.verify.mockReturnValue(true);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 2,
        uuid: 'u-1',
        username: 'newuser',
        passwordHash: 'x',
        role: 'user',
      });
      await service.register({ ...baseDto, username: 'NewUser' });
      const createArg = prisma.user.create.mock.calls[0][0];
      expect(createArg.data.username).toBe('newuser');
    });

    it('creates user and returns token (no passwordHash exposed)', async () => {
      captcha.verify.mockReturnValue(true);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 2,
        uuid: 'u-1',
        username: 'newuser',
        passwordHash: 'x',
        role: 'user',
      });
      const out = await service.register({ ...baseDto, username: 'NewUser' });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(out.token).toBe('jwt-token');
      expect(out.user).not.toHaveProperty('passwordHash');
      expect(out.user).toHaveProperty('username', 'newuser');
    });

    it('hashes password before storing', async () => {
      captcha.verify.mockReturnValue(true);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 3,
        uuid: 'u-2',
        username: 'hashtest',
        passwordHash: 'hashed',
        role: 'user',
      });
      await service.register({ ...baseDto, username: 'hashtest', password: 'plain123' });
      const pw = prisma.user.create.mock.calls[0][0].data.passwordHash;
      expect(pw).not.toBe('plain123');
      expect(await bcrypt.compare('plain123', pw)).toBe(true);
    });

    it('generates default nickname from username suffix', async () => {
      captcha.verify.mockReturnValue(true);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 4,
        uuid: 'u-3',
        username: 'longusername',
        passwordHash: 'h',
        role: 'user',
      });
      await service.register({ ...baseDto, username: 'longusername' });
      const nickname = prisma.user.create.mock.calls[0][0].data.nickname;
      expect(nickname).toBe('用户name');
    });

    it('uses provided nickname when given', async () => {
      captcha.verify.mockReturnValue(true);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 5,
        uuid: 'u-4',
        username: 'user5',
        passwordHash: 'h',
        role: 'user',
      });
      await service.register({ ...baseDto, username: 'user5', nickname: '自定义昵称' });
      const nickname = prisma.user.create.mock.calls[0][0].data.nickname;
      expect(nickname).toBe('自定义昵称');
    });
  });

  /* ─── login ─────────────────────────────────────── */
  describe('login', () => {
    const mockUser = {
      id: 1,
      uuid: 'u-admin',
      username: 'admin',
      phone: '13800138000',
      email: 'admin@test.com',
      passwordHash: '',
      status: 1,
    };

    beforeEach(async () => {
      mockUser.passwordHash = await bcrypt.hash('correct123', 10);
    });

    it('rejects empty account', async () => {
      await expect(
        service.login({ password: 'secret12' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.login({ account: 'ghost', password: 'secret12' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects wrong password', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      await expect(
        service.login({ account: 'admin', password: 'wrongpw' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('succeeds with correct account (username) + password', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      const out = await service.login({ account: 'admin', password: 'correct123' });
      expect(out.token).toBe('jwt-token');
      expect(out.user).not.toHaveProperty('passwordHash');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });

    it('builds OR query for username/phone/email', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      await service.login({ account: 'Test@Example.com', password: 'correct123' });
      const query = prisma.user.findFirst.mock.calls[0][0];
      expect(query.where.OR).toHaveLength(3);
      expect(query.where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ username: 'test@example.com' }),
          expect.objectContaining({ phone: 'Test@Example.com' }),
          expect.objectContaining({ email: expect.objectContaining({ equals: 'Test@Example.com', mode: 'insensitive' }) }),
        ]),
      );
    });

    it('accepts backward-compatible phone field for admin clients', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      const out = await service.login({ phone: 'admin', password: 'correct123' });
      expect(out.token).toBe('jwt-token');
      const query = prisma.user.findFirst.mock.calls[0][0];
      expect(query.where.OR[1]).toEqual({ phone: 'admin' });
    });

    it('rejects user without passwordHash', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, passwordHash: null });
      await expect(
        service.login({ account: 'admin', password: 'correct123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  /* ─── validateUser ──────────────────────────────── */
  describe('validateUser', () => {
    it('returns sanitized user when active', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        uuid: 'u-1',
        username: 'admin',
        passwordHash: 'secret',
        status: 1,
      });
      const result = await service.validateUser(1);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('username', 'admin');
    });

    it('returns null when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.validateUser(999);
      expect(result).toBeNull();
    });

    it('returns null when user is disabled (status !== 1)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        uuid: 'u-1',
        username: 'admin',
        passwordHash: 'secret',
        status: 0,
      });
      const result = await service.validateUser(1);
      expect(result).toBeNull();
    });
  });
});
