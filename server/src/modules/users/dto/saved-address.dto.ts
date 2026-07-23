import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateSavedAddressDto {
  @ApiProperty({ example: 'Дом', description: 'Дом / Работа / произвольная метка' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  label!: string;

  @ApiProperty({ example: 'г. Назрань, ул. Московская, 10' })
  @IsString()
  @MinLength(5)
  address!: string;

  @ApiProperty({ example: 43.2189 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 44.771 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}
