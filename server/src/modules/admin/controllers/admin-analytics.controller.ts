import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/auth/jwt-payload.interface';
import { Role } from '../../../common/enums/role.enum';
import { AdminAnalyticsService } from '../admin-analytics.service';
import type { AdminReportType } from '../dto/admin-analytics.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Operator, Role.RegionalAdmin, Role.SuperAdmin)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analytics: AdminAnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Сводная статистика и KPI по региону/периоду (§7.3, §21)' })
  summary(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('regionId') regionId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analytics.getSummary(actor, regionId, from, to);
  }

  @Get('reports/:type')
  @ApiOperation({ summary: 'Отчёт для экспорта: orders | drivers | finance (§21)' })
  report(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('type') type: AdminReportType,
    @Query('regionId') regionId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analytics.getReport(actor, type, regionId, from, to);
  }
}
