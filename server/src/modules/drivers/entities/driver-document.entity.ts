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
import { DocumentType } from '../../../common/enums/document-type.enum';
import { DocumentStatus } from '../../../common/enums/document-status.enum';
import { DriverProfile } from './driver-profile.entity';

/**
 * Документ водителя в приватном S3 (Des §9, §13.1, Req §8.2).
 * `storage_key` — ключ объекта; публичный URL не хранится.
 */
@Entity('driver_documents')
@Index('uq_driver_documents_driver_type', ['driverId', 'type'], { unique: true })
export class DriverDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @ManyToOne(() => DriverProfile, (driver) => driver.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver!: DriverProfile;

  @Column({ type: 'enum', enum: DocumentType })
  type!: DocumentType;

  @Column({ name: 'storage_key', type: 'text' })
  storageKey!: string;

  @Column({ name: 'content_type', type: 'varchar', length: 120 })
  contentType!: string;

  @Column({ type: 'enum', enum: DocumentStatus, default: DocumentStatus.Pending })
  status!: DocumentStatus;

  @Column({ name: 'moderator_id', type: 'uuid', nullable: true })
  moderatorId!: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
