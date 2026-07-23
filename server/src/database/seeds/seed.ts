import 'reflect-metadata';
import { DataSource, EntityManager, In } from 'typeorm';
import dataSource from '../data-source';
import { Role } from '../../common/enums/role.enum';
import { User } from '../../modules/users/entities/user.entity';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
} from '../../modules/users/entities/user.entity';
import { DriverProfile } from '../../modules/drivers/entities/driver-profile.entity';
import { Vehicle } from '../../modules/drivers/entities/vehicle.entity';
import { DriverDocument } from '../../modules/drivers/entities/driver-document.entity';
import { SavedAddress } from '../../modules/users/entities/saved-address.entity';
import { EmergencyContact } from '../../modules/users/entities/emergency-contact.entity';
import { FamilyMember } from '../../modules/users/entities/family-member.entity';
import { FamilyMemberStatus } from '../../common/enums/phase8.enum';
import { Order } from '../../modules/orders/entities/order.entity';
import { OrderRoute } from '../../modules/orders/entities/order-route.entity';
import { OrderStatusLog } from '../../modules/orders/entities/order-status-log.entity';
import { Region } from '../../modules/regions/entities/region.entity';
import { DocumentStatus } from '../../common/enums/document-status.enum';
import { VerificationStatus } from '../../common/enums/verification-status.enum';
import {
  INGUSHETIA_REGION_ID,
  PDN_CONSENT_VERSION,
  SEED_DRIVERS,
  SEED_DOCUMENT_TYPES,
  SEED_IDS,
  SEED_ORDERS,
  SEED_USERS,
  STANDARD_TARIFF_ID,
  USER_DEFAULTS,
} from './seed.constants';

const isFresh = process.argv.includes('--fresh');

async function upsertUser(manager: EntityManager, def: (typeof SEED_USERS)[number]): Promise<User> {
  const repo = manager.getRepository(User);
  const existing =
    (await repo.findOne({ where: { id: def.id } })) ??
    (await repo.findOne({ where: { phone: def.phone } }));

  const payload: Partial<User> = {
    id: def.id,
    phone: def.phone,
    name: def.name,
    role: def.role,
    language: USER_DEFAULTS.language,
    status: USER_DEFAULTS.status,
    privacySettings: DEFAULT_PRIVACY_SETTINGS,
    notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
    pdnConsentAt: new Date('2026-01-01T00:00:00Z'),
    pdnConsentVersion: PDN_CONSENT_VERSION,
    assignedRegionId: def.role === Role.RegionalAdmin ? INGUSHETIA_REGION_ID : null,
  };

  if (existing) {
    Object.assign(existing, payload, { id: existing.id });
    return repo.save(existing);
  }

  return repo.save(repo.create(payload));
}

async function seedUsers(manager: EntityManager): Promise<void> {
  for (const def of SEED_USERS) {
    await upsertUser(manager, def);
  }
}

async function seedDrivers(manager: EntityManager): Promise<void> {
  const profileRepo = manager.getRepository(DriverProfile);
  const vehicleRepo = manager.getRepository(Vehicle);
  const documentRepo = manager.getRepository(DriverDocument);

  for (const def of SEED_DRIVERS) {
    let profile = await profileRepo.findOne({ where: { id: def.profileId } });
    if (!profile) {
      profile = await profileRepo.findOne({ where: { userId: def.userId } });
    }

    const profileData: Partial<DriverProfile> = {
      id: def.profileId,
      userId: def.userId,
      fullName: def.fullName,
      birthDate: '1990-05-15',
      residenceAddress: 'г. Назрань, ул. Кирова, 10',
      drivingExperienceYears: 8,
      regionId: INGUSHETIA_REGION_ID,
      verificationStatus: def.verificationStatus,
      onlineStatus: def.onlineStatus,
      rating: def.rating,
      tripsCount: def.tripsCount,
      workSchedule: {
        mon: { from: '08:00', to: '20:00' },
        tue: { from: '08:00', to: '20:00' },
      },
      balance: '1250.00',
      rejectionReason: null,
    };

    if (profile) {
      Object.assign(profile, profileData, { id: profile.id });
      profile = await profileRepo.save(profile);
    } else {
      profile = await profileRepo.save(profileRepo.create(profileData));
    }

    const vehicleData: Partial<Vehicle> = {
      id: def.vehicleId,
      driverId: profile.id,
      make: 'Hyundai',
      model: 'Solaris',
      plateNumber: def.plateNumber,
      color: 'белый',
      year: 2019,
      isPrimary: true,
    };

    let vehicle = await vehicleRepo.findOne({ where: { id: def.vehicleId } });
    if (!vehicle) {
      vehicle = await vehicleRepo.findOne({ where: { driverId: profile.id, isPrimary: true } });
    }

    if (vehicle) {
      Object.assign(vehicle, vehicleData, { id: vehicle.id, driverId: profile.id });
      await vehicleRepo.save(vehicle);
    } else {
      await vehicleRepo.save(vehicleRepo.create(vehicleData));
    }

    const docStatus =
      def.verificationStatus === VerificationStatus.Approved
        ? DocumentStatus.Approved
        : DocumentStatus.Pending;

    for (const type of SEED_DOCUMENT_TYPES) {
      const storageKey = `seed/drivers/${profile.id}/${type}.jpg`;
      const existingDoc = await documentRepo.findOne({
        where: { driverId: profile.id, type },
      });

      const docData: Partial<DriverDocument> = {
        driverId: profile.id,
        type,
        storageKey,
        contentType: 'image/jpeg',
        status: docStatus,
        moderatorId: docStatus === DocumentStatus.Approved ? SEED_IDS.users.operator : null,
        verifiedAt: docStatus === DocumentStatus.Approved ? new Date() : null,
        rejectionReason: null,
      };

      if (existingDoc) {
        Object.assign(existingDoc, docData);
        await documentRepo.save(existingDoc);
      } else {
        await documentRepo.save(documentRepo.create(docData));
      }
    }
  }
}

