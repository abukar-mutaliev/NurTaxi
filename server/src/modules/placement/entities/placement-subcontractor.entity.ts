import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PlacementSite } from './placement-site.entity';

@Entity('placement_subcontractors')
export class PlacementSubcontractor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId!: string;

  @ManyToOne(() => PlacementSite, (site) => site.subcontractors, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'site_id' })
  site!: PlacementSite;

  @Column({ type: 'varchar', length: 240 })
  name!: string;

  @Column({ type: 'varchar', length: 120 })
  role!: string;

  @Column({ name: 'period_from', type: 'date' })
  periodFrom!: string;

  @Column({ name: 'period_to', type: 'date', nullable: true })
  periodTo!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
