import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tariff } from './entities/tariff.entity';
import { TariffsService } from './tariffs.service';
import { TariffCacheService } from './tariff-cache.service';
import { PricingService } from './pricing.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tariff])],
  providers: [TariffsService, TariffCacheService, PricingService],
  exports: [TariffsService, TariffCacheService, PricingService, TypeOrmModule],
})
export class TariffsModule {}
