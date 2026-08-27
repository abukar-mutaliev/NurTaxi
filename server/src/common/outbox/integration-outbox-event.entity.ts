import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OutboxChannel } from '../enums/compliance.enum';
import { OutboxStatus } from '../../modules/payments/enums/payment.enums';

/**
 * Общий outbox гарантированной доставки во внешние системы (C8.1, FZ-07.2).
 * Платёжный outbox_events сохраняется; этот канал обслуживает РИС и прочие интеграции.
 */
@Entity('integration_outbox')
@Index('idx_integration_outbox_pending', ['status', 'createdAt'])
export class IntegrationOutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  channel!: OutboxChannel;

  @Column({ name: 'region_id', type: 'uuid', nullable: true })
  regionId!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  destination!: string | null;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType!: string;

  @Column({ name: 'aggregate_id', type: 'uuid', nullable: true })
  aggregateId!: string | null;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 16, default: OutboxStatus.Pending })
  status!: OutboxStatus;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  response!: Record<string, unknown> | null;

  @Column({ name: 'next_attempt_at', type: 'timestamptz', nullable: true })
  nextAttemptAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;
}
