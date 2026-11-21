import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { resolveComplianceConfig } from '../../common/compliance/compliance-config';
import { RegionsService } from '../regions/regions.service';
import { TripTrackPoint } from '../orders/entities/trip-track-point.entity';
import { Order } from '../orders/entities/order.entity';

const IN_TRIP: OrderStatus[] = [
  OrderStatus.DriverEnRoute,
  OrderStatus.DriverArrived,
  OrderStatus.InProgress,
];

/** Заказ ещё не в поездке: статус вот-вот сменится, поэтому перепроверяем скоро. */
const IDLE_RECHECK_MS = 5000;
/** Сверх этого числа заказов чистим памятку от тех, чей срок уже вышел. */
const MEMO_PRUNE_SIZE = 1000;

@Injectable()
export class TripTrackService {
  /**
   * Когда по заказу снова стоит идти в базу.
   *
   * Точки водителя приходят каждую секунду, а трек пишется раз в `tripTrackIntervalSec`.
   * Без памятки каждая точка стоила трёх запросов, почти всегда с ответом «ещё рано».
   * Это только экономия: писать точку или нет, по-прежнему решает база, поэтому памятка
   * в памяти процесса безопасна и при нескольких инстансах, и после перезапуска.
   */
  private readonly nextCheckAt = new Map<string, number>();

  constructor(
    @InjectRepository(TripTrackPoint) private readonly points: Repository<TripTrackPoint>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly regions: RegionsService,
  ) {}

  async recordIfDue(orderId: string, lat: number, lng: number, accuracyM?: number): Promise<void> {
    const now = Date.now();
    if (now < (this.nextCheckAt.get(orderId) ?? 0)) return;
    // Ставим отсрочку до запросов: вторая точка, пришедшая, пока они идут, их не повторит.
    this.defer(orderId, now + IDLE_RECHECK_MS);

    const order = await this.orders.findOne({
      where: { id: orderId },
      select: ['id', 'status', 'regionId'],
    });
    if (!order || !IN_TRIP.includes(order.status)) return;

    const region = await this.regions.getRegionOrThrow(order.regionId);
    const intervalMs = resolveComplianceConfig(region.complianceConfig).tripTrackIntervalSec * 1000;
    const last = await this.points.findOne({
      where: { orderId },
      order: { recordedAt: 'DESC' },
    });
    if (last) {
      const dueAt = last.recordedAt.getTime() + intervalMs;
      if (now < dueAt) {
        this.defer(orderId, dueAt);
        return;
      }
    }

    await this.points.save(
      this.points.create({
        orderId,
        lat,
        lng,
        accuracyM: accuracyM ?? null,
        recordedAt: new Date(now),
      }),
    );
    this.defer(orderId, now + intervalMs);
  }

  private defer(orderId: string, at: number): void {
    if (this.nextCheckAt.size >= MEMO_PRUNE_SIZE && !this.nextCheckAt.has(orderId)) {
      const now = Date.now();
      for (const [id, dueAt] of this.nextCheckAt) {
        if (dueAt <= now) {
          this.nextCheckAt.delete(id);
        }
      }
    }
    this.nextCheckAt.set(orderId, at);
  }
}
