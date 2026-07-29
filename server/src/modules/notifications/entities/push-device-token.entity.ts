import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PushPlatform } from '../../../common/enums/phase8.enum';
import { User } from '../../users/entities/user.entity';

@Entity('push_device_tokens')
export class PushDeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string;

  @Column({ type: 'enum', enum: PushPlatform })
  platform!: PushPlatform;

  @Column({ name: 'device_id', type: 'varchar', length: 128, nullable: true })
  deviceId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
