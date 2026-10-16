import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { EventBusService } from '../../messaging/event-bus.service';
import { DriversService } from '../drivers/drivers.service';
import { OrdersService } from '../orders/orders.service';
import { RealtimeBroadcastService } from './realtime-broadcast.service';

const PICKUP_ETA_MAX_LENGTH = 24;

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

/**
 * Связка обновления геопозиции водителя и WS-трансляции (Req §15.1, Des §6.2).
 */
@Injectable()
export class RealtimeLocationBridge {
  /** Последняя строка «до клиента» по заказу — её же видит клиент. */
  private readonly pickupEtaByOrder = new Map<string, string>();

  constructor(
    private readonly broadcast: RealtimeBroadcastService,
    private readonly eventBus: EventBusService,
    @Inject(forwardRef(() => DriversService))
    private readonly driversService: DriversService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}

  async updateAndBroadcast(
    driverUserId: string,
    lat: number,
    lng: number,
    eta?: string | null,
  ): Promise<void> {
    await this.driversService.updateLocation(driverUserId, lat, lng);

    const order = await this.ordersService.getActiveOrderForDriverUser(driverUserId);
    if (!order) return;

    const pickupEta = this.rememberPickupEta(order.id, normalizePickupEta(eta));
    await this.broadcast.publishDriverLocation(order.id, order.clientId, {
      lat,
      lng,
      orderId: order.id,
      at: new Date().toISOString(),
      ...(pickupEta !== undefined ? { eta: pickupEta } : {}),
    });

    this.eventBus.publish('driver.location_updated', { orderId: order.id, lat, lng });
    await this.ordersService.recordTrackPoint(order.id, lat, lng);
  }

  /** Последняя известная точка машины — чтобы клиент увидел её сразу при подписке на заказ. */
  async snapshotForOrder(orderId: string): Promise<{
    orderId: string;
    lat: number;
    lng: number;
    at: string;
    eta?: string;
  } | null> {
    const order = await this.ordersService.getActiveOrderLocationContext(orderId);
    if (!order?.driverId) {
      return null;
    }

    const point = await this.driversService.getCachedLocation(order.regionId, order.driverId);
    if (!point) {
      return null;
    }

    const eta = this.pickupEtaByOrder.get(order.id);

    return {
      at: new Date().toISOString(),
      lat: point.lat,
      lng: point.lng,
      orderId: order.id,
      ...(eta ? { eta } : {}),
    };
  }

  /**
   * `undefined` — водитель не прислал строку, оставляем прошлую.
   * `null` — подача закончилась, время клиенту больше не нужно.
   */
  private rememberPickupEta(
    orderId: string,
    eta: string | null | undefined,
  ): string | null | undefined {
    if (eta === undefined) {
      return this.pickupEtaByOrder.get(orderId);
    }
    if (eta === null) {
      this.pickupEtaByOrder.delete(orderId);
      return null;
    }
    this.pickupEtaByOrder.set(orderId, eta);
    return eta;
  }
}
