import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentType } from '../../../common/enums/document-type.enum';
import { RegistrySubjectType } from '../../../common/enums/compliance.enum';
import type { DriverDocument } from '../entities/driver-document.entity';
import type {
  DocumentAutoVerifier,
  DocumentVerificationResult,
} from './document-auto-verifier.interface';
import { TaxiRegistryService } from '../../taxi-registry/taxi-registry.service';
import { DriverProfile } from '../entities/driver-profile.entity';
import { DriverTaxiPermit } from '../entities/driver-taxi-permit.entity';

/**
 * Автопроверка разрешения через реестр не заменяет ручную модерацию скана (FZ-06.8).
 */
@Injectable()
export class RegistryDocumentAutoVerifier implements DocumentAutoVerifier {
  constructor(
    @Optional() private readonly registry?: TaxiRegistryService,
    @Optional()
    @InjectRepository(DriverProfile)
    private readonly drivers?: Repository<DriverProfile>,
    @Optional()
    @InjectRepository(DriverTaxiPermit)
    private readonly permits?: Repository<DriverTaxiPermit>,
  ) {}

  async verify(document: DriverDocument): Promise<DocumentVerificationResult | null> {
    if (document.type !== DocumentType.TaxiPermit || !this.registry || !this.drivers) {
      return null;
    }
    const driver = await this.drivers.findOne({ where: { id: document.driverId } });
    if (!driver) return null;
    const permit = await this.permits?.findOne({ where: { driverId: driver.id } });
    const check = await this.registry.checkAndStore({
      subjectType: RegistrySubjectType.Permit,
      subjectId: permit?.id ?? document.id,
      regionId: driver.regionId,
      permitNumber: permit?.number,
    });
    return {
      approved: false,
      confidence: check.verdict === 'valid' ? 0.8 : 0.2,
      notes: `registry:${check.verdict}`,
    };
  }
}
