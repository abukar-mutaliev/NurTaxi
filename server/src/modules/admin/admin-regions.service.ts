import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DriverRequirementKey,
  RequirementMode,
  type DriverRequirements,
} from '../../common/enums/driver-requirement.enum';
import { Region } from '../regions/entities/region.entity';
import { City } from '../regions/entities/city.entity';
import { RegionCacheService } from '../regions/region-cache.service';
import type {
  CreateCityDto,
  CreateRegionDto,
  UpdateCityDto,
  UpdateRegionDto,
} from './dto/admin.dto';

/**
 * Опечатка в ключе или режиме молча отключила бы требование в регионе, поэтому
 * неизвестные значения отклоняем, а не вычищаем при чтении.
 */
function assertKnownRequirements(input: Partial<DriverRequirements>): Partial<DriverRequirements> {
  const keys = Object.values(DriverRequirementKey) as string[];
  const modes = Object.values(RequirementMode) as string[];

  for (const [key, mode] of Object.entries(input)) {
    if (!keys.includes(key)) {
      throw new BadRequestException({
        code: 'UNKNOWN_DRIVER_REQUIREMENT',
        message: `Неизвестное требование «${key}»`,
        details: { allowedKeys: keys },
      });
    }
    if (typeof mode !== 'string' || !modes.includes(mode)) {
      throw new BadRequestException({
        code: 'INVALID_REQUIREMENT_MODE',
        message: `Недопустимый режим требования «${key}»`,
        details: { allowedModes: modes },
      });
    }
  }

  return input;
}

@Injectable()
export class AdminRegionsService {
  constructor(
    @InjectRepository(Region)
    private readonly regions: Repository<Region>,
    @InjectRepository(City)
    private readonly cities: Repository<City>,
    private readonly regionCache: RegionCacheService,
  ) {}

  listRegions(includeInactive = false): Promise<Region[]> {
    return this.regions.find({
      where: includeInactive ? {} : { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getRegion(id: string): Promise<Region> {
    const region = await this.regions.findOne({ where: { id } });
    if (!region) {
      throw new NotFoundException({ code: 'REGION_NOT_FOUND', message: 'Регион не найден' });
    }
    return region;
  }

  createRegion(dto: CreateRegionDto): Promise<Region> {
    return this.regions.save(
      this.regions.create({
        name: dto.name,
        timezone: dto.timezone ?? 'Europe/Moscow',
        currency: dto.currency ?? 'RUB',
        featureFlags: dto.featureFlags ?? {},
        driverRequirements: assertKnownRequirements(dto.driverRequirements ?? {}),
        complianceConfig: dto.complianceConfig ?? {},
        isActive: true,
      }),
    );
  }

  async updateRegion(id: string, dto: UpdateRegionDto): Promise<Region> {
    const region = await this.getRegion(id);
    if (dto.name !== undefined) region.name = dto.name;
    if (dto.timezone !== undefined) region.timezone = dto.timezone;
    if (dto.currency !== undefined) region.currency = dto.currency;
    if (dto.featureFlags !== undefined) region.featureFlags = dto.featureFlags;
    if (dto.driverRequirements !== undefined) {
      // Требования пишутся целиком: админ-панель всегда шлёт полную карту режимов.
      region.driverRequirements = assertKnownRequirements(dto.driverRequirements);
    }
    if (dto.isActive !== undefined) region.isActive = dto.isActive;
    if (dto.complianceConfig !== undefined) region.complianceConfig = dto.complianceConfig;
    const saved = await this.regions.save(region);
    await this.regionCache.invalidate(id);
    return saved;
  }

  listCities(regionId: string, includeInactive = false): Promise<City[]> {
    return this.cities.find({
      where: includeInactive ? { regionId } : { regionId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getCity(id: string): Promise<City> {
    const city = await this.cities.findOne({ where: { id } });
    if (!city) {
      throw new NotFoundException({ code: 'CITY_NOT_FOUND', message: 'Город не найден' });
    }
    return city;
  }

  async createCity(regionId: string, dto: CreateCityDto): Promise<City> {
    await this.getRegion(regionId);
    return this.cities.save(
      this.cities.create({
        regionId,
        name: dto.name,
        centerLat: dto.centerLat ?? null,
        centerLng: dto.centerLng ?? null,
        isActive: true,
      }),
    );
  }

  async updateCity(id: string, dto: UpdateCityDto): Promise<City> {
    const city = await this.getCity(id);
    if (dto.name !== undefined) city.name = dto.name;
    if (dto.centerLat !== undefined) city.centerLat = dto.centerLat;
    if (dto.centerLng !== undefined) city.centerLng = dto.centerLng;
    if (dto.isActive !== undefined) city.isActive = dto.isActive;
    return this.cities.save(city);
  }
}
