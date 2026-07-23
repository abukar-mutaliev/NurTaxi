import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { VerificationStatus } from '../../common/enums/verification-status.enum';
import { DriverOnlineStatus } from '../../common/enums/driver-online-status.enum';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment.enums';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { AdminScopeService } from './admin-scope.service';

export interface AdminAnalyticsSummary {
  regionId?: string;
  orders: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  payments: {
    succeededCount: number;
    totalAmount: number;
  };
  drivers: {
    total: number;
    approved: number;
    pending: number;
    online: number;
  };
}

@Injectable()
export class AdminAnalyticsService {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
    @InjectRepository(DriverProfile)
    private readonly drivers: Repository<DriverProfile>,
    private readonly scope: AdminScopeService,
  ) {}

  async getSummary(
    actor: AuthenticatedUser,
    queryRegionId?: string,
  ): Promise<AdminAnalyticsSummary> {
    const regionId = await this.scope.resolveListRegionId(actor, queryRegionId);

    const orderQb = this.orders.createQueryBuilder('o');
    if (regionId) orderQb.where('o.region_id = :regionId', { regionId });

    const total = await orderQb.clone().getCount();
    const active = await orderQb
      .clone()
      .andWhere('o.status IN (:...active)', {
        active: [
          OrderStatus.Created,
          OrderStatus.SearchingDriver,
          OrderStatus.DriverAssigned,
          OrderStatus.DriverEnRoute,
          OrderStatus.DriverArrived,
          OrderStatus.InProgress,
        ],
      })
      .getCount();
    const completed = await orderQb
      .clone()
      .andWhere('o.status IN (:...done)', {
        done: [OrderStatus.Completed, OrderStatus.Closed],
      })
      .getCount();
    const cancelled = await orderQb
      .clone()
      .andWhere('o.status IN (:...cancelled)', {
        cancelled: [
          OrderStatus.CancelledByClient,
          OrderStatus.CancelledByDriver,
          OrderStatus.CancelledSystem,
        ],
      })
      .getCount();

    const paymentQb = this.payments
      .createQueryBuilder('p')
      .innerJoin('p.order', 'o')
      .where('p.status = :status', { status: PaymentStatus.Succeeded });
    if (regionId) paymentQb.andWhere('o.region_id = :regionId', { regionId });

    const succeededCount = await paymentQb.clone().getCount();
    const amountRow = await paymentQb
      .clone()
      .select('COALESCE(SUM(p.amount), 0)', 'sum')
      .getRawOne<{
        sum: string;
      }>();

    const driverQb = this.drivers.createQueryBuilder('d');
    if (regionId) driverQb.where('d.region_id = :regionId', { regionId });

    const driversTotal = await driverQb.clone().getCount();
    const approved = await driverQb
      .clone()
      .andWhere('d.verification_status = :vs', { vs: VerificationStatus.Approved })
      .getCount();
    const pending = await driverQb
      .clone()
      .andWhere('d.verification_status IN (:...pending)', {
        pending: [VerificationStatus.Pending, VerificationStatus.InReview],
      })
      .getCount();
    const online = await driverQb
      .clone()
      .andWhere('d.online_status = :online', { online: DriverOnlineStatus.Online })
      .getCount();

    return {
      regionId,
      orders: { total, active, completed, cancelled },
      payments: {
        succeededCount,
        totalAmount: Number(amountRow?.sum ?? 0),
      },
      drivers: {
        total: driversTotal,
        approved,
        pending,
        online,
      },
    };
  }
}
