import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuthEventType } from '../../../common/enums/compliance.enum';

@Entity('auth_event_logs')
@Index('idx_auth_event_logs_created', ['createdAt'])
@Index('idx_auth_event_logs_user', ['userId', 'createdAt'])
export class AuthEventLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 32 })
  type!: AuthEventType;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent!: string | null;

  @Column({ type: 'boolean' })
  success!: boolean;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
