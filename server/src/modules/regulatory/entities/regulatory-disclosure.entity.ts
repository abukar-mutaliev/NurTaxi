import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Журнал фактов предоставления сведений уполномоченному органу (FZ-10.4).
 * Записи только добавляются; изменение и удаление запрещены триггером.
 */
@Entity('regulatory_disclosures')
@Index('idx_regulatory_disclosures_created', ['createdAt'])
export class RegulatoryDisclosure {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'export_id', type: 'uuid', nullable: true })
  exportId!: string | null;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId!: string;

  @Column({ name: 'legal_basis', type: 'text' })
  legalBasis!: string;

  @Column({ name: 'request_ref', type: 'varchar', length: 160 })
  requestRef!: string;

  @Column({ name: 'period_from', type: 'timestamptz' })
  periodFrom!: Date;

  @Column({ name: 'period_to', type: 'timestamptz' })
  periodTo!: Date;

  @Column({ name: 'row_count', type: 'int' })
  rowCount!: number;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
