import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { Role } from '../../common/enums/role.enum';
import { RealtimeLocationBridge } from '../realtime/realtime-location.bridge';
import { DriversService } from './drivers.service';
import { DriverDocument } from './entities/driver-document.entity';
import {
  PresignDocumentDto,
  RegisterDocumentDto,
  RegisterDriverDto,
  UpdateDriverStatusDto,
  UpdateWorkScheduleDto,
  UpdateDriverLocationDto,
} from './dto/drivers.dto';
import {
  DriverDocumentResponse,
  DriverEarningsResponse,
  DriverProfileResponse,
  RegionResponse,
} from './dto/driver.presenter';

@ApiTags('driver')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Driver)
@Controller('driver')
export class DriversController {
  constructor(
    private readonly driversService: DriversService,
    private readonly locationBridge: RealtimeLocationBridge,
  ) {}

  @Get('regions')
  @Roles(Role.Client, Role.Driver)
  @ApiOperation({ summary: 'Список активных регионов для регистрации' })
  async listRegions(): Promise<RegionResponse[]> {
    const regions = await this.driversService.listActiveRegions();
    return regions.map((r) => ({
      id: r.id,
      name: r.name,
      timezone: r.timezone,
      currency: r.currency,
    }));
  }

  @Post('register')
  @Roles(Role.Client, Role.Driver)
  @ApiOperation({ summary: 'Заполнение анкеты водителя (Req §8.2, этап 2)' })
  async register(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDriverDto,
  ): Promise<DriverProfileResponse> {
    const profile = await this.driversService.register(user.id, dto);
    return DriverProfileResponse.from(profile);
  }

  @Get('profile')
  @Roles(Role.Client, Role.Driver)
  @ApiOperation({ summary: 'Профиль водителя (Req §8.4)' })
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<DriverProfileResponse> {
    const profile = await this.driversService.getProfileByUserId(user.id);
    const docsWithUrls = await this.driversService.listDocuments(user.id, true);
    const documents = (docsWithUrls as Array<{ doc: DriverDocument; viewUrl: string }>).map(
      ({ doc, viewUrl }) => DriverDocumentResponse.from(doc, viewUrl),
    );
    return DriverProfileResponse.from(profile, documents);
  }

  @Post('documents/presign')
  @ApiOperation({ summary: 'Presigned URL для загрузки документа в S3' })
  presignDocument(@CurrentUser() user: AuthenticatedUser, @Body() dto: PresignDocumentDto) {
    return this.driversService.createDocumentUploadUrl(user.id, dto);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Регистрация загруженного документа (Req §8.2, этап 3)' })
  async registerDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDocumentDto,
  ): Promise<DriverDocumentResponse> {
    const doc = await this.driversService.registerDocument(user.id, dto);
    return DriverDocumentResponse.from(doc);
  }

  @Post('documents/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отправить комплект документов на проверку' })
  async submitDocuments(@CurrentUser() user: AuthenticatedUser): Promise<DriverProfileResponse> {
    const profile = await this.driversService.submitForReview(user.id);
    return DriverProfileResponse.from(profile);
  }

  @Patch('status')
  @ApiOperation({ summary: 'На линии / офлайн (Req §12.3)' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDriverStatusDto,
  ): Promise<DriverProfileResponse> {
    const profile = await this.driversService.updateOnlineStatus(user.id, dto.status);
    return DriverProfileResponse.from(profile);
  }

  @Patch('work-schedule')
  @ApiOperation({ summary: 'График работы водителя' })
  async updateWorkSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateWorkScheduleDto,
  ): Promise<DriverProfileResponse> {
    const profile = await this.driversService.updateWorkSchedule(user.id, dto.workSchedule);
    return DriverProfileResponse.from(profile);
  }

  @Patch('location')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление геопозиции (Redis GEO, Des §6.2)' })
  async updateLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDriverLocationDto,
  ): Promise<{ success: true }> {
    await this.locationBridge.updateAndBroadcast(user.id, dto.lat, dto.lng);
    return { success: true };
  }

  @Get('earnings')
  @ApiOperation({ summary: 'Доходы водителя (день/неделя/месяц)' })
  async getEarnings(@CurrentUser() user: AuthenticatedUser): Promise<DriverEarningsResponse> {
    return this.driversService.getEarnings(user.id);
  }
}
