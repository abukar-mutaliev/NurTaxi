import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Минимальная модель региона (Des §4.1, §13.5).
 * Полная конфигурация (feature-flags, провайдеры) — Фаза 3/7.
 */
@Entity('regions')
export class Region {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 64, default: 'Europe/Moscow' })
  timezone!: string;

  @Column({ type: 'varchar', length: 8, default: 'RUB' })
  currency!: string;

  @Column({ name: 'feature_flags', type: 'jsonb', default: () => "'{}'" })
  featureFlags!: Record<string, boolean>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
