import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RegionsService } from './regions.service';
import { CityResponse, RegionResponse } from './dto/regions.presenter';

@ApiTags('regions')
@Controller('regions')
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Get()
  @ApiOperation({ summary: 'Список активных регионов (Req §6.3)' })
  async listRegions(): Promise<RegionResponse[]> {
    const regions = await this.regionsService.listActiveRegions();
    return regions.map(RegionResponse.from);
  }

  @Get(':id/cities')
  @ApiOperation({ summary: 'Города региона' })
  async listCities(@Param('id', ParseUUIDPipe) id: string): Promise<CityResponse[]> {
    await this.regionsService.getRegionOrThrow(id);
    const cities = await this.regionsService.listCitiesByRegion(id);
    return cities.map(CityResponse.from);
  }
}
