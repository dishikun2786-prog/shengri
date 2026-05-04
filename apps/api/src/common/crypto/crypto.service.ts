import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(private config: ConfigService) {
    const secret = this.config.get<string>('ENCRYPTION_KEY') || this.config.get<string>('JWT_SECRET') || 'default-key';
    this.key = scryptSync(secret, 'shengri-ai-salt', 32);
  }

  encrypt(plaintext: string): string {
    if (!plaintext) return '';
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decrypt(ciphertext: string): string {
    if (!ciphertext) return '';
    try {
      const buf = Buffer.from(ciphertext, 'base64');
      const iv = buf.subarray(0, IV_LENGTH);
      const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(tag);
      return decipher.update(encrypted) + decipher.final('utf8');
    } catch {
      return ciphertext;
    }
  }

  isEncrypted(value: string): boolean {
    if (!value) return false;
    try {
      const buf = Buffer.from(value, 'base64');
      return buf.length > IV_LENGTH + TAG_LENGTH;
    } catch {
      return false;
    }
  }
}
