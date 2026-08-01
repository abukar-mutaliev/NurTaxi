import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ACTIVE_ORDER_STATUSES,
  DRIVER_ACTIVE_ORDER_STATUSES,
  OrderStatus,
} from '../../common/enums/order-status.enum';
import { EventBusService } from '../../messaging/event-bus.service';
import { DriversService } from '../drivers/drivers.service';
import { MAP_PROVIDER, type MapProvider } from '../geo/map/map-provider.interface';
import { RegionsService } from '../regions/regions.service';
import { TariffsService } from '../tariffs/tariffs.service';
import { PricingService } from '../tariffs/pricing.service';
import type { CancellationPolicy } from '../tariffs/entities/tariff.entity';
import { Order } from './entities/order.entity';
import { OrderRoute } from './entities/order-route.entity';
import { OrderStatusLog } from './entities/order-status-log.entity';
import { OrderTransitionService } from './order-transition.service';
import { MatchingService, type MatchOffer } from './matching/matching.service';
import { RealtimeBroadcastService } from '../realtime/realtime-broadcast.service';
import { PaymentsService } from '../payments/payments.service';
import { FamilyService } from '../users/family.service';
import { ReviewsService } from '../reviews/reviews.service';
import { Receipt } from '../payments/entities/receipt.entity';
import type { CreateOrderDto, OrderEstimateDto } from './dto/orders.dto';
import type { OrderEstimateResponse } from './dto/orders.presenter';
import {
  RouteResponse,
  PriceBreakdownResponse,
  TariffSummaryResponse,
} from './dto/orders.presenter';

const DEFAULT_PICKUP_ETA_S = 420;

const DRIVER_ACTION_TARGET: Record<'en_route' | 'arrived' | 'start' | 'complete', OrderStatus> = {
  en_route: OrderStatus.DriverEnRoute,
  arrived: OrderStatus.DriverArrived,
  start: OrderStatus.InProgress,
  complete: OrderStatus.Completed,
};

