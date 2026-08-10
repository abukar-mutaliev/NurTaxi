import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { VerificationStatus } from '../../common/enums/verification-status.enum';
import { DriverOnlineStatus } from '../../common/enums/driver-online-status.enum';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment.enums';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { OrderStatusLog } from '../orders/entities/order-status-log.entity';
import { AdminScopeService } from './admin-scope.service';
import type { AdminReportType } from './dto/admin-analytics.dto';

const ASSIGNMENT_TARGET_SECONDS = 30;

export interface AdminAnalyticsKpi {
  avgAssignmentSeconds: number | null;
  assignmentTargetSeconds: number;
  orderSuccessRate: number;
  paymentSuccessRate: number;
  driverAvailabilityRate: number;
}

export interface AdminAnalyticsTimeseriesPoint {
  date: string;
  orders: number;
  completed: number;
  revenue: number;
}

export interface AdminAnalyticsSummary {
  regionId?: string;
  period: { from: string; to: string };
  orders: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  payments: {
    succeededCount: number;
    failedCount: number;
    totalAmount: number;
  };
  drivers: {
    total: number;
    approved: number;
    pending: number;
    online: number;
  };
  kpi: AdminAnalyticsKpi;
  timeseries: AdminAnalyticsTimeseriesPoint[];
}

