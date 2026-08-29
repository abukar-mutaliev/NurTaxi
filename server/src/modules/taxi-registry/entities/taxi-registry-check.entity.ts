import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { RegistrySubjectType, RegistryVerdict } from '../../../common/enums/compliance.enum';

@Entity('taxi_registry_checks')
@Index('idx_taxi_registry_checks_subject', ['subjectType', 'subjectId', 'checkedAt'])
export class TaxiRegistryCheck {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'subject_type', type: 'varchar', length: 32 })
  subjectType!: RegistrySubjectType;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId!: string;

  @Column({ name: 'region_id', type: 'uuid' })
  regionId!: string;

  @Column({ type: 'varchar', length: 80 })
  source!: string;

  @Column({ type: 'jsonb', default: {} })
  request!: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  response!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 32 })
  verdict!: RegistryVerdict;

  @Column({ name: 'checked_at', type: 'timestamptz' })
  checkedAt!: Date;

  @Column({ name: 'valid_until', type: 'timestamptz', nullable: true })
  validUntil!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
