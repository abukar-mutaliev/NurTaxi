import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tariff } from '../tariffs/entities/tariff.entity';
import { TariffCacheService } from '../tariffs/tariff-cache.service';
import type { CreateTariffDto, UpdateTariffDto } from './dto/admin.dto';

@Injectable()
export class AdminTariffsService {
  constructor(
    @InjectRepository(Tariff)
    private readonly tariffs: Repository<Tariff>,
    private readonly tariffCache: TariffCacheService,
  ) {}

  listByRegion(regionId: string): Promise<Tariff[]> {
    return this.tariffs.find({
      where: { regionId },
      order: { effectiveFrom: 'DESC' },
    });
  }

  async getTariff(id: string): Promise<Tariff> {
    const tariff = await this.tariffs.findOne({ where: { id } });
    if (!tariff) {
      throw new NotFoundException({ code: 'TARIFF_NOT_FOUND', message: 'Тариф не найден' });
    }
    return tariff;
  }

  async create(dto: CreateTariffDto): Promise<Tariff> {
    const tariff = await this.tariffs.save(
      this.tariffs.create({
        regionId: dto.regionId,
        name: dto.name,
        baseFare: String(dto.baseFare),
        pricePerKm: String(dto.pricePerKm),
        pricePerMin: String(dto.pricePerMin),
        minPrice: String(dto.minPrice),
        commissionPercent: String(dto.commissionPercent ?? 15),
        surgeRules: dto.surgeRules ?? {},
        cancellationPolicy: dto.cancellationPolicy ?? {},
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
        isActive: true,
      }),
    );
    await this.tariffCache.invalidateRegion(dto.regionId);
    return tariff;
  }

  async update(id: string, dto: UpdateTariffDto): Promise<Tariff> {
    const tariff = await this.getTariff(id);
    if (dto.name !== undefined) tariff.name = dto.name;
    if (dto.commissionPercent !== undefined) {
      tariff.commissionPercent = String(dto.commissionPercent);
    }
    if (dto.surgeRules !== undefined) tariff.surgeRules = dto.surgeRules;
    if (dto.cancellationPolicy !== undefined) tariff.cancellationPolicy = dto.cancellationPolicy;
    if (dto.isActive !== undefined) tariff.isActive = dto.isActive;
    const saved = await this.tariffs.save(tariff);
    await this.tariffCache.invalidateRegion(tariff.regionId);
    return saved;
  }
}
