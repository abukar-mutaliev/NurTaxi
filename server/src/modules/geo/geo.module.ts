import { Module } from '@nestjs/common';
import { GeoCacheService } from './geo-cache.service';
import { GeoService } from './geo.service';
import { GeoController } from './geo.controller';
import { MAP_PROVIDER } from './map/map-provider.interface';
import { StubMapProvider } from './map/stub-map.provider';

/**
 * Geo & Routing (Des §2.3, §7): поиск адресов, MapProvider-адаптер, кэш Redis.
 * Фаза 3 (Req §8.9, §8.10, §22).
 */
@Module({
  controllers: [GeoController],
  providers: [
    GeoCacheService,
    GeoService,
    StubMapProvider,
    { provide: MAP_PROVIDER, useExisting: StubMapProvider },
  ],
  exports: [GeoService, MAP_PROVIDER, StubMapProvider],
})
export class GeoModule {}
