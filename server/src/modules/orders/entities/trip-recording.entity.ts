import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Order } from './order.entity';

/**
 * Аудиозапись поездки, загруженная клиентом (Req §8.7).
 */
@Entity('trip_recordings')
export class TripRecording {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: User;

  @Column({ name: 'storage_key', type: 'varchar', length: 512 })
  storageKey!: string;

  @Column({ name: 'duration_sec', type: 'integer', nullable: true })
  durationSec!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
