import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from '../../common/enums/role.enum';
import { S3StorageService } from '../storage/s3-storage.service';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const store = new Map<string, User>();
  const storageMock = {
    buildUserPhotoKey: jest.fn(
      (userId: string, extension: string) => `users/${userId}/photo/1.${extension}`,
    ),
    createUploadUrl: jest.fn((params: { storageKey: string }) =>
      Promise.resolve({
        uploadUrl: 'https://s3/upload',
        storageKey: params.storageKey,
        expiresInSec: 900,
      }),
    ),
    createDownloadUrl: jest.fn(() =>
      Promise.resolve({ downloadUrl: 'https://s3/download', expiresInSec: 300 }),
    ),
  };

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
          useValue: storageMock,
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

  it('отклоняет presign фото с недопустимым типом', async () => {
    const { user } = await service.findOrCreateClient('+79280000000');
    await expect(
      service.createPhotoUploadUrl(user.id, {
        contentType: 'application/zip',
        contentLength: 100,
      }),
    ).rejects.toMatchObject({ response: { code: 'INVALID_CONTENT_TYPE' } });
  });

  it('отклоняет presign фото больше лимита', async () => {
    const { user } = await service.findOrCreateClient('+79280000000');
    await expect(
      service.createPhotoUploadUrl(user.id, {
        contentType: 'image/jpeg',
        contentLength: 9 * 1024 * 1024,
      }),
    ).rejects.toMatchObject({ response: { code: 'FILE_TOO_LARGE' } });
  });

  it('передаёт размер и тип в подпись S3', async () => {
    const { user } = await service.findOrCreateClient('+79280000000');
    await service.createPhotoUploadUrl(user.id, {
      contentType: 'image/jpeg',
      contentLength: 120_000,
      fileName: 'avatar.jpg',
    });
    expect(storageMock.createUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'image/jpeg',
        contentLength: 120_000,
      }),
    );
  });
});
