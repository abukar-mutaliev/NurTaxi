import { ApiProperty } from '@nestjs/swagger';
import type { SavedAddress } from '../entities/saved-address.entity';

export class SavedAddressResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  lat!: number;

  @ApiProperty()
  lng!: number;

  @ApiProperty()
  createdAt!: string;

  static from(entity: SavedAddress): SavedAddressResponse {
    return {
      id: entity.id,
      label: entity.label,
      address: entity.address,
      lat: entity.lat,
      lng: entity.lng,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
