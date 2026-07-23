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
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { Region } from '../../regions/entities/region.entity';

export interface NotificationSettings {
  push: boolean;
  sms: boolean;
  email: boolean;
}

export interface PrivacySettings {
  shareTripWithFamily: boolean;
  showProfilePhoto: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  push: true,
  sms: true,
  email: false,
};

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  shareTripWithFamily: true,
  showProfilePhoto: true,
};

/**
 * Пользователь системы (Des §13.1). Единая сущность для всех ролей;
 * профиль водителя расширяется отдельной сущностью DriverProfile (Фаза 2).
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('uq_users_phone', { unique: true })
  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  name!: string | null;

  @Column({ name: 'photo_url', type: 'text', nullable: true })
  photoUrl!: string | null;

  @Column({ type: 'enum', enum: Role, default: Role.Client })
  role!: Role;

  @Column({ type: 'varchar', length: 8, default: 'ru' })
  language!: string;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.Active })
  status!: UserStatus;

  @Column({ name: 'privacy_settings', type: 'jsonb', default: () => "'{}'" })
  privacySettings!: PrivacySettings;

  @Column({ name: 'notification_settings', type: 'jsonb', default: () => "'{}'" })
  notificationSettings!: NotificationSettings;

  // Факт согласия на обработку персональных данных (152-ФЗ, Req §8.1, Des §9).
  @Column({ name: 'pdn_consent_at', type: 'timestamptz', nullable: true })
  pdnConsentAt!: Date | null;

  @Column({ name: 'pdn_consent_version', type: 'varchar', length: 20, nullable: true })
  pdnConsentVersion!: string | null;

  /** Регион для operator / regional_admin (Фаза 7, Req §7.3–7.4). */
  @Column({ name: 'assigned_region_id', type: 'uuid', nullable: true })
  assignedRegionId!: string | null;

  @ManyToOne(() => Region, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_region_id' })
  assignedRegion?: Region | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
