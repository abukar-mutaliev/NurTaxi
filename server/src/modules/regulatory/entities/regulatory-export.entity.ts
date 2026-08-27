import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ExportDateField,
  ExportFormat,
  ExportStatus,
} from '../../../common/enums/compliance.enum';

@Entity('regulatory_exports')
@Index('idx_regulatory_exports_created', ['createdAt'])
export class RegulatoryExport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'requested_by', type: 'uuid' })
  requestedBy!: string;

  @Column({ name: 'legal_basis', type: 'text' })
  legalBasis!: string;

  @Column({ name: 'request_ref', type: 'varchar', length: 160 })
  requestRef!: string;

  @Column({ name: 'period_from', type: 'timestamptz' })
  periodFrom!: Date;

  @Column({ name: 'period_to', type: 'timestamptz' })
  periodTo!: Date;

  @Column({ name: 'date_field', type: 'varchar', length: 16, default: ExportDateField.Created })
  dateField!: ExportDateField;

  @Column({ name: 'region_id', type: 'uuid', nullable: true })
  regionId!: string | null;

  @Column({ type: 'varchar', length: 8, default: ExportFormat.Csv })
  format!: ExportFormat;

  @Column({ type: 'varchar', length: 16, default: ExportStatus.Queued })
  status!: ExportStatus;

  @Column({ name: 'storage_key', type: 'varchar', length: 512, nullable: true })
  storageKey!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum!: string | null;

  @Column({ name: 'row_count', type: 'int', nullable: true })
  rowCount!: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
