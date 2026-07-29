import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { Role } from '../../common/enums/role.enum';
import { RegisterPushTokenDto, UnregisterPushTokenDto } from './dto/push-token.dto';
import { PushTokensService } from './push-tokens.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Client, Role.Driver)
@Controller('me/push-tokens')
export class PushTokensController {
  constructor(private readonly pushTokens: PushTokensService) {}

  @Post()
  @ApiOperation({ summary: 'Регистрация push-токена устройства (Req §23)' })
  async register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterPushTokenDto) {
    const record = await this.pushTokens.register(user.id, dto.token, dto.platform, dto.deviceId);
    return { success: true, id: record.id };
  }

  @Delete()
  @ApiOperation({ summary: 'Удаление push-токена при выходе или отзыве разрешения' })
  async unregister(@CurrentUser() user: AuthenticatedUser, @Body() dto: UnregisterPushTokenDto) {
    await this.pushTokens.unregister(user.id, dto.token);
    return { success: true };
  }
}
