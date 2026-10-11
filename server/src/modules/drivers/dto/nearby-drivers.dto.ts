import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Max, Min } from 'class-validator';

export class NearbyDriversQueryDto {
  @ApiProperty({ description: 'Регион, в котором ищем свободных водителей' })
  @IsUUID()
  regionId!: string;

  @ApiProperty({ example: 43.2167 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 44.7667 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

/** Позиция свободной машины. Имя, телефон и рейтинг клиенту до назначения не отдаём. */
export class NearbyDriverResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  lat!: number;

  @ApiProperty()
  lng!: number;

  static from(driver: { id: string; lat: number; lng: number }): NearbyDriverResponse {
    return { id: driver.id, lat: driver.lat, lng: driver.lng };
  }
}
