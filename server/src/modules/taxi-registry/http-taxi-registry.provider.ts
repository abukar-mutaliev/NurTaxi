import { Injectable } from '@nestjs/common';
import { RegistryVerdict } from '../../common/enums/compliance.enum';
import type {
  RegistryCheckRequest,
  RegistryCheckResult,
  TaxiRegistryProvider,
} from './taxi-registry.interface';

/**
 * HTTP-адаптер государственного реестра такси (C7.10).
 * URL и ключ задаются после закрытия B.3; без TAXI_REGISTRY_URL модуль использует заглушку.
 */
@Injectable()
export class HttpTaxiRegistryProvider implements TaxiRegistryProvider {
  async check(request: RegistryCheckRequest): Promise<RegistryCheckResult> {
    const url = process.env.TAXI_REGISTRY_URL;
    if (!url) {
      throw new Error('TAXI_REGISTRY_URL не задан');
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.TAXI_REGISTRY_TOKEN
          ? { authorization: `Bearer ${process.env.TAXI_REGISTRY_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      throw new Error(`taxi-registry HTTP ${response.status}`);
    }
    const body = (await response.json()) as {
      verdict?: RegistryVerdict;
      validUntil?: string;
      [k: string]: unknown;
    };
    return {
      verdict: body.verdict ?? RegistryVerdict.Unavailable,
      source: 'http',
      request,
      response: body,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
    };
  }
}
