import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class GeoSearchQueryDto {
  @ApiProperty({ description: 'Поисковый запрос', example: 'Назрань Московская' })
  @IsString()
  @MinLength(2)
  q!: string;

  @ApiPropertyOptional({ description: 'Фильтр по региону' })
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional({ description: 'Широта текущей позиции (для ранжирования)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'Долгота текущей позиции' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}

export class GeoRouteQueryDto {
  @ApiProperty({ description: 'Широта точки отправления' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  originLat!: number;

  @ApiProperty({ description: 'Долгота точки отправления' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  originLng!: number;

  @ApiProperty({ description: 'Широта точки назначения' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  destLat!: number;

  @ApiProperty({ description: 'Долгота точки назначения' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  destLng!: number;
}

export class GeoReverseQueryDto {
  @ApiProperty({ description: 'Широта' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ description: 'Долгота' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}
