import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { Role } from '../../common/enums/role.enum';
import { PlacementPurpose } from '../../common/enums/compliance.enum';
import { PlacementService } from './placement.service';

class CreateSiteBody {
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsString() operator!: string;
  @IsString() address!: string;
  @IsString() regionCode!: string;
  @IsEnum(PlacementPurpose) purpose!: PlacementPurpose;
  @IsOptional() @IsString() contractRef?: string;
  @IsString() periodFrom!: string;
  @IsOptional() @IsString() periodTo?: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SuperAdmin)
@Controller('admin/placement-sites')
export class AdminPlacementController {
  constructor(private readonly placement: PlacementService) {}

  @Get()
  @ApiOperation({ summary: 'Реестр площадок размещения (FZ-09)' })
  list() {
    return this.placement.list();
  }

  @Get('export')
  @ApiOperation({ summary: 'Выгрузка реестра площадок для приложения к заявлению' })
  exportDoc() {
    return this.placement.exportDocument();
  }

  @Get('snapshot')
  @ApiOperation({ summary: 'Состояние размещения на дату' })
  snapshot(@Query('at') at?: string) {
    return this.placement.snapshotAt(at ?? new Date().toISOString().slice(0, 10));
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.placement.get(id);
  }

  @Post()
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateSiteBody) {
    return this.placement.create(dto, actor.id);
  }

  @Post(':id/components')
  attach(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { componentKey: string; notes?: string },
  ) {
    return this.placement.attachComponent(id, body.componentKey, body.notes ?? null, actor.id);
  }

  @Post(':id/subcontractors')
  addSub(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { name: string; role: string; periodFrom: string; periodTo?: string },
  ) {
    return this.placement.addSubcontractor(id, body, actor.id);
  }
}
