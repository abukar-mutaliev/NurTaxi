import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import type { AssignmentSnapshot } from '../../common/compliance/assignment-snapshot';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { DriverAssignment } from './entities/driver-assignment.entity';
import { TaxiPermit } from './entities/taxi-permit.entity';
import { PermitStatus } from '../../common/enums/compliance.enum';

@Injectable()
export class AssignmentSnapshotService {
  constructor(
    @InjectRepository(DriverAssignment)
    private readonly assignments: Repository<DriverAssignment>,
    @InjectRepository(TaxiPermit)
    private readonly permits: Repository<TaxiPermit>,
  ) {}

  async capture(driver: DriverProfile, clientPhone: string | null): Promise<AssignmentSnapshot> {
    const at = new Date();
    const assignment = await this.assignments.findOne({
      where: {
        driverId: driver.id,
        validFrom: LessThanOrEqual(at),
        validTo: IsNull(),
      },
      relations: ['carrier', 'vehicle'],
      order: { validFrom: 'DESC' },
    });

    const activeOpenEnded = assignment;
    const fallback = activeOpenEnded
      ? null
      : await this.assignments.findOne({
          where: {
            driverId: driver.id,
            validFrom: LessThanOrEqual(at),
            validTo: MoreThan(at),
          },
          relations: ['carrier', 'vehicle'],
          order: { validFrom: 'DESC' },
        });

    const current = assignment ?? fallback;
    const vehicle =
      current?.vehicle ?? driver.vehicles?.find((v) => v.isPrimary) ?? driver.vehicles?.[0] ?? null;

    let permit: TaxiPermit | null = null;
    if (vehicle) {
      permit = await this.permits.findOne({
        where: { vehicleId: vehicle.id, status: PermitStatus.Active },
        order: { issuedAt: 'DESC' },
      });
      if (!permit && vehicle.currentPermitId) {
        permit = await this.permits.findOne({ where: { id: vehicle.currentPermitId } });
      }
    }

    return {
      capturedAt: at.toISOString(),
      driver: {
        id: driver.id,
        fullName: driver.fullName,
        phone: driver.user?.phone ?? null,
      },
      vehicle: vehicle
        ? {
            id: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            plateNumber: vehicle.plateNumber,
            color: vehicle.color,
            year: vehicle.year,
            vin: vehicle.vin ?? null,
          }
        : null,
      carrier: current?.carrier
        ? {
            id: current.carrier.id,
            name: current.carrier.name,
            inn: current.carrier.inn,
            ogrn: current.carrier.ogrn,
            legalForm: current.carrier.legalForm,
            address: current.carrier.address,
          }
        : null,
      permit: permit
        ? {
            id: permit.id,
            number: permit.number,
            issuedBy: permit.issuedBy,
            issuedAt: permit.issuedAt,
            expiresAt: permit.expiresAt,
          }
        : null,
      contacts: {
        driverPhone: driver.user?.phone ?? null,
        clientPhone,
      },
    };
  }
}