async function seedClientExtras(manager: EntityManager): Promise<void> {
  const addressRepo = manager.getRepository(SavedAddress);
  const contactRepo = manager.getRepository(EmergencyContact);

  const addresses = [
    {
      id: SEED_IDS.savedAddresses.client1Home,
      userId: SEED_IDS.users.client1,
      label: 'Дом',
      address: 'г. Назрань, ул. Московская, 12',
      lat: 43.2167,
      lng: 44.7667,
    },
    {
      id: SEED_IDS.savedAddresses.client1Work,
      userId: SEED_IDS.users.client1,
      label: 'Работа',
      address: 'г. Назрань, пр. Базорканова, 45',
      lat: 43.22,
      lng: 44.77,
    },
  ];

  for (const def of addresses) {
    const existing = await addressRepo.findOne({ where: { id: def.id } });
    if (existing) {
      Object.assign(existing, def);
      await addressRepo.save(existing);
    } else {
      await addressRepo.save(addressRepo.create(def));
    }
  }

  const contactDef = {
    id: SEED_IDS.emergencyContacts.client1,
    userId: SEED_IDS.users.client1,
    name: 'Мама',
    phone: '+79280000999',
  };

  const existingContact = await contactRepo.findOne({ where: { id: contactDef.id } });
  if (existingContact) {
    Object.assign(existingContact, contactDef);
    await contactRepo.save(existingContact);
  } else {
    await contactRepo.save(contactRepo.create(contactDef));
  }
}

async function seedFamilyMembers(manager: EntityManager): Promise<void> {
  const repo = manager.getRepository(FamilyMember);
  const def = {
    id: SEED_IDS.familyMembers.client1Client2,
    ownerId: SEED_IDS.users.client1,
    memberPhone: '+79280000002',
    memberUserId: SEED_IDS.users.client2,
    relation: 'сестра',
    permissions: { track: true, notify: true, pay: true },
    status: FamilyMemberStatus.Confirmed,
    confirmCode: null,
    confirmedAt: new Date('2026-01-15T00:00:00Z'),
  };

  const existing = await repo.findOne({ where: { id: def.id } });
  if (existing) {
    Object.assign(existing, def);
    await repo.save(existing);
  } else {
    await repo.save(repo.create(def));
  }
}

