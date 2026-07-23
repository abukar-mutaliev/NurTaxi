import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog } from './entities/admin-audit-log.entity';

export interface AuditLogEntry {
  actorId: string;
  regionId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  payload?: Record<string, unknown>;
  ipAddress?: string | null;
}

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly logs: Repository<AdminAuditLog>,
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
        }),
      );
    } catch (error) {
      this.logger.warn(`Audit log failed: ${error instanceof Error ? error.message : error}`);
    }
  }
}
