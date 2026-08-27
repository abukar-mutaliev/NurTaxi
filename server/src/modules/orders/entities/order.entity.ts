import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { CompletenessStatus } from '../../../common/enums/compliance.enum';
import { OrderStatus, PaymentMethod } from '../../../common/enums/order-status.enum';
import type { AssignmentSnapshot } from '../../../common/compliance/assignment-snapshot';
import { User } from '../../users/entities/user.entity';
import { Region } from '../../regions/entities/region.entity';
import { Tariff } from '../../tariffs/entities/tariff.entity';
import { DriverProfile } from '../../drivers/entities/driver-profile.entity';
import { Vehicle } from '../../drivers/entities/vehicle.entity';
import { Carrier } from '../../carriers/entities/carrier.entity';
import { TaxiPermit } from '../../carriers/entities/taxi-permit.entity';
import { OrderRoute } from './order-route.entity';

/**
 * Заказ поездки (Req §13.3, Des §5).
 */
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_id' })
  client!: User;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId!: string | null;

  @ManyToOne(() => DriverProfile, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'driver_id' })
  driver!: DriverProfile | null;

  @Column({ name: 'region_id', type: 'uuid' })
  regionId!: string;

  @ManyToOne(() => Region, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'region_id' })
  region!: Region;

  @Column({ name: 'tariff_id', type: 'uuid' })
  tariffId!: string;

  @ManyToOne(() => Tariff, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tariff_id' })
  tariff!: Tariff;

  @Column({ name: 'pickup_lat', type: 'double precision' })
  pickupLat!: number;

  @Column({ name: 'pickup_lng', type: 'double precision' })
  pickupLng!: number;

  @Column({ name: 'pickup_address', type: 'text' })
  pickupAddress!: string;

  @Column({ name: 'dropoff_lat', type: 'double precision' })
  dropoffLat!: number;

  @Column({ name: 'dropoff_lng', type: 'double precision' })
  dropoffLng!: number;

  @Column({ name: 'dropoff_address', type: 'text' })
  dropoffAddress!: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.Created })
  status!: OrderStatus;

  @Column({ name: 'price_estimated', type: 'decimal', precision: 12, scale: 2 })
  priceEstimated!: string;

  @Column({ name: 'price_final', type: 'decimal', precision: 12, scale: 2, nullable: true })
  priceFinal!: string | null;

  @Column({ name: 'cancellation_fee', type: 'decimal', precision: 12, scale: 2, nullable: true })
  cancellationFee!: string | null;

  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column({ name: 'family_member_id', type: 'uuid', nullable: true })
  familyMemberId!: string | null;

  /** Человекочитаемый номер заказа, уникальный и последовательный (FZ-04.7). */
  @Column({ name: 'public_number', type: 'varchar', length: 20 })
  publicNumber!: string;

  /** Снимок перевозчика/разрешения/водителя/ТС на момент назначения (FZ-04.4). */
  @Column({ name: 'assignment_snapshot', type: 'jsonb', nullable: true })
  assignmentSnapshot!: AssignmentSnapshot | null;

  @Column({ name: 'trip_started_at', type: 'timestamptz', nullable: true })
  tripStartedAt!: Date | null;

  @Column({ name: 'trip_ended_at', type: 'timestamptz', nullable: true })
  tripEndedAt!: Date | null;

  @Column({ name: 'completeness_status', type: 'varchar', length: 32, default: CompletenessStatus.Pending })
  completenessStatus!: CompletenessStatus;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId!: string | null;

  @ManyToOne(() => Vehicle, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle | null;

  @Column({ name: 'carrier_id', type: 'uuid', nullable: true })
  carrierId!: string | null;

  @ManyToOne(() => Carrier, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'carrier_id' })
  carrier!: Carrier | null;

  @Column({ name: 'permit_id', type: 'uuid', nullable: true })
  permitId!: string | null;

  @ManyToOne(() => TaxiPermit, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'permit_id' })
  permit!: TaxiPermit | null;

  @VersionColumn()
  version!: number;

  @OneToOne(() => OrderRoute, (route) => route.order, { cascade: true })
  route!: OrderRoute;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
