import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Payment } from './payment.entity';

export interface ReceiptPayload {
  orderId: string;
  paymentMethod: string;
  pickupAddress: string;
  dropoffAddress: string;
  commission: number;
  driverNet: number;
  tariffName?: string;
}

@Entity('receipts')
export class Receipt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId!: string | null;

  @ManyToOne(() => Payment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'payment_id' })
  payment?: Payment | null;

  @Column({ name: 'receipt_number', type: 'varchar', length: 32 })
  receiptNumber!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'varchar', length: 8 })
  currency!: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload!: ReceiptPayload;

  @Column({ name: 'issued_at', type: 'timestamptz' })
  issuedAt!: Date;
}