async function seedOrders(manager: EntityManager): Promise<void> {
  const orderRepo = manager.getRepository(Order);
  const routeRepo = manager.getRepository(OrderRoute);
  const logRepo = manager.getRepository(OrderStatusLog);

  for (const def of SEED_ORDERS) {
    let order = await orderRepo.findOne({ where: { id: def.id } });

    const orderData: Partial<Order> = {
      id: def.id,
      clientId: def.clientId,
      driverId: def.driverId,
      regionId: INGUSHETIA_REGION_ID,
      tariffId: STANDARD_TARIFF_ID,
      pickupLat: def.pickupLat,
      pickupLng: def.pickupLng,
      pickupAddress: def.pickupAddress,
      dropoffLat: def.dropoffLat,
      dropoffLng: def.dropoffLng,
      dropoffAddress: def.dropoffAddress,
      status: def.status,
      priceEstimated: def.priceEstimated,
      priceFinal: def.priceFinal,
      cancellationFee: def.status.includes('cancelled') ? '0.00' : null,
      paymentMethod: def.paymentMethod,
      comment: def.comment,
      familyMemberId: null,
    };

    if (order) {
      Object.assign(order, orderData, { id: order.id });
      order = await orderRepo.save(order);
    } else {
      order = await orderRepo.save(orderRepo.create(orderData));
    }

    const existingRoute = await routeRepo.findOne({ where: { orderId: order.id } });
    const routeData: Partial<OrderRoute> = {
      orderId: order.id,
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      distanceM: 4200,
      durationS: 780,
    };

    if (existingRoute) {
      Object.assign(existingRoute, routeData);
      await routeRepo.save(existingRoute);
    } else {
      await routeRepo.save(routeRepo.create(routeData));
    }

    const logCount = await logRepo.count({ where: { orderId: order.id } });
    if (logCount === 0) {
      await logRepo.save(
        logRepo.create({
          orderId: order.id,
          fromStatus: null,
          toStatus: def.status,
          actorId: def.clientId,
          reason: 'seed',
        }),
      );
    }
  }
}

async function clearSeedData(manager: EntityManager): Promise<void> {
  const orderIds = Object.values(SEED_IDS.orders);

  await manager.delete(OrderStatusLog, { orderId: In(orderIds) });
  await manager.delete(OrderRoute, { orderId: In(orderIds) });
  await manager.delete(Order, { id: In(orderIds) });

  const driverProfileIds = Object.values(SEED_IDS.driverProfiles);
  await manager.delete(DriverDocument, { driverId: In(driverProfileIds) });
  await manager.delete(Vehicle, { driverId: In(driverProfileIds) });
  await manager.delete(DriverProfile, { id: In(driverProfileIds) });

  await manager.delete(SavedAddress, {
    id: In(Object.values(SEED_IDS.savedAddresses)),
  });
  await manager.delete(EmergencyContact, {
    id: In(Object.values(SEED_IDS.emergencyContacts)),
  });
  await manager.delete(FamilyMember, {
    id: In(Object.values(SEED_IDS.familyMembers)),
  });

  const userIds = Object.values(SEED_IDS.users);
  await manager.delete(User, { id: In(userIds) });
}

function printSummary(): void {
  console.log('\n=== Nur Taxi — тестовые данные загружены ===\n');
  console.log('Авторизация: OTP (паролей нет). В dev код возвращается в ответе API.');
  console.log('  POST /api/v1/auth/otp/request  { "phone": "+7..." }');
  console.log('  POST /api/v1/auth/otp/verify   { "phone": "+7...", "code": "1234" }\n');

  console.log('Пользователи:');
  console.log('  Роль              | Телефон       | Имя');
  console.log('  ------------------+---------------+---------------------------');
  for (const u of SEED_USERS) {
    console.log(`  ${u.role.padEnd(17)} | ${u.phone} | ${u.name}`);
  }

  console.log('\nВодители:');
  console.log('  Имя                 | Статус верификации | На линии');
  for (const d of SEED_DRIVERS) {
    console.log(
      `  ${d.fullName.padEnd(19)} | ${d.verificationStatus.padEnd(18)} | ${d.onlineStatus}`,
    );
  }

  console.log('\nЗаказы: 3 шт. (активный, завершённый, отменённый)');
  console.log(`Регион: ${INGUSHETIA_REGION_ID}, тариф: ${STANDARD_TARIFF_ID}`);
  console.log('\nПовторный запуск: npm run seed');
  console.log('Полная перезагрузка seed-данных: npm run seed:fresh\n');
}

async function seedRegionFlags(manager: EntityManager): Promise<void> {
  await manager.update(Region, INGUSHETIA_REGION_ID, {
    featureFlags: {
      surge_pricing: false,
      family_accounts: true,
      promo_enabled: true,
    },
  });
}

async function runSeed(ds: DataSource): Promise<void> {
  await ds.initialize();

  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    if (isFresh) {
      console.log('Режим --fresh: удаление предыдущих seed-записей...');
      await clearSeedData(queryRunner.manager);
    }

    await seedUsers(queryRunner.manager);
    await seedRegionFlags(queryRunner.manager);
    await seedDrivers(queryRunner.manager);
    await seedClientExtras(queryRunner.manager);
    await seedFamilyMembers(queryRunner.manager);
    await seedOrders(queryRunner.manager);

    await queryRunner.commitTransaction();
    printSummary();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
    await ds.destroy();
  }
}

runSeed(dataSource).catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
