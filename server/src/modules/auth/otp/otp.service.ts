import { createHash, randomInt } from 'node:crypto';
import { BadRequestException, Inject, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../redis/redis.constants';
import { SMS_PROVIDER, type SmsProvider } from '../sms/sms-provider.interface';

export interface OtpRequestResult {
  expiresInSec: number;
  resendAfterSec: number;
  /** Код возвращается только вне production для удобства разработки/тестов. */
  devCode?: string;
}

/**
 * Управление одноразовыми кодами (Req §8.1, §20, Des §9).
 * Хранит коды в Redis с TTL, ограничивает частоту запросов и число попыток ввода
 * (защита OTP от перебора).
 */
@Injectable()
export class OtpService {
  private readonly codeLength = 4;
  private readonly ttlSec = 300; // срок жизни кода
  private readonly resendCooldownSec = 60; // минимальный интервал между запросами
  private readonly maxRequestsPerHour = 5; // лимит запросов кода на номер в час
  private readonly maxVerifyAttempts = 5; // лимит попыток ввода одного кода

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  async request(phone: string): Promise<OtpRequestResult> {
    const cooldownKey = this.cooldownKey(phone);
    const cooldownTtl = await this.redis.ttl(cooldownKey);
    if (cooldownTtl > 0) {
      throw this.tooManyRequests(
        `Повторный запрос кода возможен через ${cooldownTtl} сек`,
        cooldownTtl,
      );
    }

    const countKey = this.countKey(phone);
    const count = await this.redis.incr(countKey);
    if (count === 1) {
      await this.redis.expire(countKey, 3600);
    }
    if (count > this.maxRequestsPerHour) {
      const ttl = await this.redis.ttl(countKey);
      throw this.tooManyRequests('Превышен лимит запросов кода. Попробуйте позже', ttl);
    }

    const code = this.generateCode();
    await this.redis.hset(this.codeKey(phone), { hash: this.hash(phone, code), attempts: 0 });
    await this.redis.expire(this.codeKey(phone), this.ttlSec);
    await this.redis.set(cooldownKey, '1', 'EX', this.resendCooldownSec);

    await this.sms.sendCode(phone, code);

    return {
      expiresInSec: this.ttlSec,
      resendAfterSec: this.resendCooldownSec,
      devCode: process.env.NODE_ENV === 'production' ? undefined : code,
    };
  }

  /**
   * Проверяет код. При успехе удаляет все связанные ключи и возвращает true.
   */
  async verify(phone: string, code: string): Promise<boolean> {
    const key = this.codeKey(phone);
    const stored = await this.redis.hgetall(key);

    if (!stored || !stored.hash) {
      throw new BadRequestException({
        code: 'OTP_EXPIRED',
        message: 'Код не найден или истёк. Запросите новый',
      });
    }

    const attempts = Number.parseInt(stored.attempts ?? '0', 10);
    if (attempts >= this.maxVerifyAttempts) {
      await this.redis.del(key);
      throw this.tooManyRequests('Превышено число попыток. Запросите новый код');
    }

    if (this.hash(phone, code) !== stored.hash) {
      await this.redis.hincrby(key, 'attempts', 1);
      throw new BadRequestException({ code: 'OTP_INVALID', message: 'Неверный код' });
    }

    await this.redis.del(key, this.cooldownKey(phone), this.countKey(phone));
    return true;
  }

  private generateCode(): string {
    const max = 10 ** this.codeLength;
    return randomInt(0, max).toString().padStart(this.codeLength, '0');
  }

  private hash(phone: string, code: string): string {
    // Пеппер из секрета, чтобы в Redis не хранился код в открытом виде.
    const pepper = process.env.JWT_ACCESS_SECRET ?? 'pepper';
    return createHash('sha256').update(`${phone}:${code}:${pepper}`).digest('hex');
  }

  private codeKey(phone: string): string {
    return `otp:code:${phone}`;
  }

  private cooldownKey(phone: string): string {
    return `otp:cooldown:${phone}`;
  }

  private countKey(phone: string): string {
    return `otp:count:${phone}`;
  }

  private tooManyRequests(message: string, retryAfterSec?: number): HttpException {
    return new HttpException(
      { code: 'TOO_MANY_REQUESTS', message, details: { retryAfterSec } },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
