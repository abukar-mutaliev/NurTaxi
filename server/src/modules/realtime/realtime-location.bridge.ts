import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { EventBusService } from '../../messaging/event-bus.service';
import { DriversService } from '../drivers/drivers.service';
import { OrdersService } from '../orders/orders.service';
import { RealtimeBroadcastService } from './realtime-broadcast.service';

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
  ) {}

  async updateAndBroadcast(driverUserId: string, lat: number, lng: number): Promise<void> {
    await this.driversService.updateLocation(driverUserId, lat, lng);

    const order = await this.ordersService.getActiveOrderForDriverUser(driverUserId);
    if (!order) return;

    await this.broadcast.publishDriverLocation(order.id, order.clientId, {
      lat,
      lng,
      orderId: order.id,
      at: new Date().toISOString(),
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
  } | null> {
    const order = await this.ordersService.getActiveOrderLocationContext(orderId);
    if (!order?.driverId) {
      return null;
    }

    const point = await this.driversService.getCachedLocation(order.regionId, order.driverId);
    if (!point) {
      return null;
    }

    return {
      at: new Date().toISOString(),
      lat: point.lat,
      lng: point.lng,
      orderId: order.id,
    };
  }
}
