import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class NotificationSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  email?: boolean;
}

class PrivacySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shareTripWithFamily?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showProfilePhoto?: boolean;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Амина' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @ApiPropertyOptional({ example: 'https://cdn.nurtaxi.example/u/abc.jpg' })
  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @ApiPropertyOptional({ example: 'ru', enum: ['ru', 'en', 'ing', 'ce'] })
  @IsOptional()
  @IsString()
  @IsIn(['ru', 'en', 'ing', 'ce'])
  language?: string;

  @ApiPropertyOptional({ type: NotificationSettingsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notificationSettings?: NotificationSettingsDto;

  @ApiPropertyOptional({ type: PrivacySettingsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PrivacySettingsDto)
  privacySettings?: PrivacySettingsDto;
}
