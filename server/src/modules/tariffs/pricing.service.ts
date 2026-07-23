import { Injectable } from '@nestjs/common';
import type { Region } from '../regions/entities/region.entity';
import type { Tariff } from './entities/tariff.entity';

export interface PriceBreakdown {
  baseFare: number;
  distancePart: number;
  timePart: number;
  minPriceApplied: boolean;
  surgeMultiplier: number;
  subtotal: number;
  estimated: number;
  currency: string;
}

export interface RouteInput {
  distanceM: number;
  durationS: number;
}

/**
 * Расчёт стоимости поездки (Des §7, Req §22).
 * Формула: base + km*price_km + min*price_min, не ниже min_price, surge по флагу региона.
 */
@Injectable()
export class PricingService {
  calculate(tariff: Tariff, region: Region, route: RouteInput): PriceBreakdown {
    const baseFare = Number(tariff.baseFare);
    const pricePerKm = Number(tariff.pricePerKm);
    const pricePerMin = Number(tariff.pricePerMin);
    const minPrice = Number(tariff.minPrice);

    const km = route.distanceM / 1000;
    const minutes = route.durationS / 60;

    const distancePart = round2(km * pricePerKm);
    const timePart = round2(minutes * pricePerMin);
    let subtotal = round2(baseFare + distancePart + timePart);

    const minPriceApplied = subtotal < minPrice;
    if (minPriceApplied) {
      subtotal = minPrice;
    }

    let surgeMultiplier = 1;
    const surgeEnabled =
      region.featureFlags?.surge_pricing === true && tariff.surgeRules?.enabled === true;

    if (surgeEnabled && tariff.surgeRules.multiplier) {
      surgeMultiplier = tariff.surgeRules.multiplier;
    }

    const estimated = round2(subtotal * surgeMultiplier);

    return {
      baseFare,
      distancePart,
      timePart,
      minPriceApplied,
      surgeMultiplier,
      subtotal,
      estimated,
      currency: region.currency,
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
