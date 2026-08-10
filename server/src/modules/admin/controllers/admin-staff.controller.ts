import {
  Body,
  Controller,
  Delete,
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
import { UserResponse } from '../../users/dto/user.presenter';
import { AdminStaffService } from '../admin-staff.service';
import { AdminScopeService } from '../admin-scope.service';
import { AssignStaffDto, BlockUserDto } from '../dto/admin.dto';

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
  async list(@Query('regionId') regionId?: string): Promise<UserResponse[]> {
    const users = await this.staffService.listStaff(regionId);
    return users.map(UserResponse.from);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Назначение роли и региона staff-пользователю' })
  async assign(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: AssignStaffDto,
  ): Promise<UserResponse> {
    this.scope.assertSuperAdmin(actor);
    const user = await this.staffService.assignStaff(dto);
    return UserResponse.from(user);
  }

  @Patch(':id/revoke')
  @ApiOperation({ summary: 'Отзыв прав администратора (возврат к роли client)' })
  async revoke(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponse> {
    this.scope.assertSuperAdmin(actor);
    const user = await this.staffService.revokeStaff(id, actor.id);
    return UserResponse.from(user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Блокировка/разблокировка staff-аккаунта' })
  async setStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BlockUserDto,
  ): Promise<UserResponse> {
    this.scope.assertSuperAdmin(actor);
    const user = await this.staffService.setStaffStatus(id, dto.status);
    return UserResponse.from(user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удаление staff-аккаунта' })
  async remove(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    this.scope.assertSuperAdmin(actor);
    await this.staffService.removeStaff(id, actor.id);
    return { success: true };
  }
}
