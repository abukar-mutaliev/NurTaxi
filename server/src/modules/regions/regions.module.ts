import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Region } from './entities/region.entity';
import { City } from './entities/city.entity';
import { RegionsService } from './regions.service';
import { RegionCacheService } from './region-cache.service';
import { RegionsController } from './regions.controller';

/**
 * Регионы и города (Des §4.1, Req §6.3). Фаза 3.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Region, City])],
  controllers: [RegionsController],
  providers: [RegionsService, RegionCacheService],
  exports: [RegionsService, RegionCacheService, TypeOrmModule],
})
export class RegionsModule {}
