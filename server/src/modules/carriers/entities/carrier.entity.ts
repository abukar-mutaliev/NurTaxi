import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CarrierStatus } from '../../../common/enums/compliance.enum';
import { Region } from '../../regions/entities/region.entity';
import { TaxiPermit } from './taxi-permit.entity';
import { DriverAssignment } from './driver-assignment.entity';

/**
 * Перевозчик — ЮЛ или ИП с разрешением на перевозку легковым такси (FZ-04.1).
 */
@Entity('carriers')
export class Carrier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 240 })
  name!: string;

  @Column({ name: 'legal_form', type: 'varchar', length: 32 })
  legalForm!: string;

  @Index('uq_carriers_inn', { unique: true })
  @Column({ type: 'varchar', length: 12 })
  inn!: string;

  @Column({ type: 'varchar', length: 15 })
  ogrn!: string;

  @Column({ type: 'text' })
  address!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  email!: string | null;

  @Column({ name: 'region_id', type: 'uuid' })
  regionId!: string;

  @ManyToOne(() => Region, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'region_id' })
  region!: Region;

  @Column({ type: 'varchar', length: 32, default: CarrierStatus.Draft })
  status!: CarrierStatus;

  @Column({ name: 'registry_status', type: 'varchar', length: 64, nullable: true })
  registryStatus!: string | null;

  @OneToMany(() => TaxiPermit, (permit) => permit.carrier)
  permits!: TaxiPermit[];

  @OneToMany(() => DriverAssignment, (assignment) => assignment.carrier)
  assignments!: DriverAssignment[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
