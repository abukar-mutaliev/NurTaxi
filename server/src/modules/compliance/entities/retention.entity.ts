import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('retention_purge_runs')
export class RetentionPurgeRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'retention_months', type: 'int' })
  retentionMonths!: number;

  @Column({ name: 'cutoff_at', type: 'timestamptz' })
  cutoffAt!: Date;

  @Column({ name: 'orders_touched', type: 'int', default: 0 })
  ordersTouched!: number;

  @Column({ type: 'varchar', length: 32 })
  status!: 'completed' | 'skipped' | 'failed';

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('app_settings')
export class AppSetting {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  key!: string;

  @Column({ type: 'jsonb' })
  value!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
