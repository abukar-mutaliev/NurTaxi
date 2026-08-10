import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/auth/jwt-payload.interface';
import { Role } from '../../../common/enums/role.enum';
import { AdminComplaintsService } from '../admin-complaints.service';
import type { AdminComplaintResponse } from '../dto/admin-complaints.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Operator, Role.RegionalAdmin, Role.SuperAdmin)
@Controller('admin/complaints')
export class AdminComplaintsController {
  constructor(private readonly complaints: AdminComplaintsService) {}

  @Get()
  @ApiOperation({ summary: 'Жалобы и обращения по региону (Req §7.4, §8.14)' })
  list(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('regionId') regionId?: string,
  ): Promise<AdminComplaintResponse[]> {
    return this.complaints.list(actor, regionId);
  }
}
