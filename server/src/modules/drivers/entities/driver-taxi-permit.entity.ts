import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { encryptedTransformer } from '../../../common/crypto/field-encryption';
import { DriverProfile } from './driver-profile.entity';

/**
 * Разрешение на деятельность такси (Req §8.2).
 *
 * Реквизиты хранятся отдельно от скана: сам скан проходит обычную модерацию как
 * `driver_documents` с типом `taxi_permit`. Требуется не во всех регионах —
 * режим задаётся в `regions.driver_requirements`.
 */
@Entity('driver_taxi_permits')
export class DriverTaxiPermit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('uq_driver_taxi_permits_driver_id', { unique: true })
  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @OneToOne(() => DriverProfile, (driver) => driver.taxiPermit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver!: DriverProfile;

  @Column({ type: 'varchar', length: 512, transformer: encryptedTransformer })
  number!: string;

  /** Регион выдачи разрешения: текст, а не FK — разрешение может быть выдано вне регионов работы. */
  @Column({ name: 'issuing_region', type: 'varchar', length: 512, transformer: encryptedTransformer })
  issuingRegion!: string;

  @Column({ name: 'issued_at', type: 'date' })
  issuedAt!: string;

  /** Срок действия; `null` — бессрочное разрешение. */
  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

/** Разрешение просрочено начиная со дня, следующего за датой окончания. */
export function isPermitExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return expiresAt < new Date().toISOString().slice(0, 10);
}
