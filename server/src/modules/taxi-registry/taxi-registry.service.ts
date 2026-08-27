import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { resilientCall } from '../../common/resilience/resilient-call';
import { CircuitBreakerService } from '../../common/resilience/circuit-breaker.service';
import {
  PermitStatus,
  RegistrySubjectType,
  RegistryVerdict,
} from '../../common/enums/compliance.enum';
import { resolveComplianceConfig } from '../../common/compliance/compliance-config';
import { RegionsService } from '../regions/regions.service';
import { TaxiRegistryCheck } from './entities/taxi-registry-check.entity';
import {
  TAXI_REGISTRY_PROVIDER,
  type RegistryCheckRequest,
  type TaxiRegistryProvider,
} from './taxi-registry.interface';
import { TaxiPermit } from '../carriers/entities/taxi-permit.entity';
import { DriverOnlineStatus } from '../../common/enums/driver-online-status.enum';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { DriverAssignment } from '../carriers/entities/driver-assignment.entity';

@Injectable()
export class TaxiRegistryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TaxiRegistryService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @Inject(TAXI_REGISTRY_PROVIDER) private readonly provider: TaxiRegistryProvider,
    @InjectRepository(TaxiRegistryCheck) private readonly checks: Repository<TaxiRegistryCheck>,
    @InjectRepository(TaxiPermit) private readonly permits: Repository<TaxiPermit>,
    @InjectRepository(DriverProfile) private readonly drivers: Repository<DriverProfile>,
    @InjectRepository(DriverAssignment) private readonly assignments: Repository<DriverAssignment>,
    private readonly regions: RegionsService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') return;
    const intervalMs = Number.parseInt(
      process.env.TAXI_REGISTRY_RECHECK_MS ?? String(6 * 60 * 60 * 1000),
      10,
    );
    this.timer = setInterval(() => {
      void this.recheckActive().catch((err) =>
        this.logger.warn(`registry recheck failed: ${err instanceof Error ? err.message : err}`),
      );
    }, intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async checkAndStore(request: RegistryCheckRequest): Promise<TaxiRegistryCheck> {
    const region = await this.regions.getRegionOrThrow(request.regionId);
    const compliance = resolveComplianceConfig(region.complianceConfig);

    let result;
    try {
      result = await resilientCall(() => this.provider.check(request), {
        timeoutMs: 4000,
        retries: 1,
        circuitKey: `taxi-registry:${request.regionId}`,
        circuitBreaker: this.circuitBreaker,
      });
    } catch (error) {
      result = {
        verdict: compliance.taxiRegistryStrict
          ? RegistryVerdict.Unavailable
          : RegistryVerdict.Unconfirmed,
        source: 'stub',
        request,
        response: { error: error instanceof Error ? error.message : String(error) },
        validUntil: null,
      };
    }

    return this.checks.save(
      this.checks.create({
        subjectType: request.subjectType,
        subjectId: request.subjectId,
        regionId: request.regionId,
        source: result.source,
        request: request as unknown as Record<string, unknown>,
        response: result.response,
        verdict: result.verdict,
        checkedAt: new Date(),
        validUntil: result.validUntil,
      }),
    );
  }

  latest(subjectType: RegistrySubjectType, subjectId: string): Promise<TaxiRegistryCheck | null> {
    return this.checks.findOne({
      where: { subjectType, subjectId },
      order: { checkedAt: 'DESC' },
    });
  }

  history(subjectType: RegistrySubjectType, subjectId: string): Promise<TaxiRegistryCheck[]> {
    return this.checks.find({
      where: { subjectType, subjectId },
      order: { checkedAt: 'DESC' },
      take: 50,
    });
  }

  async isDriverAllowedOnLine(
    driverId: string,
    regionId: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const region = await this.regions.getRegionOrThrow(regionId);
    const compliance = resolveComplianceConfig(region.complianceConfig);
    if (!compliance.taxiRegistryRequired) {
      return { allowed: true };
    }

    const assignment = await this.assignments.findOne({
      where: { driverId, validTo: IsNull() },
      relations: ['carrier', 'vehicle'],
    });
    if (!assignment) {
      return { allowed: false, reason: 'Нет действующей связи с перевозчиком' };
    }

    const permit = assignment.vehicleId
      ? await this.permits.findOne({
          where: { vehicleId: assignment.vehicleId, status: PermitStatus.Active },
        })
      : null;
    if (!permit) {
      return { allowed: false, reason: 'Нет действующего разрешения на ТС' };
    }

    const check = await this.latest(RegistrySubjectType.Permit, permit.id);
    if (!check) {
      return { allowed: false, reason: 'Разрешение не подтверждено в реестре' };
    }
    if (check.verdict === RegistryVerdict.Valid) {
      return { allowed: true };
    }
    if (check.verdict === RegistryVerdict.Unconfirmed && !compliance.taxiRegistryStrict) {
      return { allowed: true, reason: 'Проверка не подтверждена (мягкий режим)' };
    }
    return { allowed: false, reason: `Проверка реестра: ${check.verdict}` };
  }

  async recheckActive(): Promise<number> {
    const permits = await this.permits.find({
      where: { status: PermitStatus.Active },
      relations: ['carrier', 'vehicle'],
    });
    let count = 0;
    for (const permit of permits) {
      const check = await this.checkAndStore({
        subjectType: RegistrySubjectType.Permit,
        subjectId: permit.id,
        regionId: permit.carrier.regionId,
        permitNumber: permit.number,
        plateNumber: permit.vehicle?.plateNumber,
        vin: permit.vehicle?.vin ?? undefined,
        inn: permit.carrier.inn,
      });
      if (check.verdict === RegistryVerdict.Invalid) {
        permit.status = PermitStatus.Revoked;
        await this.permits.save(permit);
        await this.takeDriversOffline(permit.carrierId);
      }
      count += 1;
    }
    return count;
  }

  private async takeDriversOffline(carrierId: string): Promise<void> {
    const links = await this.assignments.find({ where: { carrierId, validTo: IsNull() } });
    for (const link of links) {
      await this.drivers.update(link.driverId, { onlineStatus: DriverOnlineStatus.Offline });
    }
  }
}
