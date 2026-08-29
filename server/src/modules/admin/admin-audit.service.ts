import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { Role } from '../../common/enums/role.enum';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { AdminScopeService } from './admin-scope.service';
import { decodeCursor, encodeCursor } from './dto/pagination.dto';

export interface AuditLogEntry {
  actorId: string;
  regionId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  payload?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  result?: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly logs: Repository<AdminAuditLog>,
    private readonly scope: AdminScopeService,
  ) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.logs.save(
        this.logs.create({
          actorId: entry.actorId,
          regionId: entry.regionId ?? null,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId ?? null,
          payload: entry.payload ?? {},
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
          result: entry.result ?? 'success',
          previousValue: entry.previousValue ?? null,
          newValue: entry.newValue ?? null,
        }),
      );
    } catch (error) {
      this.logger.warn(`Audit log failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  async listLogs(
    actor: AuthenticatedUser,
    filters: {
      regionId?: string;
      limit?: number;
      cursor?: string;
      resourceId?: string;
      actorId?: string;
      action?: string;
      from?: string;
      to?: string;
    },
  ): Promise<{ items: AdminAuditLog[]; nextCursor: string | null; hasMore: boolean }> {
    const take = Math.min(Math.max(filters.limit ?? 30, 1), 100);

    const qb = this.logs
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')
      .orderBy('log.createdAt', 'DESC')
      .addOrderBy('log.id', 'DESC')
      .take(take + 1);

    if (actor.role === Role.SuperAdmin || actor.role === Role.Regulator) {
      if (filters.regionId) {
        qb.andWhere('log.regionId = :regionId', { regionId: filters.regionId });
      }
    } else {
      const assigned = await this.scope.getAssignedRegionId(actor);
      qb.andWhere('log.regionId = :regionId', { regionId: assigned });
    }

    if (filters.resourceId) {
      qb.andWhere('log.resourceId = :resourceId', { resourceId: filters.resourceId });
    }
    if (filters.actorId) {
      qb.andWhere('log.actorId = :actorId', { actorId: filters.actorId });
    }
    if (filters.action) {
      qb.andWhere('log.action ILIKE :action', { action: `%${filters.action}%` });
    }
    if (filters.from) {
      qb.andWhere('log.createdAt >= :from', { from: new Date(filters.from) });
    }
    if (filters.to) {
      qb.andWhere('log.createdAt <= :to', { to: new Date(filters.to) });
    }

    const decoded = filters.cursor ? decodeCursor(filters.cursor) : null;
    if (decoded) {
      qb.andWhere(
        '(log.createdAt < :cursorAt OR (log.createdAt = :cursorAt AND log.id < :cursorId))',
        { cursorAt: decoded.createdAt, cursorId: decoded.id },
      );
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const last = items[items.length - 1];

    return {
      items,
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : null,
    };
  }
}
