import {
  ConflictException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status.enum';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { Order } from '../orders/entities/order.entity';
import { OrderStatusLog } from '../orders/entities/order-status-log.entity';
import { User } from '../users/entities/user.entity';
import { OrdersService } from '../orders/orders.service';
import { OrderTransitionService } from '../orders/order-transition.service';
import { DriversService } from '../drivers/drivers.service';
import { MatchingService } from '../orders/matching/matching.service';
import { PaymentsService } from '../payments/payments.service';
import { assertTransitionAllowed } from '../orders/state/order-state-machine';
import type { AdminOrderStatusDto, AdminRefundDto } from './dto/admin.dto';
import { AdminScopeService } from './admin-scope.service';
import { decodeCursor, encodeCursor } from './dto/pagination.dto';

export interface OrderListPage {
  items: Order[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface NearbyDriverCandidate {
  driverId: string;
  fullName: string;
  phone: string | null;
  rating: number;
  lat: number;
  lng: number;
  distanceM: number;
  vehicle: { make: string; model: string; plateNumber: string } | null;
}

@Injectable()
export class AdminOrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @InjectRepository(OrderStatusLog)
    private readonly statusLogs: Repository<OrderStatusLog>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly scope: AdminScopeService,
    private readonly transitions: OrderTransitionService,
    private readonly driversService: DriversService,
    private readonly matching: MatchingService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  async listOrders(
    actor: AuthenticatedUser,
    filters: {
      regionId?: string;
      status?: OrderStatus;
      limit?: number;
      cursor?: string;
      from?: string;
      to?: string;
      dateField?: 'created' | 'completed';
    },
  ): Promise<OrderListPage> {
    const regionId = await this.scope.resolveListRegionId(actor, filters.regionId);
    const take = Math.min(Math.max(filters.limit ?? 20, 1), 100);

    const qb = this.orders
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.client', 'client')
      .leftJoinAndSelect('order.driver', 'driver')
      .leftJoinAndSelect('driver.user', 'driverUser')
      .leftJoinAndSelect('order.region', 'region')
      .leftJoinAndSelect('order.tariff', 'tariff')
      .orderBy('order.createdAt', 'DESC')
      .addOrderBy('order.id', 'DESC')
      .take(take + 1);

    if (regionId) {
      qb.andWhere('order.regionId = :regionId', { regionId });
    }
    if (filters.status) {
      qb.andWhere('order.status = :status', { status: filters.status });
    }
    if (filters.from) {
      const col = filters.dateField === 'completed' ? 'order.tripEndedAt' : 'order.createdAt';
      qb.andWhere(`${col} >= :from`, { from: new Date(filters.from) });
    }
    if (filters.to) {
      const col = filters.dateField === 'completed' ? 'order.tripEndedAt' : 'order.createdAt';
      qb.andWhere(`${col} <= :to`, { to: new Date(filters.to) });
    }

    const decoded = filters.cursor ? decodeCursor(filters.cursor) : null;
    if (decoded) {
      qb.andWhere(
        '(order.createdAt < :cursorAt OR (order.createdAt = :cursorAt AND order.id < :cursorId))',
        { cursorAt: decoded.createdAt, cursorId: decoded.id },
      );
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const last = items[items.length - 1];

    return {
      items,
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : null,
    };
  }

  async getOrder(actor: AuthenticatedUser, orderId: string): Promise<Order> {
    const order = await this.orders.findOne({
      where: { id: orderId },
      relations: [
        'client',
        'driver',
        'driver.user',
        'driver.vehicles',
        'region',
        'tariff',
        'route',
      ],
    });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Заказ не найден' });
    }
    await this.scope.assertRegionAccess(actor, order.regionId);
    return order;
  }

  async getStatusLogs(actor: AuthenticatedUser, orderId: string): Promise<OrderStatusLog[]> {
    await this.getOrder(actor, orderId);
    return this.statusLogs.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });
  }

  async findNearbyDrivers(
    actor: AuthenticatedUser,
    orderId: string,
  ): Promise<NearbyDriverCandidate[]> {
    const order = await this.getOrder(actor, orderId);
    const onlineIds = await this.driversService.getOnlineDriverIds(order.regionId);
    const ranked = await this.matching.findCandidates(
      order.regionId,
      order.pickupLat,
      order.pickupLng,
      onlineIds,
    );

    const result: NearbyDriverCandidate[] = [];
    for (const candidate of ranked) {
      const profile = await this.driversService.getProfileByDriverId(candidate.driverId);
      const vehicle = profile.vehicles?.find((v) => v.isPrimary) ?? profile.vehicles?.[0] ?? null;
      result.push({
        driverId: candidate.driverId,
        fullName: profile.fullName,
        phone: profile.user?.phone ?? null,
        rating: Number(profile.rating),
        lat: candidate.lat,
        lng: candidate.lng,
        distanceM: candidate.distanceM ?? 0,
        vehicle: vehicle
          ? { make: vehicle.make, model: vehicle.model, plateNumber: vehicle.plateNumber }
          : null,
      });
    }
    return result;
  }

  async assignDriver(
    actor: AuthenticatedUser,
    orderId: string,
    driverProfileId: string,
  ): Promise<Order> {
    const order = await this.getOrder(actor, orderId);

    if (order.status !== OrderStatus.SearchingDriver) {
      throw new ConflictException({
        code: 'INVALID_ORDER_STATE',
        message: 'Назначение доступно только для заказов в поиске водителя',
      });
    }

    const driver = await this.driversService.getProfileByDriverId(driverProfileId);
    await this.scope.assertRegionAccess(actor, driver.regionId);

    if (driver.regionId !== order.regionId) {
      throw new ConflictException({
        code: 'DRIVER_REGION_MISMATCH',
        message: 'Водитель из другого региона',
      });
    }

    if (await this.driversService.hasActiveTrip(driver.userId)) {
      throw new ConflictException({
        code: 'DRIVER_BUSY',
        message: 'У водителя уже есть активная поездка',
      });
    }

    await this.matching.clearOffer(orderId);

    await this.transitions.transition({
      orderId,
      toStatus: OrderStatus.DriverAssigned,
      actorId: actor.id,
      reason: 'ADMIN_ASSIGN',
      mutate: (o) => {
        o.driverId = driver.id;
      },
    });

    await this.driversService.markBusy(driver.userId);
    return this.ordersService.getOrderOrThrow(orderId);
  }

  async changeStatus(
    actor: AuthenticatedUser,
    orderId: string,
    dto: AdminOrderStatusDto,
  ): Promise<Order> {
    const order = await this.getOrder(actor, orderId);
    const toStatus = dto.status as OrderStatus;

    assertTransitionAllowed(order.status, toStatus);

    await this.transitions.transition({
      orderId,
      toStatus,
      actorId: actor.id,
      reason: dto.reason ?? 'ADMIN_STATUS_CHANGE',
    });

    return this.ordersService.getOrderOrThrow(orderId);
  }

  async refund(actor: AuthenticatedUser, orderId: string, dto: AdminRefundDto): Promise<Order> {
    const order = await this.getOrder(actor, orderId);
    await this.paymentsService.refundOrder(order.id, dto.amount, dto.idempotencyKey, dto.reason);
    return this.ordersService.getOrderOrThrow(orderId);
  }

  async resolveActorLabels(logs: OrderStatusLog[]): Promise<Map<string, string>> {
    const actorIds = [...new Set(logs.map((l) => l.actorId).filter(Boolean))] as string[];
    if (!actorIds.length) return new Map();

    const actors = await this.users.findBy({ id: In(actorIds) });
    const map = new Map<string, string>();
    for (const user of actors) {
      map.set(user.id, user.name ?? user.phone);
    }
    return map;
  }
}
