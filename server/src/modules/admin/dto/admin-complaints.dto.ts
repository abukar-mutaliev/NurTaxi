import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminComplaintResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  regionId!: string;

  @ApiProperty()
  authorId!: string;

  @ApiPropertyOptional()
  authorName!: string | null;

  @ApiProperty()
  authorPhone!: string;

  @ApiProperty()
  target!: string;

  @ApiProperty()
  rating!: number;

  @ApiPropertyOptional()
  text!: string | null;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional()
  orderPickupAddress!: string | null;

  @ApiPropertyOptional()
  orderStatus!: string | null;
}
