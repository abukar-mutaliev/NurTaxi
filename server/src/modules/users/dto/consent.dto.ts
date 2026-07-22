import { Equals, IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Явное согласие на обработку персональных данных (152-ФЗ, Req §8.1).
 */
export class ConsentDto {
  @ApiProperty({ example: true, description: 'Должно быть true — явное согласие' })
  @IsBoolean()
  @Equals(true, { message: 'Требуется явное согласие на обработку персональных данных' })
  accepted!: boolean;

  @ApiPropertyOptional({ example: '1.0', description: 'Версия документа согласия' })
  @IsOptional()
  @IsString()
  version?: string;
}