export interface AdminReportRow {
  [key: string]: string | number | null;
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
    @InjectRepository(OrderStatusLog)
    private readonly statusLogs: Repository<OrderStatusLog>,
    private readonly scope: AdminScopeService,
  ) {}

  private resolvePeriod(from?: string, to?: string): { from: Date; to: Date } {
    const now = new Date();
    const toDate = to ? new Date(to) : now;
    const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: fromDate, to: toDate };
  }

  async getSummary(
    actor: AuthenticatedUser,
    queryRegionId?: string,
    from?: string,
    to?: string,
  ): Promise<AdminAnalyticsSummary> {
    const regionId = await this.scope.resolveListRegionId(actor, queryRegionId);
    const period = this.resolvePeriod(from, to);

    const orderQb = this.orders
      .createQueryBuilder('o')
      .where('o.created_at >= :from', { from: period.from })
      .andWhere('o.created_at <= :to', { to: period.to });
    if (regionId) orderQb.andWhere('o.region_id = :regionId', { regionId });

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

    const paymentBaseQb = this.payments
      .createQueryBuilder('p')
      .innerJoin('p.order', 'o')
      .where('p.created_at >= :from', { from: period.from })
      .andWhere('p.created_at <= :to', { to: period.to });
    if (regionId) paymentBaseQb.andWhere('o.region_id = :regionId', { regionId });

    const succeededCount = await paymentBaseQb
      .clone()
      .andWhere('p.status = :status', { status: PaymentStatus.Succeeded })
      .getCount();
    const failedCount = await paymentBaseQb
      .clone()
      .andWhere('p.status = :status', { status: PaymentStatus.Failed })
      .getCount();

    const amountRow = await paymentBaseQb
      .clone()
      .andWhere('p.status = :status', { status: PaymentStatus.Succeeded })
      .select('COALESCE(SUM(p.amount), 0)', 'sum')
      .getRawOne<{ sum: string }>();

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

    const avgAssignmentSeconds = await this.calcAvgAssignmentSeconds(
      regionId,
      period.from,
      period.to,
    );

    const finishedAttempts = completed + cancelled;
    const orderSuccessRate =
      finishedAttempts > 0 ? Math.round((completed / finishedAttempts) * 1000) / 10 : 0;

    const paymentAttempts = succeededCount + failedCount;
    const paymentSuccessRate =
      paymentAttempts > 0 ? Math.round((succeededCount / paymentAttempts) * 1000) / 10 : 0;

    const driverAvailabilityRate =
      approved > 0 ? Math.round((online / approved) * 1000) / 10 : 0;

    const timeseries = await this.buildTimeseries(regionId, period.from, period.to);

    return {
      regionId,
      period: { from: period.from.toISOString(), to: period.to.toISOString() },
      orders: { total, active, completed, cancelled },
      payments: {
        succeededCount,
        failedCount,
        totalAmount: Number(amountRow?.sum ?? 0),
      },
      drivers: { total: driversTotal, approved, pending, online },
      kpi: {
        avgAssignmentSeconds,
        assignmentTargetSeconds: ASSIGNMENT_TARGET_SECONDS,
        orderSuccessRate,
        paymentSuccessRate,
        driverAvailabilityRate,
      },
      timeseries,
    };
  }

  async getReport(
    actor: AuthenticatedUser,
    type: AdminReportType,
    queryRegionId?: string,
    from?: string,
    to?: string,
  ): Promise<AdminReportRow[]> {
    const regionId = await this.scope.resolveListRegionId(actor, queryRegionId);
    const period = this.resolvePeriod(from, to);

    switch (type) {
      case 'orders':
        return this.reportOrders(regionId, period.from, period.to);
      case 'drivers':
        return this.reportDrivers(regionId);
      case 'finance':
        return this.reportFinance(regionId, period.from, period.to);
      default:
        return [];
    }
  }

  private async calcAvgAssignmentSeconds(
    regionId: string | undefined,
    from: Date,
    to: Date,
  ): Promise<number | null> {
    const qb = this.statusLogs
      .createQueryBuilder('l')
      .innerJoin('l.order', 'o')
      .where('l.to_status = :assigned', { assigned: OrderStatus.DriverAssigned })
      .andWhere('o.created_at >= :from', { from })
      .andWhere('o.created_at <= :to', { to })
      .select('AVG(EXTRACT(EPOCH FROM (l.created_at - o.created_at)))', 'avg');
    if (regionId) qb.andWhere('o.region_id = :regionId', { regionId });

    const row = await qb.getRawOne<{ avg: string | null }>();
    if (!row?.avg) return null;
    return Math.round(Number(row.avg) * 10) / 10;
  }

  private async buildTimeseries(
    regionId: string | undefined,
    from: Date,
    to: Date,
  ): Promise<AdminAnalyticsTimeseriesPoint[]> {
    const ordersQb = this.orders
      .createQueryBuilder('o')
      .select("DATE_TRUNC('day', o.created_at)", 'day')
      .addSelect('COUNT(*)', 'orders')
      .addSelect(
        `SUM(CASE WHEN o.status IN ('${OrderStatus.Completed}', '${OrderStatus.Closed}') THEN 1 ELSE 0 END)`,
        'completed',
      )
      .where('o.created_at >= :from', { from })
      .andWhere('o.created_at <= :to', { to })
      .groupBy("DATE_TRUNC('day', o.created_at)")
      .orderBy('day', 'ASC');
    if (regionId) ordersQb.andWhere('o.region_id = :regionId', { regionId });

    const orderRows = await ordersQb.getRawMany<{
      day: Date;
      orders: string;
      completed: string;
    }>();

    const revenueQb = this.payments
      .createQueryBuilder('p')
      .innerJoin('p.order', 'o')
      .select("DATE_TRUNC('day', p.created_at)", 'day')
      .addSelect('COALESCE(SUM(p.amount), 0)', 'revenue')
      .where('p.status = :status', { status: PaymentStatus.Succeeded })
      .andWhere('p.created_at >= :from', { from })
      .andWhere('p.created_at <= :to', { to })
      .groupBy("DATE_TRUNC('day', p.created_at)");
    if (regionId) revenueQb.andWhere('o.region_id = :regionId', { regionId });

    const revenueRows = await revenueQb.getRawMany<{ day: Date; revenue: string }>();
    const revenueByDay = new Map(
      revenueRows.map((r) => [new Date(r.day).toISOString().slice(0, 10), Number(r.revenue)]),
    );

    return orderRows.map((row) => {
      const date = new Date(row.day).toISOString().slice(0, 10);
      return {
        date,
        orders: Number(row.orders),
        completed: Number(row.completed),
        revenue: revenueByDay.get(date) ?? 0,
      };
    });
  }

  private async reportOrders(
    regionId: string | undefined,
    from: Date,
    to: Date,
  ): Promise<AdminReportRow[]> {
    const rows = await this.orders.find({
      where: {
        createdAt: Between(from, to),
        ...(regionId ? { regionId } : {}),
      },
      relations: ['client', 'driver'],
      order: { createdAt: 'DESC' },
      take: 5000,
    });

    return rows.map((o) => ({
      id: o.id,
      status: o.status,
      pickup: o.pickupAddress,
      dropoff: o.dropoffAddress,
      priceEstimated: Number(o.priceEstimated),
      priceFinal: o.priceFinal ? Number(o.priceFinal) : null,
      paymentMethod: o.paymentMethod,
      clientPhone: o.client?.phone ?? null,
      driverName: o.driver?.fullName ?? null,
      createdAt: o.createdAt.toISOString(),
    }));
  }

  private async reportDrivers(regionId: string | undefined): Promise<AdminReportRow[]> {
    const rows = await this.drivers.find({
      where: regionId ? { regionId } : {},
      relations: ['user'],
      order: { fullName: 'ASC' },
      take: 5000,
    });

    return rows.map((d) => ({
      id: d.id,
      fullName: d.fullName,
      phone: d.user?.phone ?? null,
      verificationStatus: d.verificationStatus,
      onlineStatus: d.onlineStatus,
      rating: Number(d.rating),
      tripsCount: d.tripsCount,
      regionId: d.regionId,
    }));
  }

  private async reportFinance(
    regionId: string | undefined,
    from: Date,
    to: Date,
  ): Promise<AdminReportRow[]> {
    const qb = this.payments
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.order', 'o')
      .where('p.created_at >= :from', { from })
      .andWhere('p.created_at <= :to', { to })
      .orderBy('p.created_at', 'DESC')
      .take(5000);
    if (regionId) qb.andWhere('o.region_id = :regionId', { regionId });

    const rows = await qb.getMany();

    return rows.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      status: p.status,
      amount: Number(p.amount),
      currency: p.currency,
      createdAt: p.createdAt.toISOString(),
    }));
  }
}
