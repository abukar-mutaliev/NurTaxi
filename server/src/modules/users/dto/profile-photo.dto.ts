import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PHOTO_CONTENT_TYPES, PHOTO_MAX_BYTES } from '../../storage/upload-constraints';

export class PresignProfilePhotoDto {
  @ApiProperty({ example: 'image/jpeg', enum: PHOTO_CONTENT_TYPES })
  @IsIn(PHOTO_CONTENT_TYPES)
  contentType!: string;

  @ApiProperty({ example: 120_000, description: 'Размер файла в байтах' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PHOTO_MAX_BYTES)
  contentLength!: number;

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
