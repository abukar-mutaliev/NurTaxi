import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { CarrierStatus, PermitStatus } from '../../common/enums/compliance.enum';
import { Carrier } from './entities/carrier.entity';
import { TaxiPermit, derivePermitStatus } from './entities/taxi-permit.entity';
import { DriverAssignment } from './entities/driver-assignment.entity';
import { Vehicle } from '../drivers/entities/vehicle.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';

export interface CreateCarrierDto {
  name: string;
  legalForm: string;
  inn: string;
  ogrn: string;
  address: string;
  phone?: string | null;
  email?: string | null;
  regionId: string;
  status?: CarrierStatus;
}

export interface CreatePermitDto {
  number: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt?: string | null;
  carrierId: string;
  vehicleId: string;
  status?: PermitStatus;
}

export interface CreateAssignmentDto {
  driverId: string;
  carrierId: string;
  vehicleId?: string | null;
  validFrom?: string;
  basis?: string | null;
}

@Injectable()
export class CarriersService {
  constructor(
    @InjectRepository(Carrier) private readonly carriers: Repository<Carrier>,
    @InjectRepository(TaxiPermit) private readonly permits: Repository<TaxiPermit>,
    @InjectRepository(DriverAssignment) private readonly assignments: Repository<DriverAssignment>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(DriverProfile) private readonly drivers: Repository<DriverProfile>,
  ) {}

  listCarriers(regionId?: string): Promise<Carrier[]> {
    return this.carriers.find({
      where: regionId ? { regionId } : {},
      order: { name: 'ASC' },
    });
  }

  async getCarrier(id: string): Promise<Carrier> {
    const carrier = await this.carriers.findOne({
      where: { id },
      relations: ['permits', 'permits.vehicle', 'assignments'],
    });
    if (!carrier) {
      throw new NotFoundException({ code: 'CARRIER_NOT_FOUND', message: 'Перевозчик не найден' });
    }
    return carrier;
  }

  createCarrier(dto: CreateCarrierDto): Promise<Carrier> {
    return this.carriers.save(
      this.carriers.create({
        ...dto,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        status: dto.status ?? CarrierStatus.Draft,
      }),
    );
  }

  async updateCarrier(id: string, dto: Partial<CreateCarrierDto>): Promise<Carrier> {
    const carrier = await this.getCarrier(id);
    Object.assign(carrier, dto);
    return this.carriers.save(carrier);
  }

  async createPermit(dto: CreatePermitDto): Promise<TaxiPermit> {
    await this.getCarrier(dto.carrierId);
    const vehicle = await this.vehicles.findOne({ where: { id: dto.vehicleId } });
    if (!vehicle) {
      throw new NotFoundException({ code: 'VEHICLE_NOT_FOUND', message: 'ТС не найдено' });
    }
    const status = derivePermitStatus(dto.status ?? PermitStatus.Active, dto.expiresAt ?? null);
    const permit = await this.permits.save(
      this.permits.create({
        number: dto.number,
        issuedBy: dto.issuedBy,
        issuedAt: dto.issuedAt,
        expiresAt: dto.expiresAt ?? null,
        carrierId: dto.carrierId,
        vehicleId: vehicle.id,
        status,
      }),
    );
    vehicle.currentPermitId = permit.id;
    await this.vehicles.save(vehicle);
    return permit;
  }

  listExpiringPermits(regionId?: string, withinDays = 30): Promise<TaxiPermit[]> {
    const until = new Date();
    until.setDate(until.getDate() + withinDays);
    const qb = this.permits
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.carrier', 'c')
      .innerJoinAndSelect('p.vehicle', 'v')
      .where('p.expires_at IS NOT NULL')
      .andWhere('p.expires_at <= :until', { until: until.toISOString().slice(0, 10) })
      .andWhere('p.status IN (:...st)', { st: [PermitStatus.Active, PermitStatus.Expiring] })
      .orderBy('p.expires_at', 'ASC');
    if (regionId) qb.andWhere('c.region_id = :regionId', { regionId });
    return qb.getMany();
  }

  async refreshPermitStatuses(): Promise<number> {
    const permits = await this.permits.find({
      where: [{ status: PermitStatus.Active }, { status: PermitStatus.Expiring }],
    });
    let changed = 0;
    for (const permit of permits) {
      const next = derivePermitStatus(permit.status, permit.expiresAt);
      if (next !== permit.status) {
        permit.status = next;
        await this.permits.save(permit);
        changed += 1;
      }
    }
    return changed;
  }

  async assignDriver(dto: CreateAssignmentDto): Promise<DriverAssignment> {
    const carrier = await this.getCarrier(dto.carrierId);
    const driver = await this.drivers.findOne({ where: { id: dto.driverId } });
    if (!driver) {
      throw new NotFoundException({ code: 'DRIVER_NOT_FOUND', message: 'Водитель не найден' });
    }
    if (driver.regionId !== carrier.regionId) {
      throw new BadRequestException({
        code: 'REGION_MISMATCH',
        message: 'Водитель и перевозчик должны быть в одном регионе',
      });
    }

    const now = dto.validFrom ? new Date(dto.validFrom) : new Date();
    const open = await this.assignments.find({
      where: { driverId: driver.id, validTo: IsNull() },
    });
    for (const row of open) {
      row.validTo = now;
      await this.assignments.save(row);
    }

    return this.assignments.save(
      this.assignments.create({
        driverId: driver.id,
        carrierId: carrier.id,
        vehicleId: dto.vehicleId ?? null,
        validFrom: now,
        basis: dto.basis ?? null,
      }),
    );
  }

  async assignmentAt(driverId: string, at: Date): Promise<DriverAssignment | null> {
    const row = await this.assignments.findOne({
      where: { driverId, validFrom: LessThanOrEqual(at) },
      relations: ['carrier', 'vehicle'],
      order: { validFrom: 'DESC' },
    });
    if (!row) return null;
    if (row.validTo && row.validTo <= at) return null;
    return row;
  }
}
