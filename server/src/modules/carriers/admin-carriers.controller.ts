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
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { Role } from '../../common/enums/role.enum';
import { AdminScopeService } from '../admin/admin-scope.service';
import { CarriersService } from './carriers.service';

class CreateCarrierBody {
  @IsString() @MinLength(2) @MaxLength(240) name!: string;
  @IsString() @MaxLength(32) legalForm!: string;
  @IsString() @MinLength(10) @MaxLength(12) inn!: string;
  @IsString() @MinLength(13) @MaxLength(15) ogrn!: string;
  @IsString() address!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsUUID() regionId!: string;
}

class CreatePermitBody {
  @IsString() number!: string;
  @IsString() issuedBy!: string;
  @IsString() issuedAt!: string;
  @IsOptional() @IsString() expiresAt?: string;
  @IsUUID() carrierId!: string;
  @IsUUID() vehicleId!: string;
}

class CreateAssignmentBody {
  @IsUUID() driverId!: string;
  @IsUUID() carrierId!: string;
  @IsOptional() @IsUUID() vehicleId?: string;
  @IsOptional() @IsString() basis?: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Operator, Role.RegionalAdmin, Role.SuperAdmin)
@Controller('admin/carriers')
export class AdminCarriersController {
  constructor(
    private readonly carriers: CarriersService,
    private readonly scope: AdminScopeService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Реестр перевозчиков (FZ-04.1)' })
  async list(@CurrentUser() actor: AuthenticatedUser, @Query('regionId') regionId?: string) {
    const scoped = await this.scope.resolveListRegionId(actor, regionId);
    return this.carriers.listCarriers(scoped);
  }

  @Get('permits/expiring')
  @ApiOperation({ summary: 'Истекающие разрешения (FZ-06.5)' })
  async expiring(@CurrentUser() actor: AuthenticatedUser, @Query('regionId') regionId?: string) {
    const scoped = await this.scope.resolveListRegionId(actor, regionId);
    return this.carriers.listExpiringPermits(scoped);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Карточка перевозчика' })
  async getOne(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const carrier = await this.carriers.getCarrier(id);
    await this.scope.assertRegionAccess(actor, carrier.regionId);
    return carrier;
  }

  @Post()
  @Roles(Role.SuperAdmin, Role.RegionalAdmin)
  @ApiOperation({ summary: 'Создание перевозчика' })
  async create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateCarrierBody) {
    await this.scope.assertRegionAccess(actor, dto.regionId);
    return this.carriers.createCarrier(dto);
  }

  @Patch(':id')
  @Roles(Role.SuperAdmin, Role.RegionalAdmin)
  async update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateCarrierBody>,
  ) {
    const carrier = await this.carriers.getCarrier(id);
    await this.scope.assertRegionAccess(actor, carrier.regionId);
    return this.carriers.updateCarrier(id, dto);
  }

  @Post('permits')
  @Roles(Role.SuperAdmin, Role.RegionalAdmin, Role.Operator)
  async createPermit(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreatePermitBody) {
    const carrier = await this.carriers.getCarrier(dto.carrierId);
    await this.scope.assertRegionAccess(actor, carrier.regionId);
    return this.carriers.createPermit(dto);
  }

  @Post('assignments')
  @Roles(Role.SuperAdmin, Role.RegionalAdmin, Role.Operator)
  async assign(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateAssignmentBody) {
    const carrier = await this.carriers.getCarrier(dto.carrierId);
    await this.scope.assertRegionAccess(actor, carrier.regionId);
    return this.carriers.assignDriver(dto);
  }
}
