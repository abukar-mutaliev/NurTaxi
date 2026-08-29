import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PermitStatus } from '../../../common/enums/compliance.enum';
import { encryptedTransformer } from '../../../common/crypto/field-encryption';
import { Carrier } from './carrier.entity';
import { Vehicle } from '../../drivers/entities/vehicle.entity';

/**
 * Разрешение на перевозку пассажиров легковым такси, выданное на конкретное ТС (FZ-04.2).
 */
@Entity('taxi_permits')
@Index('idx_taxi_permits_expires_at', ['expiresAt'])
@Index('uq_taxi_permits_number_issuer', ['number', 'issuedBy'], { unique: true })
export class TaxiPermit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 512, transformer: encryptedTransformer })
  number!: string;

  @Column({ name: 'issued_by', type: 'varchar', length: 512, transformer: encryptedTransformer })
  issuedBy!: string;

  @Column({ name: 'issued_at', type: 'date' })
  issuedAt!: string;

  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt!: string | null;

  @Column({ name: 'carrier_id', type: 'uuid' })
  carrierId!: string;

  @ManyToOne(() => Carrier, (carrier) => carrier.permits, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'carrier_id' })
  carrier!: Carrier;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId!: string;

  @ManyToOne(() => Vehicle, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;

  @Column({ type: 'varchar', length: 32, default: PermitStatus.Draft })
  status!: PermitStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

export function derivePermitStatus(
  status: PermitStatus,
  expiresAt: string | null,
  now = new Date(),
): PermitStatus {
  if (status === PermitStatus.Revoked || status === PermitStatus.Draft) {
    return status;
  }
  if (!expiresAt) return PermitStatus.Active;
  const today = now.toISOString().slice(0, 10);
  if (expiresAt < today) return PermitStatus.Expired;
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (expiresAt <= in30) return PermitStatus.Expiring;
  return PermitStatus.Active;
}
