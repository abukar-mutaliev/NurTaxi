import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthEventType } from '../../common/enums/compliance.enum';
import { AuthEventLog } from './entities/auth-event-log.entity';

@Injectable()
export class AuthEventsService {
  constructor(
    @InjectRepository(AuthEventLog)
    private readonly logs: Repository<AuthEventLog>,
  ) {}

  record(entry: {
    type: AuthEventType;
    success: boolean;
    userId?: string | null;
    phone?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    payload?: Record<string, unknown>;
  }): void {
    void this.logs
      .save(
        this.logs.create({
          type: entry.type,
          success: entry.success,
          userId: entry.userId ?? null,
          phone: entry.phone ?? null,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
          payload: entry.payload ?? {},
        }),
      )
      .catch(() => undefined);
  }
}
