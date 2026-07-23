import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { Role } from '../../common/enums/role.enum';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Client, Role.Driver)
@Controller('me/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'In-app уведомления (Req §23)' })
  list(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: number) {
    return this.notifications.listForUser(user.id, limit ? Number(limit) : 50);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Количество непрочитанных' })
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.notifications.unreadCount(user.id);
    return { count };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Отметить все как прочитанные' })
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    await this.notifications.markAllRead(user.id);
    return { success: true };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Отметить уведомление прочитанным' })
  async markRead(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const note = await this.notifications.markRead(user.id, id);
    return note;
  }
}
