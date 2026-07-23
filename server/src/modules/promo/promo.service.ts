import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BonusTransactionType, PromoDiscountType } from '../../common/enums/phase8.enum';
import { EventBusService } from '../../messaging/event-bus.service';
import { RegionsService } from '../regions/regions.service';
import { PromoCode } from './entities/promo-code.entity';
import { PromoRedemption } from './entities/promo-redemption.entity';
import { BonusAccount } from './entities/bonus-account.entity';
import { BonusTransaction } from './entities/bonus-transaction.entity';

@Injectable()
export class PromoService {
  constructor(
    @InjectRepository(PromoCode)
    private readonly promoCodes: Repository<PromoCode>,
    @InjectRepository(PromoRedemption)
    private readonly redemptions: Repository<PromoRedemption>,
    @InjectRepository(BonusAccount)
    private readonly bonusAccounts: Repository<BonusAccount>,
    @InjectRepository(BonusTransaction)
    private readonly bonusTx: Repository<BonusTransaction>,
    private readonly regionsService: RegionsService,
    private readonly eventBus: EventBusService,
  ) {}

  async getBalance(userId: string): Promise<{ balance: number; currency: string }> {
    const account = await this.bonusAccounts.findOne({ where: { userId } });
    return {
      balance: account ? Number(account.balance) : 0,
      currency: account?.currency ?? 'RUB',
    };
  }

  async redeem(userId: string, regionId: string, code: string): Promise<{ bonusAmount: number }> {
    const region = await this.regionsService.getRegionOrThrow(regionId);
    if (!region.featureFlags?.promo_enabled) {
      throw new BadRequestException({
        code: 'FEATURE_DISABLED',
        message: 'Промокоды недоступны в этом регионе',
      });
    }

    const promo = await this.promoCodes.findOne({
      where: { regionId, code: code.toUpperCase(), isActive: true },
    });
    if (!promo) {
      throw new NotFoundException({ code: 'PROMO_NOT_FOUND', message: 'Промокод не найден' });
    }

    const now = new Date();
    if (promo.validFrom > now || (promo.validUntil && promo.validUntil < now)) {
      throw new BadRequestException({ code: 'PROMO_EXPIRED', message: 'Промокод недействителен' });
    }

    if (promo.maxRedemptions !== null && promo.redemptionCount >= promo.maxRedemptions) {
      throw new ConflictException({ code: 'PROMO_EXHAUSTED', message: 'Лимит промокода исчерпан' });
    }

    const used = await this.redemptions.findOne({
      where: { promoCodeId: promo.id, userId },
    });
    if (used) {
      throw new ConflictException({
        code: 'PROMO_ALREADY_USED',
        message: 'Промокод уже использован',
      });
    }

    const bonusAmount =
      promo.discountType === PromoDiscountType.Bonus ? Number(promo.discountValue) : 0;

    if (bonusAmount <= 0) {
      throw new BadRequestException({
        code: 'PROMO_NOT_BONUS',
        message: 'Этот промокод не пополняет бонусный баланс',
      });
    }

    promo.redemptionCount += 1;
    await this.promoCodes.save(promo);

    await this.redemptions.save(
      this.redemptions.create({
        promoCodeId: promo.id,
        userId,
        bonusAmount: String(bonusAmount),
      }),
    );

    await this.creditBonus(userId, bonusAmount, region.currency, promo.id);

    this.eventBus.publish('promo.redeemed', { userId, promoCodeId: promo.id, bonusAmount });
    return { bonusAmount };
  }

  private async creditBonus(
    userId: string,
    amount: number,
    currency: string,
    promoId: string,
  ): Promise<void> {
    let account = await this.bonusAccounts.findOne({ where: { userId } });
    if (!account) {
      account = await this.bonusAccounts.save(
        this.bonusAccounts.create({ userId, balance: '0', currency }),
      );
    }

    const balanceAfter = Number(account.balance) + amount;
    account.balance = String(balanceAfter);
    await this.bonusAccounts.save(account);

    await this.bonusTx.save(
      this.bonusTx.create({
        userId,
        type: BonusTransactionType.Credit,
        amount: String(amount),
        balanceAfter: String(balanceAfter),
        refType: 'promo',
        refId: promoId,
        description: 'Promo redemption',
      }),
    );
  }
}
