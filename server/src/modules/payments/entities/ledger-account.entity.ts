import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Region } from '../../regions/entities/region.entity';
import { DriverProfile } from '../../drivers/entities/driver-profile.entity';
import { LedgerAccountType } from '../enums/payment.enums';

@Entity('ledger_accounts')
export class LedgerAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'account_type', type: 'enum', enum: LedgerAccountType })
  accountType!: LedgerAccountType;

  /** Для driver-счетов — driver_profiles.id */
  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId!: string | null;

  @Column({ name: 'region_id', type: 'uuid' })
  regionId!: string;

  @ManyToOne(() => Region, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'region_id' })
  region!: Region;

  @ManyToOne(() => DriverProfile, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'owner_id' })
  driver?: DriverProfile | null;

  @Column({ type: 'varchar', length: 8, default: 'RUB' })
  currency!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
