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
import type { TripRecording } from '../entities/trip-recording.entity';
import { AUDIO_CONTENT_TYPES, AUDIO_MAX_BYTES } from '../../storage/upload-constraints';

export class PresignTripRecordingDto {
  @ApiProperty({ example: 'audio/mp4', enum: AUDIO_CONTENT_TYPES })
  @IsIn(AUDIO_CONTENT_TYPES)
  contentType!: string;

  @ApiProperty({ example: 1_048_576, description: 'Размер файла в байтах' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(AUDIO_MAX_BYTES)
  contentLength!: number;

  @ApiPropertyOptional({ example: 'trip-recording.m4a' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fileName?: string;
}

export class ConfirmTripRecordingDto {
  @ApiProperty({ description: 'Ключ объекта из ответа presign' })
  @IsString()
  @IsNotEmpty()
  storageKey!: string;

  @ApiPropertyOptional({ example: 120, description: 'Длительность записи в секундах' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(86_400)
  durationSec?: number;
}

export class TripRecordingResponse {
  id!: string;
  orderId!: string;
  durationSec!: number | null;
  createdAt!: string;

  static from(record: TripRecording): TripRecordingResponse {
    return {
      id: record.id,
      orderId: record.orderId,
      durationSec: record.durationSec,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
