import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AdminAuditLog } from '../entities/admin-audit-log.entity';

export class AuditLogResponse {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  actorId!: string | null;

  @ApiPropertyOptional()
  actorLabel!: string | null;

  @ApiPropertyOptional()
  regionId!: string | null;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  resourceType!: string;

  @ApiPropertyOptional()
  resourceId!: string | null;

  @ApiProperty()
  payload!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: string;

  static from(log: AdminAuditLog): AuditLogResponse {
    return {
      id: log.id,
      actorId: log.actorId,
      actorLabel: log.actor?.name ?? log.actor?.phone ?? null,
      regionId: log.regionId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      payload: log.payload ?? {},
      createdAt: log.createdAt.toISOString(),
    };
  }
}

export class AuditLogListResponse {
  @ApiProperty({ type: [AuditLogResponse] })
  items!: AuditLogResponse[];

  @ApiPropertyOptional()
  nextCursor!: string | null;

  @ApiProperty()
  hasMore!: boolean;

  static from(page: {
    items: AdminAuditLog[];
    nextCursor: string | null;
    hasMore: boolean;
  }): AuditLogListResponse {
    return {
      items: page.items.map(AuditLogResponse.from),
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    };
  }
}
