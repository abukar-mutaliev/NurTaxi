import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { AuthenticatedUser } from '../../../common/auth/jwt-payload.interface';
import { AdminAuditService } from '../admin-audit.service';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AdminAuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      path: string;
      url: string;
      body?: Record<string, unknown>;
      params?: Record<string, string>;
      query?: Record<string, string>;
      user?: AuthenticatedUser;
      ip?: string;
    }>();

    if (!MUTATING_METHODS.has(req.method) && !req.path.includes('/admin')) {
      return next.handle();
    }
    if (!req.path.includes('/admin')) {
      return next.handle();
    }

    const actor = req.user;
    if (!actor) return next.handle();

    return next.handle().pipe(
      tap({
        next: () => {
          void this.audit.log({
            actorId: actor.id,
            regionId: (req.body?.regionId as string | undefined) ?? req.query?.regionId ?? null,
            action: `${req.method} ${req.path}`,
            resourceType: 'admin',
            resourceId: req.params?.id ?? null,
            payload: {
              body: req.body ?? {},
              query: req.query ?? {},
            },
            ipAddress: req.ip ?? null,
            userAgent: (req as { headers?: { 'user-agent'?: string } }).headers?.['user-agent'] ?? null,
            result: 'success',
          });
        },
        error: () => {
          void this.audit.log({
            actorId: actor.id,
            regionId: (req.query?.regionId as string | undefined) ?? null,
            action: `${req.method} ${req.path}`,
            resourceType: 'admin',
            resourceId: req.params?.id ?? null,
            payload: { query: req.query ?? {} },
            ipAddress: req.ip ?? null,
            result: 'error',
          });
        },
      }),
    );
  }
}
