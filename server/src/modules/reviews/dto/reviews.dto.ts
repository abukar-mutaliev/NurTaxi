import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ReviewTag } from '../../../common/enums/phase8.enum';
import type { Review } from '../entities/review.entity';

export class CreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  text?: string;

  @ApiPropertyOptional({ enum: ReviewTag, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsEnum(ReviewTag, { each: true })
  tags?: ReviewTag[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isComplaint?: boolean;
}

export class ReviewResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  authorId!: string;

  @ApiProperty()
  target!: string;

  @ApiProperty()
  rating!: number;

  @ApiPropertyOptional()
  text!: string | null;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty()
  isComplaint!: boolean;

  @ApiProperty()
  createdAt!: string;

  static from(review: Review): ReviewResponse {
    return {
      id: review.id,
      orderId: review.orderId,
      authorId: review.authorId,
      target: review.target,
      rating: review.rating,
      text: review.text,
      tags: review.tags,
      isComplaint: review.isComplaint,
      createdAt: review.createdAt.toISOString(),
    };
  }
}
