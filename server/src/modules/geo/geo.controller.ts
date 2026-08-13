import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { GeoRouteQueryDto, GeoSearchQueryDto } from './dto/geo.dto';
import { GeoService } from './geo.service';
import { AddressSuggestionResponse, GeoRouteResponse } from './dto/geo.presenter';

@ApiTags('geo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('search')
  @ApiOperation({ summary: 'Поиск адресов (Req §8.9)' })
  async search(@Query() query: GeoSearchQueryDto): Promise<AddressSuggestionResponse[]> {
    const results = await this.geoService.search({
      query: query.q,
      regionId: query.regionId,
      lat: query.lat,
      lng: query.lng,
      limit: query.limit,
    });
    return results.map(AddressSuggestionResponse.from);
  }

  @Get('route')
  @ApiOperation({ summary: 'Дорожный маршрут A→B для навигатора (Req §8.10)' })
  async route(@Query() query: GeoRouteQueryDto): Promise<GeoRouteResponse> {
    const result = await this.geoService.route({
      originLat: query.originLat,
      originLng: query.originLng,
      destLat: query.destLat,
      destLng: query.destLng,
    });
    return result
      ? GeoRouteResponse.from(result)
      : { polyline: '', distanceM: 0, durationS: 0 };
  }
}
