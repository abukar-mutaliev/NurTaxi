import { ServiceUnavailableException } from '@nestjs/common';
import { SmsAeroSmsProvider } from './smsaero-sms.provider';
import { SmsAeroRequestError } from './smsaero.client';

describe('SmsAeroSmsProvider', () => {
  const client = {
    configuredSign: 'SMS Aero',
    listSigns: jest.fn(),
    sendSms: jest.fn(),
  };

  let provider: SmsAeroSmsProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new SmsAeroSmsProvider(client as never);
  });

  it('отправляет код с активным именем из кабинета', async () => {
    client.listSigns.mockResolvedValue([
      { name: 'SMS Aero', status: 2, extendStatus: 'reject' },
      { name: 'Nur Taxi', status: 1, extendStatus: 'active' },
    ]);
    client.sendSms.mockResolvedValue(undefined);

    await provider.sendCode('+79280000001', '1234');

    expect(client.sendSms).toHaveBeenCalledWith(
      '+79280000001',
      'Nur Taxi: код подтверждения 1234',
      'Nur Taxi',
    );
  });

  it('после отказа имени повторяет отправку с другим активным', async () => {
    client.listSigns
      .mockResolvedValueOnce([{ name: 'SMS Aero', status: 1, extendStatus: 'active' }])
      .mockResolvedValueOnce([
        { name: 'SMS Aero', status: 2, extendStatus: 'reject' },
        { name: 'Nur Taxi', status: 1, extendStatus: 'active' },
      ]);
    client.sendSms
      .mockRejectedValueOnce(new SmsAeroRequestError('Validation error. (sign: incorrect)', 400))
      .mockResolvedValueOnce(undefined);

    await provider.sendCode('+79280000001', '1234');

    expect(client.sendSms).toHaveBeenLastCalledWith(
      '+79280000001',
      'Nur Taxi: код подтверждения 1234',
      'Nur Taxi',
    );
  });

  it('превращает отказ имени в 503, а не во внутреннюю ошибку', async () => {
    client.listSigns.mockResolvedValue([]);
    client.sendSms.mockRejectedValue(new SmsAeroRequestError('Validation error. (sign: incorrect)', 400));

    await expect(provider.sendCode('+79280000001', '1234')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
