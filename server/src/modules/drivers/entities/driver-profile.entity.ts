import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VerificationStatus } from '../../../common/enums/verification-status.enum';
import { DriverOnlineStatus } from '../../../common/enums/driver-online-status.enum';
import { User } from '../../users/entities/user.entity';
import { Region } from '../../regions/entities/region.entity';
import { Vehicle } from './vehicle.entity';
import { DriverDocument } from './driver-document.entity';
import type { WorkSchedule } from './work-schedule.types';

/**
 * Профиль водителя (Des §13.1, Req §8.2, §8.4).
 */
@Entity('driver_profiles')
export class DriverProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('uq_driver_profiles_user_id', { unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'full_name', type: 'varchar', length: 200 })
  fullName!: string;

  @Column({ name: 'birth_date', type: 'date' })
  birthDate!: string;

  @Column({ name: 'residence_address', type: 'text' })
  residenceAddress!: string;

  @Column({ name: 'driving_experience_years', type: 'smallint' })
  drivingExperienceYears!: number;

  @Column({ name: 'region_id', type: 'uuid' })
  regionId!: string;

  @ManyToOne(() => Region, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'region_id' })
  region!: Region;

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.Draft,
  })
  verificationStatus!: VerificationStatus;

  @Column({
    name: 'online_status',
    type: 'enum',
    enum: DriverOnlineStatus,
    default: DriverOnlineStatus.Offline,
  })
  onlineStatus!: DriverOnlineStatus;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  rating!: string;

  @Column({ name: 'trips_count', type: 'int', default: 0 })
  tripsCount!: number;

  @Column({ name: 'work_schedule', type: 'jsonb', default: () => "'{}'" })
  workSchedule!: WorkSchedule;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance!: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.driver)
  vehicles!: Vehicle[];

  @OneToMany(() => DriverDocument, (document) => document.driver)
  documents!: DriverDocument[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
