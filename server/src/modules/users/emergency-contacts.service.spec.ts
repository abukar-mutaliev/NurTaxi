import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmergencyContactsService } from './emergency-contacts.service';
import { EmergencyContact } from './entities/emergency-contact.entity';

describe('EmergencyContactsService', () => {
  let service: EmergencyContactsService;
  const store: EmergencyContact[] = [];

  const repoMock = {
    count: jest.fn(({ where }: { where: { userId: string } }) =>
      Promise.resolve(store.filter((c) => c.userId === where.userId).length),
    ),
    find: jest.fn(({ where }: { where: { userId: string } }) =>
      Promise.resolve(store.filter((c) => c.userId === where.userId)),
    ),
    create: jest.fn((data: Partial<EmergencyContact>) => data as EmergencyContact),
    save: jest.fn((entity: EmergencyContact) => {
      entity.id = entity.id ?? `contact-${store.length + 1}`;
      store.push(entity);
      return Promise.resolve(entity);
    }),
    delete: jest.fn(({ id, userId }: { id: string; userId: string }) => {
      const idx = store.findIndex((c) => c.id === id && c.userId === userId);
      if (idx >= 0) store.splice(idx, 1);
      return Promise.resolve({ affected: idx >= 0 ? 1 : 0 });
    }),
  };

  beforeEach(async () => {
    store.length = 0;
    const moduleRef = await Test.createTestingModule({
      providers: [
        EmergencyContactsService,
        { provide: getRepositoryToken(EmergencyContact), useValue: repoMock },
      ],
    }).compile();
    service = moduleRef.get(EmergencyContactsService);
  });

  it('ограничивает количество контактов до 5', async () => {
    for (let i = 0; i < 5; i++) {
      await service.create('user-1', { name: `Contact ${i}`, phone: `+7928000000${i}` });
    }
    await expect(
      service.create('user-1', { name: 'Extra', phone: '+79280000099' }),
    ).rejects.toMatchObject({ response: { code: 'EMERGENCY_CONTACTS_LIMIT' } });
  });
});
