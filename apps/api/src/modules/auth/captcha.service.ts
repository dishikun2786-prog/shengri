import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as svgCaptcha from 'svg-captcha';

@Injectable()
export class CaptchaService {
  private readonly store = new Map<string, { answer: string; expires: number }>();
  private readonly ttlMs = 5 * 60 * 1000;

  create(): { captchaId: string; image: string } {
    const { data, text } = svgCaptcha.create({
      size: 4,
      noise: 2,
      color: true,
      width: 120,
      height: 44,
      fontSize: 50,
    });
    const captchaId = randomUUID();
    this.store.set(captchaId, {
      answer: String(text).toLowerCase(),
      expires: Date.now() + this.ttlMs,
    });
    const base64 = Buffer.from(data, 'utf-8').toString('base64');
    return {
      captchaId,
      image: `data:image/svg+xml;base64,${base64}`,
    };
  }

  verify(captchaId: string, input: string): boolean {
    const row = this.store.get(captchaId);
    if (row) {
      this.store.delete(captchaId);
    }
    if (!row || Date.now() > row.expires) {
      return false;
    }
    const v = (input || '').trim().toLowerCase();
    return row.answer === v;
  }
}
