import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PromoCode } from './promo-code.entity';

@Entity('promo_redemptions')
export class PromoRedemption {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'promo_code_id', type: 'uuid' })
  promoCodeId!: string;

  @ManyToOne(() => PromoCode, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'promo_code_id' })
  promoCode!: PromoCode;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'bonus_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  bonusAmount!: string;

  @CreateDateColumn({ name: 'redeemed_at', type: 'timestamptz' })
  redeemedAt!: Date;
}
