import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/auth/jwt-payload.interface';
import { Role } from '../../../common/enums/role.enum';
import { AdminStaffService } from '../admin-staff.service';
import { AdminScopeService } from '../admin-scope.service';
import { AssignStaffDto } from '../dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SuperAdmin)
@Controller('admin/staff')
export class AdminStaffController {
  constructor(
    private readonly staffService: AdminStaffService,
    private readonly scope: AdminScopeService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Список операторов и региональных админов (§7.1)' })
  list(@Query('regionId') regionId?: string) {
    return this.staffService.listStaff(regionId);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Назначение роли и региона staff-пользователю' })
  assign(@CurrentUser() actor: AuthenticatedUser, @Body() dto: AssignStaffDto) {
    this.scope.assertSuperAdmin(actor);
    return this.staffService.assignStaff(dto);
  }
}
