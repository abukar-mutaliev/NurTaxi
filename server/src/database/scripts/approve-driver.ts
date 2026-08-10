/**
 * Одобрение водителя для тестирования (Req §8.2, этап 4).
 *
 * Обычно документы проверяет оператор через админку. Пока её нет, а проверять приложение
 * нужно на своём аккаунте, скрипт делает то же самое напрямую: проставляет всем
 * обязательным документам статус `approved` и переводит профиль в `approved`.
 * Недостающие документы создаются заглушками — файлов в S3 у них нет, для теста это
 * не мешает: проверяется только статус.
 *
 * Без этого водитель не выйдет на линию (`NOT_VERIFIED`) и не получит ни одного заказа:
 * подбор берёт только `approved` + `online`.
 *
 * Примеры:
 *   npm run driver:approve -- --phone=+79280000099
 *   npm run driver:approve -- --phone=+79280000099 --reject   (вернуть в «отклонён»)
 */
import 'reflect-metadata';
import type { DataSource, EntityManager } from 'typeorm';
import dataSource from '../data-source';
import { DocumentStatus } from '../../common/enums/document-status.enum';
import { REQUIRED_DOCUMENT_TYPES } from '../../common/enums/document-type.enum';
import { DriverOnlineStatus } from '../../common/enums/driver-online-status.enum';
import { Role } from '../../common/enums/role.enum';
import { VerificationStatus } from '../../common/enums/verification-status.enum';
import { DriverDocument } from '../../modules/drivers/entities/driver-document.entity';
import { DriverProfile } from '../../modules/drivers/entities/driver-profile.entity';
import { User } from '../../modules/users/entities/user.entity';

interface Args {
  driverId?: string;
  userId?: string;
  phone?: string;
  reject: boolean;
}

class DriverLookupError extends Error {}

/**
 * Находит водителя по id профиля, id пользователя или телефону.
 * Телефон принимается в любом формате — сравнение идёт по одним цифрам.
 */
async function findDriverProfile(
  manager: EntityManager,
  identifier: { driverId?: string; userId?: string; phone?: string },
): Promise<DriverProfile> {
  const drivers = manager.getRepository(DriverProfile);

  if (identifier.driverId) {
    const byId = await drivers.findOne({
      where: { id: identifier.driverId },
      relations: ['user'],
    });
    if (byId) return byId;
    throw new DriverLookupError(`Водитель с профилем ${identifier.driverId} не найден`);
  }

  if (identifier.userId) {
    const byUser = await drivers.findOne({
      where: { userId: identifier.userId },
      relations: ['user'],
    });
    if (byUser) return byUser;
    throw new DriverLookupError(`У пользователя ${identifier.userId} нет профиля водителя`);
  }

  if (identifier.phone) {
    const digits = identifier.phone.replace(/\D/g, '');
    const user = await manager
      .getRepository(User)
      .createQueryBuilder('user')
      .where(`regexp_replace(user.phone, '\\D', '', 'g') = :digits`, { digits })
      .getOne();

    if (!user) {
      throw new DriverLookupError(`Пользователь с телефоном ${identifier.phone} не найден`);
    }

    const byPhone = await drivers.findOne({ where: { userId: user.id }, relations: ['user'] });
    if (byPhone) return byPhone;

    throw new DriverLookupError(`У пользователя ${identifier.phone} нет профиля водителя`);
  }

  throw new DriverLookupError('Укажите профиль водителя: driverId, userId или телефон');
}

const USAGE = `
Одобрение документов водителя (для тестирования).

  npm run driver:approve -- --phone=+79280000011

Кого одобрять (нужен один флаг):
  --phone=<телефон>     телефон в любом формате
  --driver-id=<uuid>    id профиля водителя
  --user-id=<uuid>      id пользователя

Опции:
  --reject              обратное действие: вернуть профиль в статус «отклонён»
`;

function parseArgs(argv: string[]): Args {
  const value = (name: string): string | undefined => {
    const found = argv.find((arg) => arg.startsWith(`--${name}=`));
    return found?.slice(name.length + 3);
  };

  return {
    driverId: value('driver-id'),
    userId: value('user-id'),
    phone: value('phone'),
    reject: argv.includes('--reject'),
  };
}

async function approve(manager: EntityManager, driver: DriverProfile): Promise<void> {
  const documents = manager.getRepository(DriverDocument);

  for (const type of REQUIRED_DOCUMENT_TYPES) {
    const existing = await documents.findOne({ where: { driverId: driver.id, type } });

    if (existing) {
      existing.status = DocumentStatus.Approved;
      existing.rejectionReason = null;
      existing.verifiedAt = new Date();
      await documents.save(existing);
      continue;
    }

    await documents.save(
      documents.create({
        driverId: driver.id,
        type,
        // Заглушка: реального файла нет, ссылка ведёт в никуда и нужна только схеме.
        storageKey: `drivers/${driver.id}/${type}/approved-by-script`,
        contentType: 'image/jpeg',
        status: DocumentStatus.Approved,
        verifiedAt: new Date(),
        rejectionReason: null,
      }),
    );
  }

  driver.verificationStatus = VerificationStatus.Approved;
  driver.rejectionReason = null;
  await manager.getRepository(DriverProfile).save(driver);

  // Роль обязательна: без неё все `/driver/*` вернут 403, даже с одобренным профилем.
  await manager.update(User, { id: driver.userId }, { role: Role.Driver });
}

async function reject(manager: EntityManager, driver: DriverProfile): Promise<void> {
  await manager.update(
    DriverDocument,
    { driverId: driver.id },
    { status: DocumentStatus.Rejected, verifiedAt: null, rejectionReason: 'Отклонено скриптом' },
  );

  driver.verificationStatus = VerificationStatus.Rejected;
  driver.rejectionReason = 'Отклонено скриптом';
  driver.onlineStatus = DriverOnlineStatus.Offline;
  await manager.getRepository(DriverProfile).save(driver);
}

async function run(ds: DataSource, args: Args): Promise<void> {
  await ds.initialize();

  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const driver = await findDriverProfile(queryRunner.manager, args);

    if (args.reject) {
      await reject(queryRunner.manager, driver);
    } else {
      await approve(queryRunner.manager, driver);
    }

    await queryRunner.commitTransaction();

    console.log(`\n${driver.fullName} (${driver.user?.phone ?? '—'})`);
    console.log(`  профиль:     ${driver.id}`);
    console.log(`  верификация: ${driver.verificationStatus}`);
    console.log(
      args.reject
        ? '\nПрофиль отклонён — выйти на линию нельзя.\n'
        : '\nГотово. Перезайдите в приложении или потяните профиль на обновление,' +
            ' затем включите «Выйти на линию».\n',
    );
  } catch (error) {
    if (queryRunner.isTransactionActive) {
      await queryRunner.rollbackTransaction();
    }
    throw error;
  } finally {
    await queryRunner.release();
    await ds.destroy();
  }
}

const args = parseArgs(process.argv.slice(2));

if (process.argv.includes('--help')) {
  console.log(USAGE);
  process.exit(0);
}

if (!args.driverId && !args.userId && !args.phone) {
  console.error(USAGE);
  process.exit(1);
}

run(dataSource, args).catch((error: unknown) => {
  if (error instanceof DriverLookupError) {
    console.error(`\n${error.message}\n`);
    process.exit(1);
  }
  console.error('Не удалось изменить статус водителя:', error);
  process.exit(1);
});
