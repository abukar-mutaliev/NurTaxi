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

@Injectable()
export class TripTrackService {
  constructor(
    @InjectRepository(TripTrackPoint) private readonly points: Repository<TripTrackPoint>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly regions: RegionsService,
  ) {}

  async recordIfDue(orderId: string, lat: number, lng: number, accuracyM?: number): Promise<void> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order || !IN_TRIP.includes(order.status)) return;

    const region = await this.regions.getRegionOrThrow(order.regionId);
    const compliance = resolveComplianceConfig(region.complianceConfig);
    const last = await this.points.findOne({
      where: { orderId },
      order: { recordedAt: 'DESC' },
    });
    if (last) {
      const elapsed = (Date.now() - last.recordedAt.getTime()) / 1000;
      if (elapsed < compliance.tripTrackIntervalSec) return;
    }

    await this.points.save(
      this.points.create({
        orderId,
        lat,
        lng,
        accuracyM: accuracyM ?? null,
        recordedAt: new Date(),
      }),
    );
  }
}
