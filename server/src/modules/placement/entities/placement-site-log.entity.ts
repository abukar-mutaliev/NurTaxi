import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PlacementSite } from './placement-site.entity';

@Entity('placement_site_logs')
export class PlacementSiteLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId!: string;

  @ManyToOne(() => PlacementSite, (site) => site.logs, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'site_id' })
  site!: PlacementSite;

  @Column({ type: 'varchar', length: 64 })
  action!: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
