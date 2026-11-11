import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { MobileIdService } from './mobile-id.service';
import { SmsAeroRequestError } from '../sms/smsaero.client';

describe('MobileIdService', () => {
  const redis = {
    ttl: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    eval: jest.fn(),
  };

  const client = {
    mobileIdSend: jest.fn(),
    mobileIdVerify: jest.fn(),
    mobileIdStatus: jest.fn(),
  };

  const config = {
    mobileId: true,
    callbackUrl: 'https://taxi.example/api/v1/auth/mobile-id/callback?token=sekret',
    callbackSecret: 'sekret',
    testMode: false,
    verifyWaitMs: 0,
  };

  let service: MobileIdService;

  beforeEach(() => {
    jest.clearAllMocks();
    redis.ttl.mockResolvedValue(-1);
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);
    redis.set.mockResolvedValue('OK');
    redis.get.mockResolvedValue(null);
    redis.del.mockResolvedValue(1);
    redis.eval.mockResolvedValue(1);
    service = new MobileIdService({ get: () => config } as never, redis as never, client as never);
  });

  it('запрашивает SIM-push и не возвращает код', async () => {
    client.mobileIdSend.mockResolvedValue({ id: 17, status: 0, number: '79280000001' });

    const result = await service.request('+79280000001');

    expect(result).toMatchObject({ method: 'mobile-id', status: 'pending', devCode: undefined });
    expect(client.mobileIdSend).toHaveBeenCalledWith('+79280000001', config.callbackUrl);
    expect(JSON.parse(redis.set.mock.calls[0][1])).toMatchObject({ id: 17, status: 'pending' });
  });

  it('показывает ввод кода, когда SIM-push не прошёл', async () => {
    client.mobileIdSend.mockResolvedValue({ id: 18, status: 3 });

    await expect(service.request('+79280000001')).resolves.toMatchObject({
      status: 'otp_required',
    });
  });

  it('отклоняет неверный SMS-код и считает попытку', async () => {
    redis.get.mockResolvedValue(
      JSON.stringify({ id: 18, phone: '+79280000001', status: 'otp_required', attempts: 0 }),
    );
    client.mobileIdVerify.mockRejectedValue(new SmsAeroRequestError('invalid otp code', 400));

    await expect(service.verifyCode('+79280000001', '0000')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(lastSession(redis.set.mock.calls).attempts).toBe(1);
  });

  it('принимает код, который SMS Aero подтвердил ответом 200', async () => {
    redis.get.mockResolvedValue(
      JSON.stringify({ id: 18, phone: '+79280000001', status: 'otp_required', attempts: 0 }),
    );
    client.mobileIdVerify.mockResolvedValue({ id: 18, status: 3 });

    await service.verifyCode('+79280000001', '1234');

    expect(lastSession(redis.set.mock.calls).status).toBe('confirmed');
  });

  it('игнорирует вебхук с чужим секретом', async () => {
    await expect(
      service.applyCallback('wrong', { id: 17, status: 1, number: '79280000001' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('записывает успешный SIM-push из вебхука', async () => {
    redis.get
      .mockResolvedValueOnce('+79280000001')
      .mockResolvedValueOnce(
        JSON.stringify({ id: 17, phone: '+79280000001', status: 'pending', attempts: 0 }),
      );

    await service.applyCallback('sekret', { id: 17, status: 1, number: '79280000001' });

    expect(lastSession(redis.set.mock.calls).status).toBe('confirmed');
  });

  it('не считает сессией номер, для которого Mobile ID не стартовал', async () => {
    redis.get.mockResolvedValue(null);
    await expect(service.hasSession('+79280000001')).resolves.toBe(false);
  });

  it('видит живую сессию Mobile ID', async () => {
    redis.get.mockResolvedValue(
      JSON.stringify({ id: 17, phone: '+79280000001', status: 'pending', attempts: 0 }),
    );
    await expect(service.hasSession('+79280000001')).resolves.toBe(true);
  });
});

function lastSession(calls: unknown[][]): { status: string; attempts: number } {
  const payloads = calls
    .map((call) => call[1])
    .filter((value): value is string => typeof value === 'string' && value.startsWith('{'));
  return JSON.parse(payloads.at(-1) ?? '{}') as { status: string; attempts: number };
}
