import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { UsersService, CURRENT_CONSENT_VERSION } from './users.service';
import { ConfirmProfilePhotoDto, PresignProfilePhotoDto } from './dto/profile-photo.dto';
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
    const profile = await this.usersService.getByIdOrThrow(user.id);
    return UserResponse.from(await this.usersService.withResolvedPhotoUrl(profile));
  }

  @Patch()
  @ApiOperation({ summary: 'Редактирование профиля (имя, фото, язык, настройки)' })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponse> {
    const profile = await this.usersService.updateProfile(user.id, dto);
    return UserResponse.from(await this.usersService.withResolvedPhotoUrl(profile));
  }

  @Post('photo/presign')
  @ApiOperation({ summary: 'Presigned URL для загрузки фото профиля в S3' })
  presignPhoto(@CurrentUser() user: AuthenticatedUser, @Body() dto: PresignProfilePhotoDto) {
    return this.usersService.createPhotoUploadUrl(user.id, dto);
  }

  @Post('photo/confirm')
  @ApiOperation({ summary: 'Подтверждение загруженного фото профиля' })
  async confirmPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmProfilePhotoDto,
  ): Promise<UserResponse> {
    const profile = await this.usersService.confirmPhotoUpload(user.id, dto);
    return UserResponse.from(profile);
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
