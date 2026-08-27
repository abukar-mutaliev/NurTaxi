import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PlacementSite } from './placement-site.entity';

@Entity('placement_components')
@Index('uq_placement_components_key', ['componentKey'], { unique: true })
export class PlacementComponent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId!: string;

  @ManyToOne(() => PlacementSite, (site) => site.components, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'site_id' })
  site!: PlacementSite;

  @Column({ name: 'component_key', type: 'varchar', length: 80 })
  componentKey!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
