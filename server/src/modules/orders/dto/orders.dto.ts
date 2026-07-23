import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../../common/enums/order-status.enum';

export class GeoLocationDto {
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

  @ApiPropertyOptional({ example: 'г. Назрань, ул. Московская, 1' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string;
}

export class OrderEstimateDto {
  @ApiProperty({ description: 'UUID региона' })
  @IsUUID()
  regionId!: string;

  @ApiPropertyOptional({ description: 'UUID тарифа (по умолчанию — актуальный тариф региона)' })
  @IsOptional()
  @IsUUID()
  tariffId?: string;

  @ApiProperty({ type: GeoLocationDto })
  @ValidateNested()
  @Type(() => GeoLocationDto)
  pickup!: GeoLocationDto;

  @ApiProperty({ type: GeoLocationDto })
  @ValidateNested()
  @Type(() => GeoLocationDto)
  dropoff!: GeoLocationDto;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsUUID()
  regionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tariffId?: string;

  @ApiProperty({ type: GeoLocationDto })
  @ValidateNested()
  @Type(() => GeoLocationDto)
  pickup!: GeoLocationDto;

  @ApiProperty({ type: GeoLocationDto })
  @ValidateNested()
  @Type(() => GeoLocationDto)
  dropoff!: GeoLocationDto;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ example: 'Буду у второго подъезда' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @ApiPropertyOptional({ description: 'Заказ для подтверждённого члена семьи (Req §8.6)' })
  @IsOptional()
  @IsUUID()
  familyMemberId?: string;
}

export class CancelOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class DriverOrderActionDto {
  @ApiProperty({
    enum: ['en_route', 'arrived', 'start', 'complete'],
    description: 'Следующий этап поездки',
  })
  @IsEnum(['en_route', 'arrived', 'start', 'complete'] as const)
  action!: 'en_route' | 'arrived' | 'start' | 'complete';
}
