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
import { OfferOutcome } from '../../../common/enums/compliance.enum';
import { Order } from './order.entity';

/**
 * Персистентный журнал передачи заказа водителю (FZ-04.6).
 * Redis-предложение с TTL 30 с остаётся для матчинга; эта таблица — доказательная база.
 */
@Entity('order_offer_logs')
@Index('idx_order_offer_logs_order', ['orderId', 'offeredAt'])
export class OrderOfferLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @Column({ name: 'offered_at', type: 'timestamptz' })
  offeredAt!: Date;

  @Column({ name: 'timeout_sec', type: 'int' })
  timeoutSec!: number;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'varchar', length: 32, default: OfferOutcome.Pending })
  outcome!: OfferOutcome;

  @Column({ name: 'outcome_at', type: 'timestamptz', nullable: true })
  outcomeAt!: Date | null;

  @Column({ name: 'assigned', type: 'boolean', default: false })
  assigned!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
