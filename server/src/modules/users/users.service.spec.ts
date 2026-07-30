import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from '../../common/enums/role.enum';
import { S3StorageService } from '../storage/s3-storage.service';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const store = new Map<string, User>();

  const repoMock = {
    findOne: jest.fn(({ where }: { where: Partial<User> }) => {
      const found = [...store.values()].find(
        (u) => (where.id && u.id === where.id) || (where.phone && u.phone === where.phone),
      );
      return Promise.resolve(found ?? null);
    }),
    create: jest.fn((data: Partial<User>) => data as User),
    save: jest.fn((user: User) => {
      user.id = user.id ?? 'generated-id';
      user.createdAt = user.createdAt ?? new Date();
      store.set(user.id, user);
      return Promise.resolve(user);
    }),
  };

  beforeEach(async () => {
    store.clear();
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repoMock },
        {
          provide: S3StorageService,
          useValue: {
            buildUserPhotoKey: jest.fn(),
            createUploadUrl: jest.fn(),
            createDownloadUrl: jest.fn(),
          },
        },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('создаёт нового клиента при первом входе', async () => {
    const { user, isNew } = await service.findOrCreateClient('+79280000000');
    expect(isNew).toBe(true);
    expect(user.role).toBe(Role.Client);
    expect(user.phone).toBe('+79280000000');
  });

  it('возвращает существующего пользователя без создания', async () => {
    await service.findOrCreateClient('+79280000000');
    const { isNew } = await service.findOrCreateClient('+79280000000');
    expect(isNew).toBe(false);
  });

  it('фиксирует факт согласия на обработку ПДн', async () => {
    const { user } = await service.findOrCreateClient('+79280000000');
    const updated = await service.recordConsent(user.id, '1.0');
    expect(updated.pdnConsentAt).toBeInstanceOf(Date);
    expect(updated.pdnConsentVersion).toBe('1.0');
  });
});
