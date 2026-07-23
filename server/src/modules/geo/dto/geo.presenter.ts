import { ApiProperty } from '@nestjs/swagger';
import type { AddressSuggestion } from '../map/map-provider.interface';

export class AddressSuggestionResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  subtitle!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  lat!: number;

  @ApiProperty()
  lng!: number;

  static from(s: AddressSuggestion): AddressSuggestionResponse {
    return {
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
    };
  }
}
