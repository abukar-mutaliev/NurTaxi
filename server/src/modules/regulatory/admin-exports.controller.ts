import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { Role } from '../../common/enums/role.enum';
import { ExportDateField, ExportFormat } from '../../common/enums/compliance.enum';
import { AdminScopeService } from '../admin/admin-scope.service';
import { RegulatoryExportService } from './regulatory-export.service';

class CreateExportBody {
  @IsString() legalBasis!: string;
  @IsString() requestRef!: string;
  @IsString() periodFrom!: string;
  @IsString() periodTo!: string;
  @IsOptional() @IsEnum(ExportDateField) dateField?: ExportDateField;
  @IsOptional() @IsUUID() regionId?: string;
  @IsOptional() @IsEnum(ExportFormat) format?: ExportFormat;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SuperAdmin, Role.RegionalAdmin, Role.Operator, Role.Regulator)
@Controller('admin/exports')
export class AdminExportsController {
  constructor(
    private readonly exports: RegulatoryExportService,
    private readonly scope: AdminScopeService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Асинхронная регуляторная выгрузка журнала (FZ-05, FZ-10)' })
  async create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateExportBody) {
    const regionId = await this.scope.resolveListRegionId(actor, dto.regionId);
    const job = await this.exports.enqueue(actor, { ...dto, regionId });
    await this.exports.disclose(actor, job.id);
    return job;
  }

  @Get()
  list(@Query('regionId') regionId?: string) {
    return this.exports.list(regionId);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.exports.get(id);
  }

  @Get(':id/download')
  download(@Param('id', ParseUUIDPipe) id: string) {
    return this.exports.downloadUrl(id);
  }
}
