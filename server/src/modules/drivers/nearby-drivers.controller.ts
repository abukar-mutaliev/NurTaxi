import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { PASSENGER_ROLES } from '../../common/enums/role.enum';
import { NearbyDriverResponse, NearbyDriversQueryDto } from './dto/nearby-drivers.dto';
import { DriversService } from './drivers.service';

@ApiTags('geo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PASSENGER_ROLES)
@Controller('geo')
export class NearbyDriversController {
  constructor(private readonly drivers: DriversService) {}

  @Get('nearby-drivers')
  @ApiOperation({ summary: 'Ближайшие свободные водители для карты клиента' })
  async nearby(@Query() query: NearbyDriversQueryDto): Promise<NearbyDriverResponse[]> {
    const drivers = await this.drivers.listNearbyOnline(query.regionId, query.lat, query.lng);
    return drivers.map(NearbyDriverResponse.from);
  }
}
