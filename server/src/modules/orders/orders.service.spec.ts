import { Test, type TestingModule } from '@nestjs/testing';
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
import { GeoService } from '../geo/geo.service';
import { OrderStatus, PaymentMethod } from '../../common/enums/order-status.enum';
import type { Region } from '../regions/entities/region.entity';
import type { Tariff } from '../tariffs/entities/tariff.entity';

describe('OrdersService', () => {
  let service: OrdersService;
  let moduleRef: TestingModule;

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
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    query: jest.fn().mockResolvedValue([{ next: '100001' }]),
  };

  const geoServiceMock = {
    resolveStoredAddress: jest.fn(
      async (location: { lat: number; lng: number; address?: string }) => {
        if (location.address && location.address !== 'Моё местоположение') {
          return location.address;
        }
        return 'г. Назрань, ул. Московская, 12';
      },
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const compiled = await Test.createTestingModule({
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
            findCandidates: jest.fn().mockResolvedValue([]),
            createOffer: jest.fn(),
            getOffer: jest.fn().mockResolvedValue(null),
            getOfferForDriver: jest.fn().mockResolvedValue(null),
            canAcceptOffer: jest.fn(
              (offer: { driverId: string; expiresAt: string } | null, driverId: string) => {
                if (!offer) return false;
                if (new Date(offer.expiresAt) < new Date()) return false;
                return offer.driverId === driverId;
              },
            ),
            clearOffer: jest.fn(),
            isSearchExpired: jest.fn().mockResolvedValue(false),
            clearSearchDeadline: jest.fn(),
          },
        },
        {
          provide: DriversService,
          useValue: {
            getOnlineDriverIds: jest.fn().mockResolvedValue(new Set()),
            findProfileByUserId: jest.fn().mockResolvedValue(null),
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
        { provide: GeoService, useValue: geoServiceMock },
      ],
    }).compile();

    moduleRef = compiled;
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

  it('при создании заказа подменяет «Моё местоположение» на адрес по координатам', async () => {
    repoMock.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValue({
      id: 'order-1',
      regionId: region.id,
      pickupLat: 43.2167,
      pickupLng: 44.7667,
    });
    repoMock.findOneOrFail.mockResolvedValue({
      id: 'order-1',
      pickupLat: 43.2167,
      pickupLng: 44.7667,
      pickupAddress: 'г. Назрань, ул. Московская, 12',
      dropoffLat: 43.1667,
      dropoffLng: 44.8,
      dropoffAddress: 'Магас',
    });

    await service.create('client-1', {
      regionId: region.id,
      pickup: { lat: 43.2167, lng: 44.7667, address: 'Моё местоположение' },
      dropoff: { lat: 43.1667, lng: 44.8, address: 'Магас' },
      paymentMethod: PaymentMethod.Cash,
    });

    expect(repoMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        pickupAddress: 'г. Назрань, ул. Московская, 12',
        dropoffAddress: 'Магас',
        childSeat: false,
        passengerName: null,
        passengerPhone: null,
      }),
    );
  });

  it('при чтении заказа заменяет сохранённую GPS-подпись улицей', async () => {
    const stored = {
      id: 'order-2',
      clientId: 'client-1',
      pickupLat: 43.2189,
      pickupLng: 44.771,
      pickupAddress: 'Моё местоположение',
      dropoffLat: 43.1667,
      dropoffLng: 44.8,
      dropoffAddress: 'Магас',
    };
    repoMock.findOneOrFail.mockResolvedValue(stored);

    const order = await service.getOrderForUser('client-1', 'order-2', 'client');

    expect(geoServiceMock.resolveStoredAddress).toHaveBeenCalledWith(
      expect.objectContaining({ address: 'Моё местоположение' }),
    );
    expect(order.pickupAddress).toBe('г. Назрань, ул. Московская, 12');
    expect(repoMock.update).toHaveBeenCalledWith('order-2', {
      pickupAddress: 'г. Назрань, ул. Московская, 12',
      dropoffAddress: 'Магас',
    });
  });

  it('водитель видит заказ, в котором он пассажир', async () => {
    const stored = {
      id: 'order-3',
      clientId: 'driver-user-1',
      pickupLat: 43.2189,
      pickupLng: 44.771,
      pickupAddress: 'Назрань',
      dropoffLat: 43.1667,
      dropoffLng: 44.8,
      dropoffAddress: 'Магас',
    };
    repoMock.findOneOrFail.mockResolvedValue(stored);

    const order = await service.getOrderForUser('driver-user-1', 'order-3', 'driver');

    expect(order.clientId).toBe('driver-user-1');
  });

  it('не отменяет заказ, пока на линии никого нет', async () => {
    repoMock.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValue({
      id: 'order-1',
      clientId: 'client-1',
      regionId: region.id,
      pickupLat: 43.2167,
      pickupLng: 44.7667,
      status: OrderStatus.SearchingDriver,
      createdAt: new Date(),
    });
    repoMock.findOneOrFail.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.SearchingDriver,
    });

    await service.create('client-1', {
      regionId: region.id,
      pickup: { lat: 43.2167, lng: 44.7667, address: 'Назрань' },
      dropoff: { lat: 43.1667, lng: 44.8, address: 'Магас' },
      paymentMethod: PaymentMethod.Cash,
    });

    const transitions = moduleRef.get(OrderTransitionService);
    expect(transitions.transition).not.toHaveBeenCalledWith(
      expect.objectContaining({
        toStatus: OrderStatus.CancelledSystem,
        reason: 'NO_DRIVERS_FOUND',
      }),
    );
  });

  it('предлагает ждущий заказ водителю, который вышел на линию позже', async () => {
    const waiting = {
      id: 'order-1',
      clientId: 'client-1',
      regionId: region.id,
      pickupLat: 43.2167,
      pickupLng: 44.7667,
      pickupAddress: 'Назрань',
      dropoffLat: 43.1667,
      dropoffLng: 44.8,
      dropoffAddress: 'Магас',
      status: OrderStatus.SearchingDriver,
      createdAt: new Date(),
    };
    repoMock.find.mockResolvedValue([waiting]);

    const matching = moduleRef.get(MatchingService);
    jest.spyOn(matching, 'findCandidates').mockResolvedValue([
      {
        driverId: 'driver-1',
        userId: 'driver-user',
        lat: 43.22,
        lng: 44.77,
        rating: 5,
        distanceM: 200,
        score: 90,
      },
    ]);
    jest.spyOn(matching, 'createOffer').mockResolvedValue({
      orderId: 'order-1',
      driverId: 'driver-1',
      candidateIndex: 0,
      candidates: ['driver-1'],
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
    });

    const drivers = moduleRef.get(DriversService);
    jest.spyOn(drivers, 'getOnlineDriverIds').mockResolvedValue(new Set(['driver-1']));

    await service.rematchSearchingOrders();

    expect(matching.createOffer).toHaveBeenCalledWith(
      'order-1',
      expect.arrayContaining([expect.objectContaining({ driverId: 'driver-1' })]),
    );
  });

  it('отменяет поиск, если водитель так и не появился', async () => {
    repoMock.find.mockResolvedValue([
      {
        id: 'order-1',
        status: OrderStatus.SearchingDriver,
        createdAt: new Date(),
      },
    ]);
    repoMock.findOne.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.SearchingDriver,
    });

    const matching = moduleRef.get(MatchingService);
    jest.spyOn(matching, 'isSearchExpired').mockResolvedValue(true);

    await service.rematchSearchingOrders();

    const transitions = moduleRef.get(OrderTransitionService);
    expect(transitions.transition).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        toStatus: OrderStatus.CancelledSystem,
        reason: 'NO_DRIVERS_FOUND',
      }),
    );
  });
});
