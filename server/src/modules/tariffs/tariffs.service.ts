import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Tariff } from './entities/tariff.entity';
import { TariffCacheService } from './tariff-cache.service';

@Injectable()
export class TariffsService {
  constructor(
    @InjectRepository(Tariff)
    private readonly tariffs: Repository<Tariff>,
    private readonly cache: TariffCacheService,
  ) {}

  /**
   * Актуальный тариф региона на текущий момент (max effective_from <= now).
   */
  async getEffectiveTariff(regionId: string, tariffId?: string): Promise<Tariff> {
    const cached = await this.cache.get<Tariff>(regionId, tariffId);
    if (cached) return cached;

    let tariff: Tariff;

    if (tariffId) {
      const specific = await this.tariffs.findOne({
        where: { id: tariffId, regionId, isActive: true },
        relations: ['region'],
      });
      if (!specific) {
        throw new NotFoundException({ code: 'TARIFF_NOT_FOUND', message: 'Тариф не найден' });
      }
      tariff = specific;
    } else {
      const found = await this.tariffs.findOne({
        where: {
          regionId,
          isActive: true,
          effectiveFrom: LessThanOrEqual(new Date()),
        },
        relations: ['region'],
        order: { effectiveFrom: 'DESC' },
      });

      if (!found) {
        throw new NotFoundException({
          code: 'TARIFF_NOT_FOUND',
          message: 'Для региона не настроен тариф',
        });
      }
      tariff = found;
    }

    await this.cache.set(regionId, tariffId, tariff);
    return tariff;
  }

  listActiveByRegion(regionId: string): Promise<Tariff[]> {
    return this.tariffs.find({
      where: { regionId, isActive: true, effectiveFrom: LessThanOrEqual(new Date()) },
      order: { effectiveFrom: 'DESC' },
    });
  }
}
