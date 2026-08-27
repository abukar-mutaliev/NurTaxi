import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Carrier } from './carrier.entity';
import { DriverProfile } from '../../drivers/entities/driver-profile.entity';
import { Vehicle } from '../../drivers/entities/vehicle.entity';

/**
 * Историческая связь водителя, ТС и перевозчика с периодом действия (FZ-04.3).
 * Состояние на любую дату восстанавливается фильтром valid_from/valid_to.
 */
@Entity('driver_assignments')
@Index('idx_driver_assignments_driver_period', ['driverId', 'validFrom', 'validTo'])
@Index('idx_driver_assignments_carrier', ['carrierId', 'validFrom'])
export class DriverAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @ManyToOne(() => DriverProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'driver_id' })
  driver!: DriverProfile;

  @Column({ name: 'carrier_id', type: 'uuid' })
  carrierId!: string;

  @ManyToOne(() => Carrier, (carrier) => carrier.assignments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'carrier_id' })
  carrier!: Carrier;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId!: string | null;

  @ManyToOne(() => Vehicle, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle | null;

  @Column({ name: 'valid_from', type: 'timestamptz' })
  validFrom!: Date;

  /** `null` — связь действует. */
  @Column({ name: 'valid_to', type: 'timestamptz', nullable: true })
  validTo!: Date | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  basis!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

export function isAssignmentActive(assignment: DriverAssignment, at = new Date()): boolean {
  if (assignment.validFrom > at) return false;
  return assignment.validTo === null || assignment.validTo > at;
}
