import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { ACTIVE_ORDER_STATUSES } from '../../common/enums/order-status.enum';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { Order } from './entities/order.entity';
import { EmergencyContact } from '../users/entities/emergency-contact.entity';

/**
 * Авторизация подписки на канал order:{id} (Des §10, Req §8.6, §15.1).
 */
@Injectable()
export class OrderTrackingService {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @InjectRepository(EmergencyContact)
    private readonly emergencyContacts: Repository<EmergencyContact>,
  ) {}
  async canSubscribe(user: AuthenticatedUser, orderId: string): Promise<boolean> {
    const order = await this.orders.findOne({
      where: { id: orderId },
      relations: ['driver', 'driver.user'],
    });
    if (!order) return false;

    if (!ACTIVE_ORDER_STATUSES.includes(order.status)) {
      return false;
    }

    if (order.clientId === user.id) return true;

    if (user.role === Role.Driver && order.driver?.userId === user.id) return true;

    // SOS-контакт: телефон пользователя совпадает с контактом клиента заказа.
    const clientContacts = await this.emergencyContacts.find({ where: { userId: order.clientId } });
    if (
      clientContacts.some((c) => this.normalizePhone(c.phone) === this.normalizePhone(user.phone))
    ) {
      return true;
    }

    // Семейный аккаунт — Фаза 8.
    return false;
  }

  async assertSubscribe(user: AuthenticatedUser, orderId: string): Promise<void> {
    const allowed = await this.canSubscribe(user, orderId);
    if (!allowed) {
      throw new ForbiddenException({
        code: 'TRACKING_FORBIDDEN',
        message: 'Нет доступа к отслеживанию этой поездки',
      });
    }
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }
}
