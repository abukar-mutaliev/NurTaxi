import { Matches, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { normalizePhone } from '../phone.util';

export class OtpRequestDto {
  @ApiProperty({ example: '+79280000000', description: 'Номер телефона в формате +7XXXXXXXXXX' })
  @Transform(({ value }) => normalizePhone(value))
  @Matches(/^\+7\d{10}$/, { message: 'Некорректный номер телефона (ожидается +7XXXXXXXXXX)' })
  phone!: string;
}

export class OtpVerifyDto {
  @ApiProperty({ example: '+79280000000' })
  @Transform(({ value }) => normalizePhone(value))
  @Matches(/^\+7\d{10}$/, { message: 'Некорректный номер телефона (ожидается +7XXXXXXXXXX)' })
  phone!: string;

  @ApiProperty({ example: '1234', description: 'Код из SMS' })
  @IsString()
  @Length(4, 6)
  code!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}
