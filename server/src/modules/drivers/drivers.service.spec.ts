import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { DocumentType } from '../../common/enums/document-type.enum';
import { DriverOnlineStatus } from '../../common/enums/driver-online-status.enum';
import { VerificationStatus } from '../../common/enums/verification-status.enum';
import { EventBusService } from '../../messaging/event-bus.service';
import { LedgerService } from '../payments/ledger.service';
import { S3StorageService } from '../storage/s3-storage.service';
import { UsersService } from '../users/users.service';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
  User,
} from '../users/entities/user.entity';
import { RegionsService } from '../regions/regions.service';
import { Region } from '../regions/entities/region.entity';
import { DriverLocationService } from './location/driver-location.service';
import { DriverProfile } from './entities/driver-profile.entity';
import { DriverDocument } from './entities/driver-document.entity';
import { Vehicle } from './entities/vehicle.entity';
import { DriversService } from './drivers.service';
import { DOCUMENT_AUTO_VERIFIER } from './verification/document-auto-verifier.interface';
import { NoOpDocumentAutoVerifier } from './verification/noop-document-auto-verifier';

describe('DriversService', () => {
  let service: DriversService;

  const regionId = '00000000-0000-4000-8000-000000000001';
  const userId = 'user-1';

  const user: User = {
    id: userId,
    phone: '+79280000001',
    name: null,
    photoUrl: null,
    role: Role.Client,
    language: 'ru',
    status: UserStatus.Active,
    privacySettings: DEFAULT_PRIVACY_SETTINGS,
    notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
    pdnConsentAt: new Date(),
    pdnConsentVersion: '1.0',
    assignedRegionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const region: Region = {
    id: regionId,
    name: 'Республика Ингушетия',
    isActive: true,
    timezone: 'Europe/Moscow',
    currency: 'RUB',
    featureFlags: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let driverStore: DriverProfile | null = null;
  const documentStore = new Map<string, DriverDocument>();

  const usersServiceMock = {
    getByIdOrThrow: jest.fn((id: string) => {
      if (id === userId) return Promise.resolve({ ...user });
      return Promise.reject(new Error('not found'));
    }),
  };

  const driversRepoMock = {
    findOne: jest.fn(({ where }: { where: Partial<DriverProfile> }) => {
      if (where.userId && driverStore?.userId === where.userId) {
        return Promise.resolve({ ...driverStore, vehicles: [], documents: [] });
      }
      if (where.id && driverStore?.id === where.id) {
        return Promise.resolve({ ...driverStore });
      }
      return Promise.resolve(null);
    }),
    findOneOrFail: jest.fn(({ where }: { where: Partial<DriverProfile> }) => {
      if (where.id === driverStore?.id) return Promise.resolve({ ...driverStore! });
      throw new Error('not found');
    }),
    find: jest.fn(() => Promise.resolve(driverStore ? [{ ...driverStore }] : [])),
    create: jest.fn(
      (data: Partial<DriverProfile>) => ({ ...data, id: 'driver-1' }) as DriverProfile,
    ),
    save: jest.fn((profile: DriverProfile) => {
      driverStore = {
        ...profile,
        vehicles: profile.vehicles ?? [],
        documents: profile.documents ?? [],
      };
      return Promise.resolve(driverStore);
    }),
    manager: {
      getRepository: jest.fn(() => ({
        save: jest.fn((u: User) => Promise.resolve(u)),
      })),
    },
  };

  const documentsRepoMock = {
    findOne: jest.fn(({ where }: { where: Partial<DriverDocument> }) => {
      for (const doc of documentStore.values()) {
        if (where.id && doc.id === where.id) return Promise.resolve(doc);
        if (
          where.driverId &&
          where.type &&
          doc.driverId === where.driverId &&
          doc.type === where.type
        ) {
          return Promise.resolve(doc);
        }
      }
      return Promise.resolve(null);
    }),
    find: jest.fn(({ where }: { where: Partial<DriverDocument> }) => {
      const docs = [...documentStore.values()].filter((d) => d.driverId === where.driverId);
      return Promise.resolve(docs);
    }),
    create: jest.fn(
      (data: Partial<DriverDocument>) =>
        ({ ...data, id: `doc-${documentStore.size + 1}` }) as DriverDocument,
    ),
    save: jest.fn((doc: DriverDocument) => {
      documentStore.set(doc.id, doc);
      return Promise.resolve(doc);
    }),
  };

  const vehiclesRepoMock = {
    findOne: jest.fn(() => Promise.resolve(null)),
    create: jest.fn((data: Partial<Vehicle>) => ({ ...data, id: 'vehicle-1' }) as Vehicle),
    save: jest.fn((v: Vehicle) => Promise.resolve(v)),
  };

  const regionsServiceMock = {
    getRegionOrThrow: jest.fn((id: string) => {
      if (id === regionId) return Promise.resolve({ ...region });
      return Promise.reject(new Error('not found'));
    }),
    listActiveRegions: jest.fn(() => Promise.resolve([region])),
  };

  const driverLocationMock = {
    updateLocation: jest.fn(),
    removeLocation: jest.fn(),
    findNearby: jest.fn(),
  };

  const storageMock = {
    buildDriverDocumentKey: jest.fn(() => 'drivers/driver-1/passport/1.jpg'),
    createUploadUrl: jest.fn(() =>
      Promise.resolve({ uploadUrl: 'https://s3/upload', storageKey: 'key', expiresInSec: 900 }),
    ),
    createDownloadUrl: jest.fn(() =>
      Promise.resolve({ downloadUrl: 'https://s3/download', expiresInSec: 300 }),
    ),
  };

  const eventBusMock = { publish: jest.fn() };

  beforeEach(async () => {
    driverStore = null;
    documentStore.clear();
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        DriversService,
        { provide: getRepositoryToken(DriverProfile), useValue: driversRepoMock },
        { provide: getRepositoryToken(DriverDocument), useValue: documentsRepoMock },
        { provide: getRepositoryToken(Vehicle), useValue: vehiclesRepoMock },
        { provide: RegionsService, useValue: regionsServiceMock },
        { provide: DriverLocationService, useValue: driverLocationMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: S3StorageService, useValue: storageMock },
        { provide: EventBusService, useValue: eventBusMock },
        {
          provide: LedgerService,
          useValue: {
            getDriverBalance: jest.fn().mockResolvedValue(0),
            sumDriverCreditsSince: jest.fn().mockResolvedValue(0),
          },
        },
        { provide: DOCUMENT_AUTO_VERIFIER, useClass: NoOpDocumentAutoVerifier },
      ],
    }).compile();

    service = moduleRef.get(DriversService);
  });

  const registerDto = {
    fullName: 'Иванова Мария',
    birthDate: '1990-01-01',
    residenceAddress: 'г. Назрань',
    drivingExperienceYears: 5,
    regionId,
    vehicle: {
      make: 'Hyundai',
      model: 'Solaris',
      plateNumber: 'A123BC06',
      color: 'белый',
      year: 2020,
    },
  };

  it('регистрирует водителя и меняет роль на driver', async () => {
    const profile = await service.register(userId, registerDto);
    expect(profile.fullName).toBe('Иванова Мария');
    expect(profile.verificationStatus).toBe(VerificationStatus.Draft);
  });

  it('не даёт выйти на линию без верификации', async () => {
    await service.register(userId, registerDto);
    await expect(service.updateOnlineStatus(userId, 'online')).rejects.toMatchObject({
      response: { code: 'NOT_VERIFIED' },
    });
  });

  it('даёт выйти на линию после approved', async () => {
    await service.register(userId, registerDto);
    driverStore!.verificationStatus = VerificationStatus.Approved;
    const profile = await service.updateOnlineStatus(userId, 'online');
    expect(profile.onlineStatus).toBe(DriverOnlineStatus.Online);
  });

  it('требует полный комплект документов перед submit', async () => {
    await service.register(userId, registerDto);
    await expect(service.submitForReview(userId)).rejects.toMatchObject({
      response: { code: 'DOCUMENTS_INCOMPLETE' },
    });
  });

  it('переводит в pending после загрузки всех документов', async () => {
    await service.register(userId, registerDto);
    for (const type of Object.values(DocumentType)) {
      await service.registerDocument(userId, {
        type,
        storageKey: `drivers/driver-1/${type}/file.jpg`,
        contentType: 'image/jpeg',
      });
    }
    const status = await service.syncVerificationStatus('driver-1');
    expect(status).toBe(VerificationStatus.Pending);
  });
});
