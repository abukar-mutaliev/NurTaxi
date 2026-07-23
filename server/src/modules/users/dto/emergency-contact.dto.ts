import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEmergencyContactDto {
  @ApiProperty({ example: 'Мама' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '+79280000002' })
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone!: string;
}
