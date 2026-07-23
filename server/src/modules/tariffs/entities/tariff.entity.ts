import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Region } from '../../regions/entities/region.entity';

export interface SurgeRules {
  enabled?: boolean;
  multiplier?: number;
}

export interface CancellationPolicy {
  freeCancelBeforeAssigned?: boolean;
  feeAfterAssigned?: number;
  feeAfterArrived?: number;
}

/**
 * Тариф региона (Des §7, §13.5, Req §22).
 * Применяется по `effective_from` — выбирается запись с max(effective_from) <= now.
 */
@Entity('tariffs')
export class Tariff {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'region_id', type: 'uuid' })
  regionId!: string;

  @ManyToOne(() => Region, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'region_id' })
  region!: Region;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({ name: 'base_fare', type: 'decimal', precision: 10, scale: 2 })
  baseFare!: string;

  @Column({ name: 'price_per_km', type: 'decimal', precision: 10, scale: 2 })
  pricePerKm!: string;

  @Column({ name: 'price_per_min', type: 'decimal', precision: 10, scale: 2 })
  pricePerMin!: string;

  @Column({ name: 'min_price', type: 'decimal', precision: 10, scale: 2 })
  minPrice!: string;

  @Column({ name: 'surge_rules', type: 'jsonb', default: () => "'{}'" })
  surgeRules!: SurgeRules;

  @Column({ name: 'commission_percent', type: 'decimal', precision: 5, scale: 2, default: 15 })
  commissionPercent!: string;

  @Column({ name: 'cancellation_policy', type: 'jsonb', default: () => "'{}'" })
  cancellationPolicy!: CancellationPolicy;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom!: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
