import type { SmsConfig } from '../../../config/configuration';

export class SmsAeroRequestError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = 'SmsAeroRequestError';
  }
}

export interface SmsAeroSign {
  name: string;
  status: number;
  extendStatus: string;
}

export interface MobileIdRecord {
  id: number;
  status: number;
  number?: string;
}

interface SmsAeroEnvelope {
  success?: boolean;
  data?: unknown;
  message?: string | null;
}

/**
 * HTTP-клиент SMS Aero API v2.
 * Вход — Mobile ID (`mobile-id/*`), прочие сообщения — `sms/send`.
 */
export class SmsAeroClient {
  constructor(
    private readonly config: Pick<SmsConfig, 'email' | 'apiKey' | 'sign' | 'baseUrl' | 'timeoutMs'>,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  get configuredSign(): string {
    return this.config.sign;
  }

  async sendSms(phone: string, text: string, sign = this.config.sign): Promise<void> {
    await this.post('sms/send', {
      number: toMsisdn(phone),
      sign,
      text,
    });
  }

  async listSigns(): Promise<SmsAeroSign[]> {
    return parseSmsAeroSigns(await this.post('sign/list', {}));
  }

  async mobileIdSend(phone: string, callbackUrl: string): Promise<MobileIdRecord> {
    const data = await this.post('mobile-id/send', {
      number: toMsisdn(phone),
      sign: this.config.sign,
      callbackUrl,
    });
    return asMobileIdRecord(data);
  }

  async mobileIdVerify(id: number, code: string): Promise<MobileIdRecord> {
    const data = await this.post('mobile-id/verify', {
      id,
      sign: this.config.sign,
      code,
    });
    return asMobileIdRecord(data);
  }

  async mobileIdStatus(id: number): Promise<MobileIdRecord> {
    const data = await this.post('mobile-id/status', { id });
    return asMobileIdRecord(data);
  }

  private async post(path: string, payload: Record<string, unknown>): Promise<unknown> {
    const url = `${this.config.baseUrl}/${path}`;
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Basic ${Buffer.from(`${this.config.email}:${this.config.apiKey}`).toString('base64')}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch {
      throw new SmsAeroRequestError('SMS Aero недоступен', 503);
    }

    const raw = await response.text();
    let parsed: SmsAeroEnvelope = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw) as SmsAeroEnvelope;
      } catch {
        throw new SmsAeroRequestError('SMS Aero вернул некорректный ответ', response.status || 502);
      }
    }

    if (!response.ok || parsed.success === false) {
      const message =
        typeof parsed.message === 'string' && parsed.message.trim()
          ? parsed.message.trim()
          : `SMS Aero HTTP ${response.status}`;
      const details = formatSmsAeroDetails(parsed.data);
      throw new SmsAeroRequestError(
        details ? `${message} (${details})` : message,
        response.status || 502,
      );
    }

    return parsed.data;
  }
}

/** Поля вроде `callbackUrl: incorrect` — без номера и без секретов. */
export function formatSmsAeroDetails(data: unknown): string {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return '';
  return Object.entries(data as Record<string, unknown>)
    .map(([key, value]) => {
      const text = Array.isArray(value) ? value.map(String).join(',') : String(value ?? '');
      return `${key}: ${text.replace(/\d{7,}/g, '***').slice(0, 180)}`;
    })
    .join('; ');
}

/** Ответ sign/list — объект с числовыми ключами, не массив. */
export function parseSmsAeroSigns(data: unknown): SmsAeroSign[] {
  if (!data || typeof data !== 'object') return [];
  const rows = Array.isArray(data) ? data : Object.values(data as Record<string, unknown>);
  const signs: SmsAeroSign[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object' || !('name' in row)) continue;
    const name = String((row as { name?: unknown }).name ?? '').trim();
    if (!name) continue;
    signs.push({
      name,
      status: Number((row as { status?: unknown }).status ?? -1),
      extendStatus: String((row as { extendStatus?: unknown }).extendStatus ?? ''),
    });
  }
  return signs;
}

/** Активное имя: сначала совпадение с настройкой, иначе первое активное. */
export function pickActiveSign(signs: SmsAeroSign[], preferred: string): string | null {
  const active = signs.filter((sign) => sign.status === 1 || sign.extendStatus === 'active');
  const wanted = preferred.trim().toLowerCase();
  const match = active.find((sign) => sign.name.trim().toLowerCase() === wanted);
  return match?.name ?? active[0]?.name ?? null;
}

/** SMS Aero ждёт MSISDN без «+»: 79990000000. */
export function toMsisdn(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) {
    return `7${digits.slice(1)}`;
  }
  return digits;
}

function asMobileIdRecord(data: unknown): MobileIdRecord {
  const row = (Array.isArray(data) ? data[0] : data) as
    { id?: unknown; status?: unknown; number?: unknown } | undefined;
  const id = Number(row?.id);
  if (!row || !Number.isInteger(id)) {
    throw new SmsAeroRequestError('SMS Aero вернул пустой ответ', 502);
  }
  return {
    id,
    status: Number(row.status ?? 0),
    number: typeof row.number === 'string' ? row.number : undefined,
  };
}
