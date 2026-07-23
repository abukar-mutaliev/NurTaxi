import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DriverProfile } from './driver-profile.entity';

/**
 * Автомобиль водителя (Des §13.1, Req §8.2).
 */
@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @ManyToOne(() => DriverProfile, (driver) => driver.vehicles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver!: DriverProfile;

  @Column({ type: 'varchar', length: 80 })
  make!: string;

  @Column({ type: 'varchar', length: 80 })
  model!: string;

  @Column({ name: 'plate_number', type: 'varchar', length: 20 })
  plateNumber!: string;

  @Column({ type: 'varchar', length: 40 })
  color!: string;

  @Column({ type: 'smallint' })
  year!: number;

  @Column({ name: 'photo_url', type: 'text', nullable: true })
  photoUrl!: string | null;

  @Column({ name: 'interior_photo_url', type: 'text', nullable: true })
  interiorPhotoUrl!: string | null;

  @Column({ name: 'is_primary', type: 'boolean', default: true })
  isPrimary!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
