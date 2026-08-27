import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Region } from './entities/region.entity';
import { City } from './entities/city.entity';
import { RegionCacheService } from './region-cache.service';

@Injectable()
export class RegionsService {
  constructor(
    @InjectRepository(Region)
    private readonly regions: Repository<Region>,
    @InjectRepository(City)
    private readonly cities: Repository<City>,
    private readonly cache: RegionCacheService,
  ) {}

  listActiveRegions(): Promise<Region[]> {
    return this.regions.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  /**
   * Регион без фильтра по `isActive` и без кеша: нужен фоновым проверкам (например,
   * требованиям к анкете водителя), которые не должны ломаться после отключения региона.
   */
  findById(id: string): Promise<Region | null> {
    return this.regions.findOne({ where: { id } });
  }

  async getRegionOrThrow(id: string): Promise<Region> {
    const cached = await this.cache.get<Region>(id);
    if (cached) return cached;

    const region = await this.regions.findOne({ where: { id, isActive: true } });
    if (!region) {
      throw new NotFoundException({ code: 'REGION_NOT_FOUND', message: 'Регион не найден' });
    }

    await this.cache.set(id, region);
    return region;
  }

  listCitiesByRegion(regionId: string): Promise<City[]> {
    return this.cities.find({
      where: { regionId, isActive: true },
      order: { name: 'ASC' },
    });
  }
}
