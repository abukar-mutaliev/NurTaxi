import { createHash } from 'node:crypto';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { OtpService } from './otp.service';

describe('OtpService', () => {
  const redis = {
    ttl: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    hset: jest.fn(),
    set: jest.fn(),
    hgetall: jest.fn(),
    hincrby: jest.fn(),
    del: jest.fn(),
  };

  const sms = { sendCode: jest.fn().mockResolvedValue(undefined) };

  let service: OtpService;

  beforeEach(() => {
    jest.clearAllMocks();
    redis.incr.mockResolvedValue(1);
    redis.ttl.mockResolvedValue(-1);
    service = new OtpService(redis as never, sms as never);
  });

  it('возвращает devCode вне production', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    redis.hset.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);
    redis.set.mockResolvedValue('OK');

    const result = await service.request('+79280000099');
    expect(result.devCode).toMatch(/^\d{4}$/);
    expect(sms.sendCode).toHaveBeenCalledWith('+79280000099', result.devCode);

    process.env.NODE_ENV = prev;
  });

  it('отклоняет неверный код', async () => {
    const phone = '+79280000001';
    const code = '1234';
    const pepper = process.env.JWT_ACCESS_SECRET ?? 'pepper';
    const hash = createHash('sha256').update(`${phone}:${code}:${pepper}`).digest('hex');

    redis.hgetall.mockResolvedValue({ hash, attempts: '0' });

    await expect(service.verify(phone, '9999')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('блокирует при превышении cooldown', async () => {
    redis.ttl.mockResolvedValue(30);

    await expect(service.request('+79280000001')).rejects.toBeInstanceOf(HttpException);
    try {
      await service.request('+79280000001');
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });
});
