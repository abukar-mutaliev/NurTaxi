import {
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
import { AdminRegionsService } from '../admin-regions.service';
import { AdminScopeService } from '../admin-scope.service';
import { CreateCityDto, CreateRegionDto, UpdateCityDto, UpdateRegionDto } from '../dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SuperAdmin)
@Controller('admin/regions')
export class AdminRegionsController {
  constructor(
    private readonly regionsService: AdminRegionsService,
    private readonly scope: AdminScopeService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Список регионов (super_admin)' })
  list(@Query('includeInactive') includeInactive?: string) {
    return this.regionsService.listRegions(includeInactive === 'true');
  }

  @Post()
  @ApiOperation({ summary: 'Создание региона' })
  create(@Body() dto: CreateRegionDto) {
    return this.regionsService.createRegion(dto);
  }

  @Get(':id')
  @Roles(Role.SuperAdmin, Role.RegionalAdmin, Role.Operator)
  @ApiOperation({ summary: 'Детали региона (super_admin или staff своего региона)' })
  async getOne(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.scope.assertRegionAccess(actor, id);
    return this.regionsService.getRegion(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновление региона (feature-flags, §7.6)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRegionDto) {
    return this.regionsService.updateRegion(id, dto);
  }

  @Get(':regionId/cities')
  @Roles(Role.SuperAdmin, Role.RegionalAdmin, Role.Operator)
  @ApiOperation({ summary: 'Города региона' })
  async listCities(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('regionId', ParseUUIDPipe) regionId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    await this.scope.assertRegionAccess(actor, regionId);
    return this.regionsService.listCities(regionId, includeInactive === 'true');
  }

  @Post(':regionId/cities')
  @ApiOperation({ summary: 'Создание города' })
  createCity(@Param('regionId', ParseUUIDPipe) regionId: string, @Body() dto: CreateCityDto) {
    return this.regionsService.createCity(regionId, dto);
  }

  @Patch(':regionId/cities/:cityId')
  @ApiOperation({ summary: 'Обновление города' })
  async updateCity(@Param('cityId', ParseUUIDPipe) cityId: string, @Body() dto: UpdateCityDto) {
    return this.regionsService.updateCity(cityId, dto);
  }
}
