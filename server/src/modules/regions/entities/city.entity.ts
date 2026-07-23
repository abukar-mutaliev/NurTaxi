import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Region } from './region.entity';

/**
 * Город внутри региона (Des §13.5, Req §6.3).
 * `boundaries` — GeoJSON-полигон границ (PostGIS — в следующих итерациях).
 */
@Entity('cities')
export class City {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'region_id', type: 'uuid' })
  regionId!: string;

  @ManyToOne(() => Region, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'region_id' })
  region!: Region;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'jsonb', nullable: true })
  boundaries!: Record<string, unknown> | null;

  @Column({ name: 'center_lat', type: 'double precision', nullable: true })
  centerLat!: number | null;

  @Column({ name: 'center_lng', type: 'double precision', nullable: true })
  centerLng!: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
