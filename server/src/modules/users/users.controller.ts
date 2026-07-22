import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { UsersService, CURRENT_CONSENT_VERSION } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ConsentDto } from './dto/consent.dto';
import { UserResponse } from './dto/user.presenter';

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Профиль текущего пользователя' })
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserResponse> {
    return UserResponse.from(await this.usersService.getByIdOrThrow(user.id));
  }

  @Patch()
  @ApiOperation({ summary: 'Редактирование профиля (имя, фото, язык, настройки)' })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponse> {
    return UserResponse.from(await this.usersService.updateProfile(user.id, dto));
  }

  @Post('consent')
  @ApiOperation({ summary: 'Согласие на обработку персональных данных (152-ФЗ)' })
  async giveConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConsentDto,
  ): Promise<UserResponse> {
    const version = dto.version ?? CURRENT_CONSENT_VERSION;
    return UserResponse.from(await this.usersService.recordConsent(user.id, version));
  }
}
