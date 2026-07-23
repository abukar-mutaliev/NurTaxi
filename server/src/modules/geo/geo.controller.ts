import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { GeoSearchQueryDto } from './dto/geo.dto';
import { GeoService } from './geo.service';
import { AddressSuggestionResponse } from './dto/geo.presenter';

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
}
