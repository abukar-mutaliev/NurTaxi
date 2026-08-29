import { Injectable } from '@nestjs/common';
import { RegistryVerdict } from '../../common/enums/compliance.enum';
import type {
  RegistryCheckRequest,
  RegistryCheckResult,
  TaxiRegistryProvider,
} from './taxi-registry.interface';

/**
 * Заглушка поставщика сведений реестра для dev/test (FZ-06.7).
 * Контракт совпадает с боевым адаптером: вердикт, источник, срок действия.
 */
@Injectable()
export class StubTaxiRegistryProvider implements TaxiRegistryProvider {
  async check(request: RegistryCheckRequest): Promise<RegistryCheckResult> {
    const invalidMarker =
      request.permitNumber?.toUpperCase().includes('INVALID') || request.inn === '0000000000';
    return {
      verdict: invalidMarker ? RegistryVerdict.Invalid : RegistryVerdict.Valid,
      source: 'stub',
      request,
      response: {
        stub: true,
        reason: invalidMarker ? 'marked_invalid' : 'accepted',
      },
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }
}
