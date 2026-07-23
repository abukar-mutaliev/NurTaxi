import { ApiProperty } from '@nestjs/swagger';
import type { EmergencyContact } from '../entities/emergency-contact.entity';

export class EmergencyContactResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  createdAt!: string;

  static from(entity: EmergencyContact): EmergencyContactResponse {
    return {
      id: entity.id,
      name: entity.name,
      phone: entity.phone,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
