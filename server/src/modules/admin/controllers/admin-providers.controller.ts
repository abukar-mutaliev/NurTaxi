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
import { Role } from '../../../common/enums/role.enum';
import { AdminProvidersService } from '../admin-providers.service';
import { AdminScopeService } from '../admin-scope.service';
import { CreateProviderDto, UpdateProviderDto } from '../dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SuperAdmin)
@Controller('admin/providers')
export class AdminProvidersController {
  constructor(
    private readonly providersService: AdminProvidersService,
    private readonly scope: AdminScopeService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Провайдеры payment/sms/maps по регионам (§7.2)' })
  async list(@Query('regionId') regionId?: string) {
    return this.providersService.list(regionId);
  }

  @Post()
  @ApiOperation({ summary: 'Подключение провайдера' })
  create(@Body() dto: CreateProviderDto) {
    return this.providersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновление провайдера' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProviderDto) {
    return this.providersService.update(id, dto);
  }
}
