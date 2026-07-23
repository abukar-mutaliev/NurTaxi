import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { EventBusService } from '../../messaging/event-bus.service';
import { SMS_PROVIDER, type SmsProvider } from '../auth/sms/sms-provider.interface';
import { EmergencyContactsService } from '../users/emergency-contacts.service';
import { RealtimeBroadcastService } from '../realtime/realtime-broadcast.service';
import { OrdersService } from '../orders/orders.service';
import { DriversService } from '../drivers/drivers.service';
import { SosEvent } from './entities/sos-event.entity';

export interface ActivateSosDto {
  lat: number;
  lng: number;
  contactIds?: string[];
}

@Injectable()
export class SosService {
  constructor(
    @InjectRepository(SosEvent)
    private readonly sosEvents: Repository<SosEvent>,
    private readonly ordersService: OrdersService,
    private readonly driversService: DriversService,
    private readonly emergencyContacts: EmergencyContactsService,
    private readonly broadcast: RealtimeBroadcastService,
    private readonly eventBus: EventBusService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  async activate(clientId: string, orderId: string, dto: ActivateSosDto): Promise<SosEvent> {
    const order = await this.ordersService.getOrderForUser(clientId, orderId, 'client');

    const trackableStatuses: OrderStatus[] = [
      OrderStatus.DriverAssigned,
      OrderStatus.DriverEnRoute,
      OrderStatus.DriverArrived,
      OrderStatus.InProgress,
    ];

    if (!trackableStatuses.includes(order.status)) {
      throw new BadRequestException({
        code: 'SOS_NOT_ALLOWED',
        message: 'SOS доступен только во время активной поездки с водителем',
      });
    }

    let driverInfo: Record<string, unknown> | null = null;
    let vehicleInfo: Record<string, unknown> | null = null;

    if (order.driverId) {
      const driver = await this.driversService.getProfileByDriverId(order.driverId);
      const vehicle = driver.vehicles?.find((v) => v.isPrimary) ?? driver.vehicles?.[0];
      driverInfo = {
        id: driver.id,
        fullName: driver.fullName,
        phone: driver.user?.phone ?? null,
        rating: Number(driver.rating),
      };
      vehicleInfo = vehicle
        ? {
            make: vehicle.make,
            model: vehicle.model,
            plateNumber: vehicle.plateNumber,
            color: vehicle.color,
          }
        : null;
    }

    const payload = {
      orderId: order.id,
      status: order.status,
      pickup: { lat: order.pickupLat, lng: order.pickupLng, address: order.pickupAddress },
      dropoff: { lat: order.dropoffLat, lng: order.dropoffLng, address: order.dropoffAddress },
      clientLocation: { lat: dto.lat, lng: dto.lng },
      driver: driverInfo,
      vehicle: vehicleInfo,
      trackingUrl: `/orders/${order.id}/track`,
      activatedAt: new Date().toISOString(),
    };

    const allContacts = await this.emergencyContacts.findByUserId(clientId);
    let targets = allContacts;

    if (dto.contactIds?.length) {
      const idSet = new Set(dto.contactIds);
      targets = allContacts.filter((c) => idSet.has(c.id));
      if (targets.length === 0) {
        throw new BadRequestException({
          code: 'INVALID_CONTACTS',
          message: 'Укажите действительные контакты',
        });
      }
    }

    if (targets.length === 0) {
      throw new BadRequestException({
        code: 'NO_EMERGENCY_CONTACTS',
        message: 'Добавьте экстренные контакты в профиле',
      });
    }

    const smsText = this.buildSosMessage(payload);
    const notified: string[] = [];

    for (const contact of targets) {
      await this.sms.sendMessage(contact.phone, smsText);
      notified.push(contact.id);
    }

    const event = await this.sosEvents.save(
      this.sosEvents.create({
        orderId: order.id,
        clientId,
        lat: dto.lat,
        lng: dto.lng,
        payload,
        contactsNotified: notified,
      }),
    );

    await this.broadcast.publishSos(order.id, payload);
    await this.broadcast.publish(`client:${clientId}`, 'sos.activated', payload);

    this.eventBus.publish('sos.activated', {
      orderId: order.id,
      clientId,
      sosEventId: event.id,
      contactsNotified: notified,
    });

    return event;
  }

  private buildSosMessage(payload: Record<string, unknown>): string {
    const driver = payload.driver as { fullName?: string; phone?: string } | null;
    const vehicle = payload.vehicle as {
      make?: string;
      model?: string;
      plateNumber?: string;
    } | null;
    const loc = payload.clientLocation as { lat: number; lng: number };

    const parts = [
      'SOS Nur Taxi!',
      `Координаты: ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`,
      `Статус: ${payload.status}`,
    ];

    if (driver?.fullName)
      parts.push(`Водитель: ${driver.fullName}${driver.phone ? ` (${driver.phone})` : ''}`);
    if (vehicle) parts.push(`Авто: ${vehicle.make} ${vehicle.model}, ${vehicle.plateNumber}`);

    return parts.join('. ');
  }
}
