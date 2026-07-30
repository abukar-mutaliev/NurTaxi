import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class AdminAnalyticsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional({ description: 'Начало периода (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Конец периода (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

export type AdminReportType = 'orders' | 'drivers' | 'finance';
