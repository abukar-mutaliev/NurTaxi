import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FamilyMemberStatus } from '../../../common/enums/phase8.enum';
import { User } from './user.entity';

export interface FamilyPermissions {
  track: boolean;
  notify: boolean;
  pay: boolean;
}

@Entity('family_members')
export class FamilyMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @Column({ name: 'member_user_id', type: 'uuid', nullable: true })
  memberUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'member_user_id' })
  memberUser?: User | null;

  @Column({ name: 'member_phone', type: 'varchar', length: 20 })
  memberPhone!: string;

  @Column({ type: 'varchar', length: 64 })
  relation!: string;

  @Column({ type: 'jsonb', default: () => '\'{"track": true, "notify": true, "pay": true}\'' })
  permissions!: FamilyPermissions;

  @Column({ type: 'enum', enum: FamilyMemberStatus, default: FamilyMemberStatus.Pending })
  status!: FamilyMemberStatus;

  @Column({ name: 'confirm_code', type: 'varchar', length: 16, nullable: true })
  confirmCode!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt!: Date | null;
}
