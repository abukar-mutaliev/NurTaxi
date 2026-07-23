import {
  ConflictException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status.enum';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { Order } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { OrderTransitionService } from '../orders/order-transition.service';
import { DriversService } from '../drivers/drivers.service';
import { MatchingService } from '../orders/matching/matching.service';
import { PaymentsService } from '../payments/payments.service';
import { assertTransitionAllowed } from '../orders/state/order-state-machine';
import type { AdminOrderStatusDto, AdminRefundDto } from './dto/admin.dto';
import { AdminScopeService } from './admin-scope.service';

@Injectable()
export class AdminOrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
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
    filters: { regionId?: string; status?: OrderStatus; limit?: number },
  ): Promise<Order[]> {
    const regionId = await this.scope.resolveListRegionId(actor, filters.regionId);
    const where: Record<string, unknown> = {};
    if (regionId) where.regionId = regionId;
    if (filters.status) where.status = filters.status;

    return this.orders.find({
      where,
      relations: ['client', 'driver', 'driver.user', 'region', 'tariff'],
      order: { createdAt: 'DESC' },
      take: filters.limit ?? 50,
    });
  }

  async getOrder(actor: AuthenticatedUser, orderId: string): Promise<Order> {
    const order = await this.orders.findOne({
      where: { id: orderId },
      relations: ['client', 'driver', 'driver.user', 'region', 'tariff', 'route'],
    });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Заказ не найден' });
    }
    await this.scope.assertRegionAccess(actor, order.regionId);
    return order;
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
}
