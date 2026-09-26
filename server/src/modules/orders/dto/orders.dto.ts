import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../../common/enums/order-status.enum';
import { normalizePhone } from '../../auth/phone.util';

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

  @ApiPropertyOptional({ description: 'Нужно детское кресло' })
  @IsOptional()
  @IsBoolean()
  childSeat?: boolean;

  @ApiPropertyOptional({ description: 'Имя пассажира, если заказ для другого человека' })
  @ValidateIf((dto: CreateOrderDto) => Boolean(dto.passengerName?.trim() || dto.passengerPhone))
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  passengerName?: string;

  @ApiPropertyOptional({
    example: '+79281234567',
    description: 'Телефон пассажира, если заказ для другого человека',
  })
  @ValidateIf((dto: CreateOrderDto) => Boolean(dto.passengerName?.trim() || dto.passengerPhone))
  @Transform(({ value }) => {
    if (typeof value !== 'string' || value.trim() === '') {
      return undefined;
    }
    return normalizePhone(value);
  })
  @Matches(/^\+7\d{10}$/, { message: 'Некорректный номер телефона (ожидается +7XXXXXXXXXX)' })
  passengerPhone?: string;

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
