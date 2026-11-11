import { timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import type { SmsConfig } from '../../../config/configuration';
import { REDIS_CLIENT } from '../../../redis/redis.constants';
import { SmsAeroClient, SmsAeroRequestError, toMsisdn } from '../sms/smsaero.client';
import { mapMobileIdStatus, preferStatus, type MobileIdChallengeStatus } from './mobile-id.status';

export interface MobileIdRequestResult {
  expiresInSec: number;
  resendAfterSec: number;
  method: 'mobile-id';
  status: 'pending' | 'otp_required';
  /** Только тестовый ключ SMS Aero и не production: код всегда 1234. */
  devCode?: string;
}

interface MobileIdSession {
  id: number;
  phone: string;
  status: MobileIdChallengeStatus;
  attempts: number;
}

const SESSION_TTL_SEC = 300;
const RESEND_COOLDOWN_SEC = 60;
const MAX_REQUESTS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;

/**
 * Вход через SMS Aero Mobile ID.
 *
 * Сначала оператор показывает SIM-push. Если абонент его не подтвердил,
 * SMS Aero сам отправляет SMS-код, а мы проверяем его методом `mobile-id/verify`.
 * Код генерирует SMS Aero, локально он не хранится.
 */
@Injectable()
export class MobileIdService {
  private readonly logger = new Logger(MobileIdService.name);
  private readonly config: SmsConfig;

  constructor(
    configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly client: SmsAeroClient,
  ) {
    this.config = configService.get<SmsConfig>('sms')!;
    if (this.config.provider === 'smsaero' && !this.config.mobileId) {
      this.logger.warn(
        `Mobile ID выключен: нужен публичный https callback, сейчас ${callbackHost(this.config.callbackUrl) || 'пусто'}. Код входа уйдёт SMS`,
      );
    }
  }

  isEnabled(): boolean {
    return this.config.mobileId;
  }

  /** Сессия есть, только если mobile-id/send успел создать её. Иначе код лежит в обычном OTP. */
  async hasSession(phone: string): Promise<boolean> {
    const session = await this.read(phone);
    return session !== null && session.status !== 'failed';
  }

  async request(phone: string): Promise<MobileIdRequestResult> {
    await this.assertCanRequest(phone);

    let record;
    try {
      record = await this.client.mobileIdSend(phone, this.config.callbackUrl);
    } catch (error) {
      throw this.providerError(error);
    }

    const status = mapMobileIdStatus(record.status);
    if (status === 'failed') {
      throw new ServiceUnavailableException({
        code: 'SMS_UNAVAILABLE',
        message: 'Не удалось начать подтверждение номера. Попробуйте ещё раз',
      });
    }
    const session: MobileIdSession = {
      id: record.id,
      phone,
      status,
      attempts: 0,
    };

    await this.save(session);
    await this.redis.set(this.cooldownKey(phone), '1', 'EX', RESEND_COOLDOWN_SEC);

    return {
      expiresInSec: SESSION_TTL_SEC,
      resendAfterSec: RESEND_COOLDOWN_SEC,
      method: 'mobile-id',
      status: session.status === 'otp_required' ? 'otp_required' : 'pending',
      devCode: this.config.testMode && process.env.NODE_ENV !== 'production' ? '1234' : undefined,
    };
  }

  /**
   * Подтягивает статус у SMS Aero (и из вебхука, уже записанного в Redis).
   * Сессию не удаляет: токены выдаёт только тот, кто успел её забрать.
   */
  async refresh(phone: string): Promise<MobileIdChallengeStatus> {
    const session = await this.read(phone);
    if (!session) {
      throw new BadRequestException({
        code: 'OTP_EXPIRED',
        message: 'Время подтверждения истекло. Запросите вход ещё раз',
      });
    }
    if (session.status === 'confirmed' || session.status === 'failed') {
      return session.status;
    }

    try {
      const remote = await this.client.mobileIdStatus(session.id);
      const next = preferStatus(session.status, mapMobileIdStatus(remote.status));
      if (next !== session.status) {
        session.status = next;
        await this.save(session, true);
      }
      return session.status;
    } catch (error) {
      if (error instanceof SmsAeroRequestError && error.httpStatus === 404) {
        await this.drop(session);
        throw new BadRequestException({
          code: 'OTP_EXPIRED',
          message: 'Время подтверждения истекло. Запросите вход ещё раз',
        });
      }
      this.logger.warn(`Не удалось обновить Mobile ID для ${maskPhone(phone)}`);
      return session.status;
    }
  }

  /**
   * Проверяет SMS-код у SMS Aero и помечает сессию подтверждённой.
   * HTTP 200 при статусе «нужен код» ещё не финал: короткий опрос статуса
   * ждёт ответ оператора. Ошибочный код SMS Aero отвечает 400.
   */
  async verifyCode(phone: string, code: string): Promise<void> {
    const session = await this.read(phone);
    if (!session || session.status === 'failed') {
      throw new BadRequestException({
        code: 'OTP_EXPIRED',
        message: 'Код не найден или истёк. Запросите новый',
      });
    }
    if (session.attempts >= MAX_VERIFY_ATTEMPTS) {
      await this.drop(session);
      throw this.tooManyRequests('Превышено число попыток. Запросите новый код');
    }

    let record;
    try {
      record = await this.client.mobileIdVerify(session.id, code);
    } catch (error) {
      if (error instanceof SmsAeroRequestError && error.httpStatus === 400) {
        session.attempts += 1;
        await this.save(session, true);
        throw new BadRequestException({ code: 'OTP_INVALID', message: 'Неверный код' });
      }
      throw this.providerError(error);
    }

    let status = preferStatus(session.status, mapMobileIdStatus(record.status));
    const deadline = Date.now() + Math.max(0, this.config.verifyWaitMs);
    while (status !== 'confirmed' && status !== 'failed' && Date.now() < deadline) {
      await sleep(Math.min(400, deadline - Date.now()));
      try {
        const remote = await this.client.mobileIdStatus(session.id);
        status = preferStatus(status, mapMobileIdStatus(remote.status));
      } catch (error) {
        if (error instanceof SmsAeroRequestError && error.httpStatus === 404) {
          await this.drop(session);
          throw new BadRequestException({
            code: 'OTP_EXPIRED',
            message: 'Код не найден или истёк. Запросите новый',
          });
        }
        break;
      }
    }

    if (status === 'failed') {
      session.status = 'failed';
      await this.save(session, true);
      throw new BadRequestException({ code: 'OTP_INVALID', message: 'Неверный код' });
    }

    // 200 от verify и не отказ: код принят, даже если финальный вебхук ещё в пути.
    session.status = 'confirmed';
    await this.save(session, true);
  }

  /**
   * Забирает подтверждённую сессию ровно один раз.
   * Повторный вызов (второй опрос экрана) получает false и токены не выпускает.
   */
  async claimConfirmed(phone: string): Promise<boolean> {
    const key = this.sessionKey(phone);
    const raw = await this.redis.get(key);
    if (!raw) return false;
    let session: MobileIdSession;
    try {
      session = JSON.parse(raw) as MobileIdSession;
    } catch {
      return false;
    }
    if (session.status !== 'confirmed' || session.phone !== phone) return false;

    const removed = await this.redis.eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
      1,
      key,
      raw,
    );
    if (Number(removed) !== 1) return false;
    await this.redis.del(this.idKey(session.id), this.cooldownKey(phone), this.countKey(phone));
    return true;
  }

  async applyCallback(
    token: string,
    body: { id: number; status: number; number: string },
  ): Promise<void> {
    if (!this.sameSecret(token, this.config.callbackSecret)) {
      throw new UnauthorizedException();
    }

    const phone = await this.redis.get(this.idKey(body.id));
    if (!phone) return;

    const session = await this.read(phone);
    if (!session || session.id !== body.id) return;
    if (toMsisdn(body.number) !== toMsisdn(session.phone)) {
      this.logger.warn(`Вебхук Mobile ID ${body.id} пришёл с чужим номером`);
      return;
    }

    const next = preferStatus(session.status, mapMobileIdStatus(body.status));
    if (next === session.status) return;
    session.status = next;
    await this.save(session, true);
  }

  private async assertCanRequest(phone: string): Promise<void> {
    const cooldownTtl = await this.redis.ttl(this.cooldownKey(phone));
    if (cooldownTtl > 0) {
      throw this.tooManyRequests(
        `Повторный запрос кода возможен через ${cooldownTtl} сек`,
        cooldownTtl,
      );
    }

    const count = await this.redis.incr(this.countKey(phone));
    if (count === 1) {
      await this.redis.expire(this.countKey(phone), 3600);
    }
    if (count > MAX_REQUESTS_PER_HOUR) {
      const ttl = await this.redis.ttl(this.countKey(phone));
      throw this.tooManyRequests('Превышен лимит запросов кода. Попробуйте позже', ttl);
    }
  }

  private async save(session: MobileIdSession, keepTtl = false): Promise<void> {
    const key = this.sessionKey(session.phone);
    const payload = JSON.stringify(session);
    const ttl = keepTtl ? await this.redis.ttl(key) : SESSION_TTL_SEC;
    const seconds = ttl > 0 ? ttl : SESSION_TTL_SEC;
    await this.redis.set(key, payload, 'EX', seconds);
    await this.redis.set(this.idKey(session.id), session.phone, 'EX', seconds);
  }

  private async read(phone: string): Promise<MobileIdSession | null> {
    const raw = await this.redis.get(this.sessionKey(phone));
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as MobileIdSession;
      if (session.phone !== phone || !Number.isInteger(session.id)) return null;
      return session;
    } catch {
      return null;
    }
  }

  private async drop(session: MobileIdSession): Promise<void> {
    await this.redis.del(this.sessionKey(session.phone), this.idKey(session.id));
  }

  private providerError(error: unknown): HttpException {
    if (error instanceof HttpException) return error;
    if (error instanceof SmsAeroRequestError) {
      this.logger.warn(`SMS Aero ${error.httpStatus}: ${error.message}`);
      if (error.httpStatus === 404) {
        return new BadRequestException({
          code: 'OTP_EXPIRED',
          message: 'Код не найден или истёк. Запросите новый',
        });
      }
    } else {
      this.logger.warn('SMS Aero не ответил');
    }
    return new ServiceUnavailableException({
      code: 'SMS_UNAVAILABLE',
      message: 'Не удалось выполнить подтверждение. Попробуйте ещё раз',
    });
  }

  private sessionKey(phone: string): string {
    return `mid:phone:${phone}`;
  }

  private idKey(id: number): string {
    return `mid:id:${id}`;
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

  private sameSecret(left: string, right: string): boolean {
    if (!left || !right) return false;
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maskPhone(phone: string): string {
  return phone.length > 4 ? `***${phone.slice(-4)}` : '***';
}

function callbackHost(raw: string): string {
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return '';
  }
}
