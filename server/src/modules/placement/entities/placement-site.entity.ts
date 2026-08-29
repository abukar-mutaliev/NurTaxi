import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlacementPurpose } from '../../../common/enums/compliance.enum';
import { PlacementComponent } from './placement-component.entity';
import { PlacementSubcontractor } from './placement-subcontractor.entity';
import { PlacementSiteLog } from './placement-site-log.entity';

/**
 * Площадка размещения инфраструктуры (FZ-09.1).
 */
@Entity('placement_sites')
export class PlacementSite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'varchar', length: 240 })
  operator!: string;

  @Column({ type: 'text' })
  address!: string;

  @Column({ name: 'region_code', type: 'varchar', length: 32 })
  regionCode!: string;

  @Column({ type: 'varchar', length: 32 })
  purpose!: PlacementPurpose;

  @Column({ name: 'contract_ref', type: 'varchar', length: 160, nullable: true })
  contractRef!: string | null;

  @Column({ name: 'period_from', type: 'date' })
  periodFrom!: string;

  @Column({ name: 'period_to', type: 'date', nullable: true })
  periodTo!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => PlacementComponent, (component) => component.site)
  components!: PlacementComponent[];

  @OneToMany(() => PlacementSubcontractor, (sub) => sub.site)
  subcontractors!: PlacementSubcontractor[];

  @OneToMany(() => PlacementSiteLog, (log) => log.site)
  logs!: PlacementSiteLog[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
