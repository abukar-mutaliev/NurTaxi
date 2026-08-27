import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RegionsService } from '../regions/regions.service';
import { TariffsService } from '../tariffs/tariffs.service';
import { PricingService } from '../tariffs/pricing.service';
import { DriversService } from '../drivers/drivers.service';
import { MAP_PROVIDER } from '../geo/map/map-provider.interface';
import { ROUTING_PROVIDER } from '../geo/map/routing-provider.interface';
import { StubMapProvider } from '../geo/map/stub-map.provider';
import { StubRoutingProvider } from '../geo/map/stub-routing.provider';
import { EventBusService } from '../../messaging/event-bus.service';
import { Order } from './entities/order.entity';
import { OrderRoute } from './entities/order-route.entity';
import { OrderStatusLog } from './entities/order-status-log.entity';
import { OrdersService } from './orders.service';
import { OrderTransitionService } from './order-transition.service';
import { MatchingService } from './matching/matching.service';
import { PaymentsService } from '../payments/payments.service';
import { FamilyService } from '../users/family.service';
import { ReviewsService } from '../reviews/reviews.service';
import { Receipt } from '../payments/entities/receipt.entity';
import type { Region } from '../regions/entities/region.entity';
import type { Tariff } from '../tariffs/entities/tariff.entity';

describe('OrdersService', () => {
  let service: OrdersService;

  const region: Region = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Ингушетия',
    isActive: true,
    timezone: 'Europe/Moscow',
    currency: 'RUB',
    featureFlags: {},
    driverRequirements: {},
    complianceConfig: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tariff: Tariff = {
    id: '00000000-0000-4000-8000-000000000101',
    regionId: region.id,
    name: 'Стандарт',
    baseFare: '99',
    pricePerKm: '18',
    pricePerMin: '5',
    minPrice: '149',
    surgeRules: {},
    commissionPercent: '15',
    cancellationPolicy: {},
    effectiveFrom: new Date('2026-01-01'),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Tariff;

  const repoMock = {
    findOne: jest.fn(),
    find: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve({ ...data, id: data.id ?? 'order-1' })),
    query: jest.fn().mockResolvedValue([{ next: '100001' }]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        PricingService,
        StubRoutingProvider,
        { provide: ROUTING_PROVIDER, useExisting: StubRoutingProvider },
        StubMapProvider,
        { provide: MAP_PROVIDER, useExisting: StubMapProvider },
        { provide: getRepositoryToken(Order), useValue: repoMock },
        { provide: getRepositoryToken(OrderRoute), useValue: repoMock },
        { provide: getRepositoryToken(OrderStatusLog), useValue: repoMock },
        { provide: getRepositoryToken(Receipt), useValue: { findOne: jest.fn() } },
        {
          provide: FamilyService,
          useValue: { assertCanOrderForMember: jest.fn() },
        },
        {
          provide: ReviewsService,
          useValue: { listForOrder: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: RegionsService,
          useValue: { getRegionOrThrow: jest.fn(() => Promise.resolve(region)) },
        },
        {
          provide: TariffsService,
          useValue: {
            getEffectiveTariff: jest.fn(() => Promise.resolve({ ...tariff, region })),
          },
        },
        {
          provide: OrderTransitionService,
          useValue: {
            transition: jest.fn((opts) =>
              Promise.resolve({ id: opts.orderId, status: opts.toStatus }),
            ),
          },
        },
        {
          provide: MatchingService,
          useValue: {
            findCandidates: jest.fn(),
            createOffer: jest.fn(),
            getOffer: jest.fn(),
            clearOffer: jest.fn(),
          },
        },
        {
          provide: DriversService,
          useValue: {
            getOnlineDriverIds: jest.fn(),
            getProfileByUserId: jest.fn(),
            markBusy: jest.fn(),
            markOnlineAfterTrip: jest.fn(),
          },
        },
        { provide: EventBusService, useValue: { publish: jest.fn() } },
        {
          provide: PaymentsService,
          useValue: { settleCompletedOrder: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  it('возвращает маршрут, цену и тариф для estimate', async () => {
    const result = await service.estimate({
      regionId: region.id,
      pickup: { lat: 43.2167, lng: 44.7667, address: 'Назрань' },
      dropoff: { lat: 43.1667, lng: 44.8, address: 'Магас' },
    });

    expect(result.route.distanceM).toBeGreaterThan(0);
    expect(result.price.estimated).toBeGreaterThan(0);
    expect(result.tariff.name).toBe('Стандарт');
  });
});
