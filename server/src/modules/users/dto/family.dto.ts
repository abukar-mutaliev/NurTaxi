import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { FamilyMember } from '../entities/family-member.entity';

export class AddFamilyMemberDto {
  @ApiProperty()
  @IsUUID()
  regionId!: string;

  @ApiProperty({ example: '+79281234567' })
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: 'дочь' })
  @IsString()
  @MaxLength(64)
  relation!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  track?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notify?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pay?: boolean;
}

export class ConfirmFamilyDto {
  @ApiProperty()
  @IsString()
  @MinLength(4)
  @MaxLength(16)
  code!: string;
}

export class FamilyMemberResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  memberPhone!: string;

  @ApiPropertyOptional()
  memberUserId!: string | null;

  @ApiProperty()
  relation!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  permissions!: { track: boolean; notify: boolean; pay: boolean };

  @ApiProperty()
  createdAt!: string;

  static from(member: FamilyMember): FamilyMemberResponse {
    return {
      id: member.id,
      memberPhone: member.memberPhone,
      memberUserId: member.memberUserId,
      relation: member.relation,
      status: member.status,
      permissions: member.permissions,
      createdAt: member.createdAt.toISOString(),
    };
  }
}
