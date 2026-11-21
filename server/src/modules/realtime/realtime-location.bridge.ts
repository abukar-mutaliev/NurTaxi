import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { EventBusService } from '../../messaging/event-bus.service';
import { DriversService } from '../drivers/drivers.service';
import { OrdersService } from '../orders/orders.service';
import { PickupProgressStore } from './pickup-progress.store';
import { RealtimeBroadcastService } from './realtime-broadcast.service';

const PICKUP_ETA_MAX_LENGTH = 24;
const PICKUP_ROUTE_MAX_LENGTH = 16_000;

/** Строка с экрана водителя. Пустое и не-строка не затирают прошлое значение. */
function normalizePickupEta(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim().replace(/\s+/g, ' ').slice(0, PICKUP_ETA_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Полилиния с экрана водителя. Пустое и не-строка не затирают прошлый маршрут. */
function normalizePickupRoute(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > PICKUP_ROUTE_MAX_LENGTH) {
    return undefined;
  }
  if (/[^\x20-\x7e]/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

/** Курс машины, градусы от севера. Всё, что не число, — «курс неизвестен». */
function normalizeHeading(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 360) {
    return undefined;
  }
  // Десятых долей градуса хватает с запасом; 360 — тот же север, что и 0.
  return (Math.round(value * 10) / 10) % 360;
}

/** Радиус погрешности точки, м. */
function normalizeAccuracy(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.round(value * 10) / 10;
}

/** То, что водитель присылает вместе с точкой. Все поля необязательны. */
export interface DriverLocationExtras {
  /** Строка «до клиента». `undefined` — оставить прошлую, `null` — подача закончилась. */
  eta?: unknown;
  /** Линия подачи. `undefined` — оставить прошлую, `null` — линия больше не нужна. */
  route?: unknown;
  /** Курс по GPS, градусы от севера. */
  heading?: unknown;
  /** Радиус погрешности точки, м. */
  accuracy?: unknown;
}

/**
 * Связка обновления геопозиции водителя и WS-трансляции (Req §15.1, Des §6.2).
 */
@Injectable()
export class RealtimeLocationBridge {
  constructor(
    private readonly broadcast: RealtimeBroadcastService,
    private readonly eventBus: EventBusService,
    @Inject(forwardRef(() => DriversService))
    private readonly driversService: DriversService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly pickupProgress: PickupProgressStore,
  ) {}

  async updateAndBroadcast(
    driverUserId: string,
    lat: number,
    lng: number,
    extras: DriverLocationExtras = {},
  ): Promise<void> {
    const { driverId } = await this.driversService.updateLocation(driverUserId, lat, lng);

    const order = await this.ordersService.getActiveOrderForDriver(driverId);
    if (!order) return;

    const etaUpdate = normalizePickupEta(extras.eta);
    /**
     * Линию запоминаем всегда, а клиенту отдаём, только когда водитель её прислал. Точки
     * идут каждую секунду, линия весит килобайты и меняется раз в сотни метров: повторять
     * её в каждом событии — значит гонять один и тот же маршрут по мобильной сети клиента.
     * Клиент между линиями держит последнюю, а только что подписавшийся получает её в
     * снимке (`snapshotForOrder`).
     */
    const routeUpdate = normalizePickupRoute(extras.route);
    await this.pickupProgress.save(order.id, { eta: etaUpdate, route: routeUpdate });
    // Водитель не прислал строку (точка из фоновой задачи) — повторяем последнюю.
    const pickupEta =
      etaUpdate === undefined ? await this.pickupProgress.readEta(order.id) : etaUpdate;
    const heading = normalizeHeading(extras.heading);
    const accuracy = normalizeAccuracy(extras.accuracy);

    await this.broadcast.publishDriverLocation(order.id, order.clientId, {
      lat,
      lng,
      orderId: order.id,
      at: new Date().toISOString(),
      ...(pickupEta !== undefined ? { eta: pickupEta } : {}),
      ...(routeUpdate !== undefined ? { route: routeUpdate } : {}),
      ...(heading !== undefined ? { heading } : {}),
    });

    this.eventBus.publish('driver.location_updated', { orderId: order.id, lat, lng });
    await this.ordersService.recordTrackPoint(order.id, lat, lng, accuracy);
  }

  /** Последняя известная точка машины — чтобы клиент увидел её сразу при подписке на заказ. */
  async snapshotForOrder(orderId: string): Promise<{
    orderId: string;
    lat: number;
    lng: number;
    at: string;
    eta?: string;
    route?: string;
  } | null> {
    const order = await this.ordersService.getActiveOrderLocationContext(orderId);
    if (!order?.driverId) {
      return null;
    }

    const point = await this.driversService.getCachedLocation(order.regionId, order.driverId);
    if (!point) {
      return null;
    }

    const { eta, route } = await this.pickupProgress.read(order.id);

    return {
      // Время самой точки, а не подписки: иначе снимок «новее» живых точек, уже
      // ушедших по сокету, и клиент их отбрасывает как устаревшие.
      at: point.updatedAt ?? new Date().toISOString(),
      lat: point.lat,
      lng: point.lng,
      orderId: order.id,
      ...(eta ? { eta } : {}),
      ...(route ? { route } : {}),
    };
  }
}