const DRIVER_ACTION_REQUIRED: Record<'en_route' | 'arrived' | 'start' | 'complete', OrderStatus> = {
  en_route: OrderStatus.DriverAssigned,
  arrived: OrderStatus.DriverEnRoute,
  start: OrderStatus.DriverArrived,
  complete: OrderStatus.InProgress,
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @InjectRepository(OrderRoute)
    private readonly routes: Repository<OrderRoute>,
    @InjectRepository(OrderStatusLog)
    private readonly logs: Repository<OrderStatusLog>,
    private readonly regionsService: RegionsService,
    private readonly tariffsService: TariffsService,
    private readonly pricingService: PricingService,
    @Inject(MAP_PROVIDER) private readonly mapProvider: MapProvider,
    private readonly transitions: OrderTransitionService,
    private readonly matching: MatchingService,
    private readonly driversService: DriversService,
    private readonly eventBus: EventBusService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    private readonly familyService: FamilyService,
    private readonly reviewsService: ReviewsService,
    @InjectRepository(Receipt)
    private readonly receipts: Repository<Receipt>,
    @Optional() private readonly realtime?: RealtimeBroadcastService,
  ) {}

  private readonly logger = new Logger(OrdersService.name);

  async estimate(dto: OrderEstimateDto): Promise<OrderEstimateResponse> {
    const region = await this.regionsService.getRegionOrThrow(dto.regionId);
    const tariff = await this.tariffsService.getEffectiveTariff(dto.regionId, dto.tariffId);

    const route = await this.mapProvider.route({
      origin: { lat: dto.pickup.lat, lng: dto.pickup.lng },
      destination: { lat: dto.dropoff.lat, lng: dto.dropoff.lng },
    });

    const price = this.pricingService.calculate(tariff, region, {
      distanceM: route.distanceM,
      durationS: route.durationS,
    });

    return {
      route: RouteResponse.from(route),
      price: PriceBreakdownResponse.from(price),
      tariff: TariffSummaryResponse.from(tariff),
      pickupEtaS: DEFAULT_PICKUP_ETA_S,
    };
  }

  /** Создание заказа (Req §8.10, §8.11). */
  async create(clientId: string, dto: CreateOrderDto): Promise<Order> {
    if (dto.familyMemberId) {
      await this.familyService.assertCanOrderForMember(clientId, dto.familyMemberId);
    } else {
      await this.assertClientHasNoActiveOrder(clientId);
    }

    const region = await this.regionsService.getRegionOrThrow(dto.regionId);
    const tariff = await this.tariffsService.getEffectiveTariff(dto.regionId, dto.tariffId);

    const mapRoute = await this.mapProvider.route({
      origin: { lat: dto.pickup.lat, lng: dto.pickup.lng },
      destination: { lat: dto.dropoff.lat, lng: dto.dropoff.lng },
    });

    const price = this.pricingService.calculate(tariff, region, {
      distanceM: mapRoute.distanceM,
      durationS: mapRoute.durationS,
    });

    const order = this.orders.create({
      clientId,
      regionId: dto.regionId,
      tariffId: tariff.id,
      pickupLat: dto.pickup.lat,
      pickupLng: dto.pickup.lng,
      pickupAddress: dto.pickup.address ?? `${dto.pickup.lat}, ${dto.pickup.lng}`,
      dropoffLat: dto.dropoff.lat,
      dropoffLng: dto.dropoff.lng,
      dropoffAddress: dto.dropoff.address ?? `${dto.dropoff.lat}, ${dto.dropoff.lng}`,
      status: OrderStatus.Created,
      priceEstimated: String(price.estimated),
      paymentMethod: dto.paymentMethod,
      comment: dto.comment ?? null,
      familyMemberId: dto.familyMemberId ?? null,
    });

    const saved = await this.orders.save(order);

    const route = this.routes.create({
      orderId: saved.id,
      polyline: mapRoute.polyline,
      distanceM: mapRoute.distanceM,
      durationS: mapRoute.durationS,
    });
    await this.routes.save(route);

    await this.logs.save(
      this.logs.create({
        orderId: saved.id,
        fromStatus: null,
        toStatus: OrderStatus.Created,
        actorId: clientId,
      }),
    );

    this.eventBus.publish('order.created', { orderId: saved.id, clientId });

    await this.transitions.transition({
      orderId: saved.id,
      toStatus: OrderStatus.SearchingDriver,
      actorId: clientId,
    });

    await this.startMatching(saved.id);
    return this.loadFullOrder(saved.id);
  }

  private async startMatching(orderId: string): Promise<void> {
    const order = await this.getOrderOrThrow(orderId);
    const onlineIds = await this.driversService.getOnlineDriverIds(order.regionId);

    const candidates = await this.matching.findCandidates(
      order.regionId,
      order.pickupLat,
      order.pickupLng,
      onlineIds,
    );

    if (candidates.length === 0) {
      await this.transitions.transition({
        orderId,
        toStatus: OrderStatus.CancelledSystem,
        reason: 'NO_DRIVERS_FOUND',
      });
      return;
    }

    const offer = await this.matching.createOffer(orderId, candidates);
    this.eventBus.publish('order.searching_driver', {
      orderId,
      offeredDriverId: offer?.driverId,
      candidatesCount: candidates.length,
    });

    if (offer) {
      await this.sendOfferToDriver(order, offer);
    }
  }

  /**
   * Доставка предложения водителю по WebSocket (`order.offer`, Des §10).
   *
   * Без этого подбор оставался «немым»: кандидат вычислялся и клался в Redis, но
   * приложение водителя о заказе не узнавало и принять его было неоткуда.
   * Сбой рассылки не отменяет заказ — предложение всё равно живёт в Redis (TTL 30 c).
   */
  private async sendOfferToDriver(order: Order, offer: MatchOffer): Promise<void> {
    if (!this.realtime) {
      return;
    }

    try {
      const driver = await this.driversService.getProfileByDriverId(offer.driverId);
      const route = await this.routes.findOne({ where: { orderId: order.id } });

      await this.realtime.publishOrderOffer(driver.userId, {
        orderId: order.id,
        expiresAt: offer.expiresAt,
        pickup: {
          lat: order.pickupLat,
          lng: order.pickupLng,
          address: order.pickupAddress,
        },
        dropoff: {
          lat: order.dropoffLat,
          lng: order.dropoffLng,
          address: order.dropoffAddress,
        },
        price: Number(order.priceEstimated),
        paymentMethod: order.paymentMethod,
        comment: order.comment ?? null,
        distanceM: route?.distanceM ?? null,
        durationS: route?.durationS ?? null,
      });
    } catch (error) {
      this.logger.warn(
        `Не удалось отправить предложение заказа ${order.id} водителю ${offer.driverId}: ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async acceptOrder(driverUserId: string, orderId: string): Promise<Order> {
    const driver = await this.driversService.getProfileByUserId(driverUserId);
    const order = await this.getOrderOrThrow(orderId);

    if (order.status !== OrderStatus.SearchingDriver) {
      throw new ConflictException({
        code: 'ORDER_NOT_AVAILABLE',
        message: 'Заказ недоступен для принятия',
      });
    }

    if (await this.driversService.hasActiveTrip(driverUserId)) {
      throw new ConflictException({
        code: 'DRIVER_BUSY',
        message: 'У вас уже есть активная поездка',
      });
    }

    const offer = await this.matching.getOffer(orderId);
    if (offer && !this.matching.canAcceptOffer(offer, driver.id)) {
      throw new ForbiddenException({
        code: 'NOT_YOUR_TURN',
        message: 'Этот заказ предложен другому водителю',
      });
    }

    await this.matching.clearOffer(orderId);

    const updated = await this.transitions.transition({
      orderId,
      toStatus: OrderStatus.DriverAssigned,
      actorId: driverUserId,
      mutate: (o) => {
        o.driverId = driver.id;
      },
    });

    await this.driversService.markBusy(driverUserId);
    return this.loadFullOrder(updated.id);
  }

  async advanceDriverStatus(
    driverUserId: string,
    orderId: string,
    action: 'en_route' | 'arrived' | 'start' | 'complete',
  ): Promise<Order> {
    const driver = await this.driversService.getProfileByUserId(driverUserId);
    const order = await this.getOrderOrThrow(orderId);

    if (order.driverId !== driver.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Это не ваш заказ' });
    }

    const required = DRIVER_ACTION_REQUIRED[action];
    if (order.status !== required) {
      throw new ConflictException({
        code: 'INVALID_ORDER_STATE',
        message: `Действие "${action}" недоступно в статусе ${order.status}`,
      });
    }

    const toStatus = DRIVER_ACTION_TARGET[action];
    const updated = await this.transitions.transition({
      orderId,
      toStatus,
      actorId: driverUserId,
    });

    if (toStatus === OrderStatus.Completed) {
      updated.priceFinal = updated.priceEstimated;
      await this.orders.save(updated);
      return this.paymentsService.settleCompletedOrder(updated.id, driverUserId);
    }

    return this.loadFullOrder(updated.id);
  }

  async closeOrder(orderId: string, actorId?: string): Promise<Order> {
    const order = await this.getOrderOrThrow(orderId);
    if (order.status !== OrderStatus.Completed && order.status !== OrderStatus.FailedPayment) {
      throw new ConflictException({
        code: 'INVALID_ORDER_STATE',
        message: 'Закрытие доступно только после завершения поездки',
      });
    }

    const updated = await this.transitions.transition({
      orderId,
      toStatus: OrderStatus.Closed,
      actorId,
    });

    if (updated.driverId) {
      const driver = await this.driversService.getProfileByDriverId(updated.driverId);
      await this.driversService.markOnlineAfterTrip(driver.userId);
      await this.driversService.incrementTripsCount(updated.driverId);
    }

    return this.loadFullOrder(updated.id);
  }

  async cancelByClient(clientId: string, orderId: string, reason?: string): Promise<Order> {
    const order = await this.getOrderOrThrow(orderId);
    if (order.clientId !== clientId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Это не ваш заказ' });
    }

    const cancellable: OrderStatus[] = [
      OrderStatus.Created,
      OrderStatus.SearchingDriver,
      OrderStatus.DriverAssigned,
      OrderStatus.DriverEnRoute,
      OrderStatus.DriverArrived,
    ];

    if (!cancellable.includes(order.status)) {
      throw new ConflictException({
        code: 'CANCEL_NOT_ALLOWED',
        message: 'Отмена недоступна в текущем статусе',
      });
    }

    const tariff = await this.tariffsService.getEffectiveTariff(order.regionId, order.tariffId);
    const fee = this.calcCancellationFee(order.status, tariff.cancellationPolicy);

    await this.matching.clearOffer(orderId);

    const updated = await this.transitions.transition({
      orderId,
      toStatus: OrderStatus.CancelledByClient,
      actorId: clientId,
      reason,
      mutate: (o) => {
        o.cancellationFee = fee > 0 ? String(fee) : null;
      },
    });

    if (order.driverId) {
      const driver = await this.driversService.getProfileByDriverId(order.driverId);
      await this.driversService.markOnlineAfterTrip(driver.userId);
    }

    return this.loadFullOrder(updated.id);
  }

  async cancelByDriver(driverUserId: string, orderId: string, reason?: string): Promise<Order> {
    const driver = await this.driversService.getProfileByUserId(driverUserId);
    const order = await this.getOrderOrThrow(orderId);

    if (order.driverId !== driver.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Это не ваш заказ' });
    }

    const cancellable: OrderStatus[] = [
      OrderStatus.DriverAssigned,
      OrderStatus.DriverEnRoute,
      OrderStatus.DriverArrived,
    ];

    if (!cancellable.includes(order.status)) {
      throw new ConflictException({
        code: 'CANCEL_NOT_ALLOWED',
        message: 'Отмена недоступна в текущем статусе',
      });
    }

    const updated = await this.transitions.transition({
      orderId,
      toStatus: OrderStatus.CancelledByDriver,
      actorId: driverUserId,
      reason,
    });

    await this.driversService.markOnlineAfterTrip(driverUserId);
    return this.loadFullOrder(updated.id);
  }

  async getOrderForUser(
    userId: string,
    orderId: string,
    role: 'client' | 'driver',
  ): Promise<Order> {
    const order = await this.loadFullOrder(orderId);

    if (role === 'client' && order.clientId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа к заказу' });
    }

    if (role === 'driver') {
      const driver = await this.driversService.getProfileByUserId(userId);
      if (order.driverId !== driver.id && order.status === OrderStatus.SearchingDriver) {
        // водитель может видеть заказ при поиске — если есть offer
        const offer = await this.matching.getOffer(orderId);
        if (!offer || offer.driverId !== driver.id) {
          throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа к заказу' });
        }
      } else if (order.driverId !== driver.id) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа к заказу' });
      }
    }

    return order;
  }

  async getClientHistory(clientId: string, limit = 20) {
    const orders = await this.orders.find({
      where: { clientId },
      relations: ['route', 'tariff', 'driver', 'driver.vehicles', 'driver.user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return Promise.all(
      orders.map(async (order) => {
        const [receipt, reviews] = await Promise.all([
          this.receipts.findOne({ where: { orderId: order.id } }),
          this.reviewsService.listForOrder(order.id),
        ]);
        return { order, receipt, reviews };
      }),
    );
  }

  /**
   * История поездок водителя (Req §8.13) — зеркало `getClientHistory` для роли Driver.
   * На вход приходит `users.id`, поэтому сначала находим профиль водителя.
   */
  async getDriverHistory(userId: string, limit = 20) {
    const driver = await this.driversService.getProfileByUserId(userId);

    const orders = await this.orders.find({
      where: { driverId: driver.id },
      relations: ['route', 'tariff', 'client'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return Promise.all(
      orders.map(async (order) => {
        const [receipt, reviews] = await Promise.all([
          this.receipts.findOne({ where: { orderId: order.id } }),
          this.reviewsService.listForOrder(order.id),
        ]);
        return { order, receipt, reviews };
      }),
    );
  }

  async getStatusLogs(orderId: string): Promise<OrderStatusLog[]> {
    return this.logs.find({ where: { orderId }, order: { createdAt: 'ASC' } });
  }

  private calcCancellationFee(status: OrderStatus, policy: CancellationPolicy): number {
    if (
      status === OrderStatus.Created ||
      status === OrderStatus.SearchingDriver ||
      (status === OrderStatus.DriverAssigned && policy.freeCancelBeforeAssigned !== false)
    ) {
      return 0;
    }
    if (status === OrderStatus.DriverAssigned || status === OrderStatus.DriverEnRoute) {
      return policy.feeAfterAssigned ?? 0;
    }
    if (status === OrderStatus.DriverArrived) {
      return policy.feeAfterArrived ?? policy.feeAfterAssigned ?? 0;
    }
    return 0;
  }

  private async assertClientHasNoActiveOrder(clientId: string): Promise<void> {
    const active = await this.orders.findOne({
      where: { clientId, status: In(ACTIVE_ORDER_STATUSES) },
    });
    if (active) {
      throw new ConflictException({
        code: 'ACTIVE_ORDER_EXISTS',
        message: 'У вас уже есть активный заказ',
        details: { orderId: active.id },
      });
    }
  }

  async getOrderOrThrow(orderId: string): Promise<Order> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Заказ не найден' });
    }
    return order;
  }

  /** Активный заказ водителя для трансляции геопозиции (Des §6.2). */
  async getActiveOrderForDriverUser(driverUserId: string): Promise<Order | null> {
    const driver = await this.driversService.getProfileByUserId(driverUserId);
    return this.orders.findOne({
      where: { driverId: driver.id, status: In(DRIVER_ACTIVE_ORDER_STATUSES) },
      relations: ['driver', 'driver.user'],
    });
  }

  private loadFullOrder(orderId: string): Promise<Order> {
    return this.orders.findOneOrFail({
      where: { id: orderId },
      relations: ['route', 'tariff', 'region', 'driver', 'driver.vehicles', 'driver.user'],
    });
  }
}
