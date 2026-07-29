import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PushPlatform } from '../../../common/enums/phase8.enum';

export class RegisterPushTokenDto {
  @ApiProperty({ description: 'Expo push token или native device token' })
  @IsString()
  @MinLength(10)
  @MaxLength(255)
  token!: string;

  @ApiProperty({ enum: PushPlatform })
  @IsEnum(PushPlatform)
  platform!: PushPlatform;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string;
}

export class UnregisterPushTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(255)
  token!: string;
}
