import {
  SmsAeroClient,
  SmsAeroRequestError,
  parseSmsAeroSigns,
  pickActiveSign,
  toMsisdn,
} from './smsaero.client';

const config = {
  email: 'ops@nurtaxi.ru',
  apiKey: 'secret-key',
  sign: 'NurTaxi',
  baseUrl: 'https://gate.smsaero.ru/v2',
  timeoutMs: 1000,
};

describe('SmsAeroClient', () => {
  it('отправляет SMS с Basic-авторизацией и номером без плюса', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: [{ id: 1 }], message: null }),
    });
    const client = new SmsAeroClient(config, fetchImpl as unknown as typeof fetch);

    await client.sendSms('+79280000001', 'Nur Taxi: код подтверждения 1234');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://gate.smsaero.ru/v2/sms/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: `Basic ${Buffer.from('ops@nurtaxi.ru:secret-key').toString('base64')}`,
        }),
        body: JSON.stringify({
          number: '79280000001',
          sign: 'NurTaxi',
          text: 'Nur Taxi: код подтверждения 1234',
        }),
      }),
    );
  });

  it('начинает Mobile ID и читает id запроса', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          data: { id: 17, status: 0, number: '79280000001' },
          message: null,
        }),
    });
    const client = new SmsAeroClient(config, fetchImpl as unknown as typeof fetch);

    await expect(
      client.mobileIdSend('+79280000001', 'https://taxi.example/callback?token=abc'),
    ).resolves.toEqual({ id: 17, status: 0, number: '79280000001' });
  });

  it('переводит отказ SMS Aero в ошибку без утечки ключа', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ success: false, data: null, message: 'invalid otp code' }),
    });
    const client = new SmsAeroClient(config, fetchImpl as unknown as typeof fetch);

    await expect(client.mobileIdVerify(16, '0000')).rejects.toMatchObject({
      message: 'invalid otp code',
      httpStatus: 400,
    } satisfies Partial<SmsAeroRequestError>);
  });

  it('добавляет в ошибку поле, которое отклонил SMS Aero', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          success: false,
          data: { callbackUrl: 'incorrect', sign: ['required'] },
          message: 'Validation error.',
        }),
    });
    const client = new SmsAeroClient(config, fetchImpl as unknown as typeof fetch);

    await expect(client.mobileIdSend('+79280000001', 'http://localhost/cb')).rejects.toThrow(
      'Validation error. (callbackUrl: incorrect; sign: required)',
    );
  });
});

describe('parseSmsAeroSigns', () => {
  it('читает объект с числовыми ключами и пропускает totalCount', () => {
    expect(
      parseSmsAeroSigns({
        totalCount: '2',
        0: { id: 1, name: 'GOOD SIGN', status: 1, extendStatus: 'active' },
        1: { id: 2, name: 'BAD SIGN', status: 2, extendStatus: 'reject' },
      }),
    ).toEqual([
      { name: 'GOOD SIGN', status: 1, extendStatus: 'active' },
      { name: 'BAD SIGN', status: 2, extendStatus: 'reject' },
    ]);
  });
});

describe('pickActiveSign', () => {
  const signs = [
    { name: 'SMS Aero', status: 2, extendStatus: 'reject' },
    { name: 'Nur Taxi', status: 1, extendStatus: 'active' },
  ];

  it('берёт настроенное имя, если оно активно', () => {
    expect(pickActiveSign(signs, 'nur taxi')).toBe('Nur Taxi');
  });

  it('берёт первое активное, если настроенное отклонено', () => {
    expect(pickActiveSign(signs, 'SMS Aero')).toBe('Nur Taxi');
  });

  it('возвращает null, когда активных имён нет', () => {
    expect(pickActiveSign([{ name: 'SMS Aero', status: 2, extendStatus: 'reject' }], 'SMS Aero')).toBeNull();
  });
});

describe('toMsisdn', () => {
  it('убирает плюс и заменяет ведущую 8', () => {
    expect(toMsisdn('+7 (928) 000-00-01')).toBe('79280000001');
    expect(toMsisdn('89280000001')).toBe('79280000001');
  });
});
