import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/auth/jwt-payload.interface';
import { Role } from '../../../common/enums/role.enum';
import { AdminTariffsService } from '../admin-tariffs.service';
import { AdminScopeService } from '../admin-scope.service';
import { CreateTariffDto, UpdateTariffDto } from '../dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SuperAdmin, Role.RegionalAdmin)
@Controller('admin/tariffs')
export class AdminTariffsController {
  constructor(
    private readonly tariffsService: AdminTariffsService,
    private readonly scope: AdminScopeService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Тарифы региона (§7.1, §7.6 cancellation_policy)' })
  async list(@CurrentUser() actor: AuthenticatedUser, @Query('regionId') regionId?: string) {
    const scopedRegionId = await this.scope.resolveListRegionId(actor, regionId);
    if (!scopedRegionId) {
      throw new BadRequestException({
        code: 'REGION_ID_REQUIRED',
        message: 'Укажите regionId',
      });
    }
    return this.tariffsService.listByRegion(scopedRegionId);
  }

  @Post()
  @ApiOperation({ summary: 'Создание тарифа' })
  async create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateTariffDto) {
    await this.scope.assertRegionAccess(actor, dto.regionId);
    return this.tariffsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновление тарифа (комиссия, политика отмены)' })
  async update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTariffDto,
  ) {
    const tariff = await this.tariffsService.getTariff(id);
    await this.scope.assertRegionAccess(actor, tariff.regionId);
    return this.tariffsService.update(id, dto);
  }
}
