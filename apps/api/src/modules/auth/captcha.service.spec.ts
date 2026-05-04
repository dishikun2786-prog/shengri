import { CaptchaService } from './captcha.service';

describe('CaptchaService', () => {
  let service: CaptchaService;

  beforeEach(() => {
    service = new CaptchaService();
  });

  describe('create', () => {
    it('returns captchaId and base64 SVG image', () => {
      const result = service.create();
      expect(result).toHaveProperty('captchaId');
      expect(result).toHaveProperty('image');
      expect(result.captchaId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(result.image).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it('generates unique IDs for each call', () => {
      const a = service.create();
      const b = service.create();
      expect(a.captchaId).not.toBe(b.captchaId);
    });
  });

  describe('verify', () => {
    it('returns true for correct answer (case insensitive)', () => {
      const { captchaId } = service.create();
      const store = (service as any).store as Map<string, { answer: string; expires: number }>;
      store.set(captchaId, { answer: 'abcd', expires: Date.now() + 300_000 });

      expect(service.verify(captchaId, 'ABCD')).toBe(true);
    });

    it('returns false for wrong answer', () => {
      const { captchaId } = service.create();
      const store = (service as any).store as Map<string, { answer: string; expires: number }>;
      store.set(captchaId, { answer: 'abcd', expires: Date.now() + 300_000 });

      expect(service.verify(captchaId, 'wxyz')).toBe(false);
    });

    it('returns false for expired captcha', () => {
      const { captchaId } = service.create();
      const store = (service as any).store as Map<string, { answer: string; expires: number }>;
      store.set(captchaId, { answer: 'abcd', expires: Date.now() - 1 });

      expect(service.verify(captchaId, 'abcd')).toBe(false);
    });

    it('returns false when captchaId does not exist', () => {
      expect(service.verify('nonexistent-id', 'abcd')).toBe(false);
    });

    it('consumes captcha on first verify (one-time use)', () => {
      const { captchaId } = service.create();
      const store = (service as any).store as Map<string, { answer: string; expires: number }>;
      store.set(captchaId, { answer: 'abcd', expires: Date.now() + 300_000 });

      expect(service.verify(captchaId, 'abcd')).toBe(true);
      expect(service.verify(captchaId, 'abcd')).toBe(false);
    });

    it('trims and lowercases input', () => {
      const { captchaId } = service.create();
      const store = (service as any).store as Map<string, { answer: string; expires: number }>;
      store.set(captchaId, { answer: 'xy12', expires: Date.now() + 300_000 });

      expect(service.verify(captchaId, '  XY12  ')).toBe(true);
    });
  });
});
