import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RegistrySubjectType } from '../../common/enums/compliance.enum';
import { TaxiRegistryService } from './taxi-registry.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Operator, Role.RegionalAdmin, Role.SuperAdmin)
@Controller('admin/registry-checks')
export class AdminTaxiRegistryController {
  constructor(private readonly registry: TaxiRegistryService) {}

  @Get(':subjectType/:subjectId')
  @ApiOperation({ summary: 'История проверок в реестре такси (FZ-06.4, FZ-06.9)' })
  history(
    @Param('subjectType') subjectType: RegistrySubjectType,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
  ) {
    return this.registry.history(subjectType, subjectId);
  }

  @Post('recheck')
  @Roles(Role.SuperAdmin, Role.RegionalAdmin)
  @ApiOperation({ summary: 'Периодическая перепроверка действующих разрешений' })
  recheck() {
    return this.registry.recheckActive();
  }
}
