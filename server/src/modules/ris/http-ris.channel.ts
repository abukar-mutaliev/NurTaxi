import { Injectable } from '@nestjs/common';
import type { RisChannel, RisTripPayload } from './ris-channel.interface';

/**
 * HTTP-адаптер региональной ИС (C8.9). Подключается при RIS_ENDPOINT.
 * Контракт полей уточняется после закрытия B.1.
 */
@Injectable()
export class HttpRisChannel implements RisChannel {
  async sendTrip(payload: RisTripPayload): Promise<{ accepted: boolean; response: Record<string, unknown> }> {
    const url = process.env.RIS_ENDPOINT;
    if (!url) {
      throw new Error('RIS_ENDPOINT не задан');
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.RIS_TOKEN ? { authorization: `Bearer ${process.env.RIS_TOKEN}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(`RIS HTTP ${response.status}`);
    }
    return { accepted: true, response: body };
  }
}
