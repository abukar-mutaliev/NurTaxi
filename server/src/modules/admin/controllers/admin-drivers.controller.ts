import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { VerificationStatus } from '../../../common/enums/verification-status.enum';
import { DriversService } from '../../drivers/drivers.service';
import { ModerateDocumentDto } from '../../drivers/dto/drivers.dto';
import { DriverDocumentResponse, DriverProfileResponse } from '../../drivers/dto/driver.presenter';
import { AdminScopeService } from '../admin-scope.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Operator, Role.RegionalAdmin, Role.SuperAdmin)
@Controller('admin/drivers')
export class AdminDriversController {
  constructor(
    private readonly driversService: DriversService,
    private readonly scope: AdminScopeService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Список водителей для верификации (Req §7.3, §8.2)' })
  async listDrivers(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('verificationStatus') verificationStatus?: VerificationStatus,
    @Query('regionId') regionId?: string,
  ): Promise<DriverProfileResponse[]> {
    const scopedRegionId = await this.scope.resolveListRegionId(actor, regionId);
    const drivers = await this.driversService.listDriversForModeration(
      verificationStatus,
      scopedRegionId,
    );
    return Promise.all(
      drivers.map(async (driver) => {
        const docs = await Promise.all(
          (driver.documents ?? []).map(async (doc) => {
            const { downloadUrl } = await this.driversService.getDocumentDownloadUrl(
              driver.id,
              doc.id,
            );
            return DriverDocumentResponse.from(doc, downloadUrl);
          }),
        );
        return DriverProfileResponse.from(driver, docs);
      }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Карточка водителя для модерации' })
  async getDriver(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DriverProfileResponse> {
    const driver = await this.driversService.getDriverForModeration(id);
    await this.scope.assertRegionAccess(actor, driver.regionId);
    const docs = await Promise.all(
      (driver.documents ?? []).map(async (doc) => {
        const { downloadUrl } = await this.driversService.getDocumentDownloadUrl(driver.id, doc.id);
        return DriverDocumentResponse.from(doc, downloadUrl);
      }),
    );
    return DriverProfileResponse.from(driver, docs);
  }

  @Patch(':driverId/documents/:documentId')
  @ApiOperation({ summary: 'Ручная модерация документа (Req §8.2, §7.5)' })
  async moderateDocument(
    @CurrentUser() moderator: AuthenticatedUser,
    @Param('driverId', ParseUUIDPipe) driverId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: ModerateDocumentDto,
  ): Promise<DriverDocumentResponse> {
    const driver = await this.driversService.getDriverForModeration(driverId);
    await this.scope.assertRegionAccess(moderator, driver.regionId);

    const doc = await this.driversService.moderateDocument(
      moderator.id,
      driverId,
      documentId,
      dto.status,
      dto.rejectionReason,
    );
    const { downloadUrl } = await this.driversService.getDocumentDownloadUrl(driverId, doc.id);
    return DriverDocumentResponse.from(doc, downloadUrl);
  }
}
