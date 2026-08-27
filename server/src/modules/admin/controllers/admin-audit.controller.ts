import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/auth/jwt-payload.interface';
import { Role } from '../../../common/enums/role.enum';
import { AdminAuditService } from '../admin-audit.service';
import { AuditLogListResponse } from '../dto/audit.presenter';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SuperAdmin, Role.RegionalAdmin, Role.Regulator)
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly audit: AdminAuditService) {}

  @Get()
  @ApiOperation({ summary: 'Журнал действий администраторов (§20, FZ-08.8)' })
  async list(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('regionId') regionId?: string,
    @Query('resourceId') resourceId?: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ): Promise<AuditLogListResponse> {
    const page = await this.audit.listLogs(actor, {
      regionId,
      resourceId,
      actorId,
      action,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
    return AuditLogListResponse.from(page);
  }
}
