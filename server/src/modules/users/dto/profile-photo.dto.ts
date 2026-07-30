import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class PresignProfilePhotoDto {
  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @ApiPropertyOptional({ example: 'avatar.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fileName?: string;
}

export class ConfirmProfilePhotoDto {
  @ApiProperty({ description: 'Ключ объекта из ответа presign' })
  @IsString()
  @IsNotEmpty()
  storageKey!: string;
}
