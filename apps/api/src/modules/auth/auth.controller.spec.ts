import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
  };
  const captchaService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: CaptchaService, useValue: captchaService },
      ],
    }).compile();
    controller = module.get<AuthController>(AuthController);
  });

  describe('captcha', () => {
    it('delegates to CaptchaService.create()', () => {
      const mockResult = { captchaId: 'abc', image: 'data:...' };
      captchaService.create.mockReturnValue(mockResult);
      const result = controller.captcha();
      expect(result).toEqual(mockResult);
      expect(captchaService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('register', () => {
    it('delegates to AuthService.register() with the DTO', async () => {
      const dto = { username: 'user1', password: 'pw1234', captchaId: 'c1', captcha: 'abcd' };
      const mockResult = { user: { id: 1 }, token: 'jwt' };
      authService.register.mockResolvedValue(mockResult);
      const result = await controller.register(dto);
      expect(result).toEqual(mockResult);
      expect(authService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('delegates to AuthService.login() with account field', async () => {
      const dto = { account: 'admin', password: 'pw1234' };
      const mockResult = { user: { id: 1 }, token: 'jwt' };
      authService.login.mockResolvedValue(mockResult);
      const result = await controller.login(dto);
      expect(result).toEqual(mockResult);
      expect(authService.login).toHaveBeenCalledWith(dto);
    });

    it('delegates to AuthService.login() with phone field (backward compat)', async () => {
      const dto = { phone: '13800138000', password: 'pw1234' };
      authService.login.mockResolvedValue({ user: { id: 1 }, token: 'jwt' });
      await controller.login(dto);
      expect(authService.login).toHaveBeenCalledWith(dto);
    });
  });
});
