import { PricingService } from './pricing.service';
import type { Tariff } from './entities/tariff.entity';
import type { Region } from '../regions/entities/region.entity';

describe('PricingService', () => {
  const service = new PricingService();

  const region: Region = {
    id: 'region-1',
    name: 'Ингушетия',
    isActive: true,
    timezone: 'Europe/Moscow',
    currency: 'RUB',
    featureFlags: { surge_pricing: false },
    driverRequirements: {},
    complianceConfig: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tariff: Tariff = {
    id: 'tariff-1',
    regionId: region.id,
    name: 'Стандарт',
    baseFare: '99',
    pricePerKm: '18',
    pricePerMin: '5',
    minPrice: '149',
    surgeRules: { enabled: false, multiplier: 1.5 },
    commissionPercent: '15',
    cancellationPolicy: {},
    effectiveFrom: new Date('2026-01-01'),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Tariff;

  it('считает стоимость по формуле base + km + min и округляет до десятков', () => {
    const result = service.calculate(tariff, region, { distanceM: 5000, durationS: 900 });
    // 99 + 5*18 + 15*5 = 99+90+75 = 264 → 260
    expect(result.subtotal).toBe(264);
    expect(result.estimated).toBe(260);
    expect(result.currency).toBe('RUB');
  });

  it('округляет копейки и рубли до ближайшего десятка', () => {
    // 99 + 7,63*18 + 18,6*5 = 99 + 137,34 + 93 = 329,34 → 330
    expect(service.calculate(tariff, region, { distanceM: 7630, durationS: 1116 }).estimated).toBe(
      330,
    );
    // 99 + 7,1*18 + 13,08*5 = 99 + 127,8 + 65,4 = 292,2 → 290
    expect(service.calculate(tariff, region, { distanceM: 7100, durationS: 784.8 }).estimated).toBe(
      290,
    );
  });

  it('применяет min_price если расчёт ниже', () => {
    const result = service.calculate(tariff, region, { distanceM: 500, durationS: 120 });
    // min_price 149 → 150: к клиенту уходит только круглая сумма.
    expect(result.estimated).toBe(150);
    expect(result.minPriceApplied).toBe(true);
  });

  it('применяет surge при включённом флаге региона', () => {
    const surgeRegion = { ...region, featureFlags: { surge_pricing: true } };
    const surgeTariff = {
      ...tariff,
      surgeRules: { enabled: true, multiplier: 1.5 },
    } as Tariff;

    const result = service.calculate(surgeTariff, surgeRegion, { distanceM: 5000, durationS: 900 });
    // 264 × 1,5 = 396 → 400
    expect(result.estimated).toBe(400);
    expect(result.surgeMultiplier).toBe(1.5);
  });
});
