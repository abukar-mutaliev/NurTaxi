import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegionsModule } from '../regions/regions.module';
import { PromoCode } from './entities/promo-code.entity';
import { PromoRedemption } from './entities/promo-redemption.entity';
import { BonusAccount } from './entities/bonus-account.entity';
import { BonusTransaction } from './entities/bonus-transaction.entity';
import { PromoService } from './promo.service';
import { PromoController } from './promo.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PromoCode, PromoRedemption, BonusAccount, BonusTransaction]),
    RegionsModule,
  ],
  controllers: [PromoController],
  providers: [PromoService],
  exports: [PromoService],
})
export class PromoModule {}
