import 'reflect-metadata';
import { DataSource, EntityManager, In } from 'typeorm';
import dataSource from '../data-source';
import { DocumentStatus } from '../../common/enums/document-status.enum';
import { REQUIRED_DOCUMENT_TYPES } from '../../common/enums/document-type.enum';
import { VerificationStatus } from '../../common/enums/verification-status.enum';
import { Role } from '../../common/enums/role.enum';
import { DriverProfile } from '../../modules/drivers/entities/driver-profile.entity';
import { DriverDocument } from '../../modules/drivers/entities/driver-document.entity';
import { User } from '../../modules/users/entities/user.entity';

const DEV_MODERATOR_ID = '00000000-0000-4000-8000-000000000000';

interface CliOptions {
  phone?: string;
  userId?: string;
  driverId?: string;
  allPending: boolean;
  list: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { allPending: false, list: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case '--phone':
        opts.phone = next;
        i += 1;
        break;
      case '--user-id':
        opts.userId = next;
        i += 1;
        break;
      case '--driver-id':
        opts.driverId = next;
        i += 1;
        break;
      case '--all-pending':
        opts.allPending = true;
        break;
      case '--list':
        opts.list = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`Неизвестный аргумент: ${arg}`);
          printHelp();
          process.exit(1);
        }
    }
  }

  return opts;
}

function printHelp(): void {
  console.log(`
Подтверждение документов водителя (dev-скрипт для локального тестирования).

Использование:
  npm run approve-driver -- --phone +79280000001
  npm run approve-driver -- --user-id <uuid>
  npm run approve-driver -- --driver-id <uuid>
  npm run approve-driver -- --all-pending
  npm run approve-driver -- --list

Опции:
  --phone <номер>     Телефон пользователя-водителя
  --user-id <uuid>    ID пользователя (users.id)
  --driver-id <uuid>  ID профиля водителя (driver_profiles.id)
  --all-pending       Подтвердить всех с pending / in_review
  --list              Показать водителей, ожидающих проверки
  -h, --help          Справка

После подтверждения verification_status станет approved — водитель сможет выйти на линию.
`);
}

async function resolveModeratorId(manager: EntityManager): Promise<string> {
  const userRepo = manager.getRepository(User);
  const moderator = await userRepo.findOne({
    where: { role: In([Role.SuperAdmin, Role.Operator, Role.RegionalAdmin]) },
    order: { createdAt: 'ASC' },
  });
  return moderator?.id ?? DEV_MODERATOR_ID;
}

async function findDriverProfiles(
  manager: EntityManager,
  opts: CliOptions,
): Promise<DriverProfile[]> {
  const profileRepo = manager.getRepository(DriverProfile);

  if (opts.allPending) {
    return profileRepo.find({
      where: {
        verificationStatus: In([VerificationStatus.Pending, VerificationStatus.InReview]),
      },
      relations: ['user'],
      order: { updatedAt: 'DESC' },
    });
  }

  if (opts.driverId) {
    const profile = await profileRepo.findOne({
      where: { id: opts.driverId },
      relations: ['user'],
    });
    if (!profile) {
      throw new Error(`Профиль водителя не найден: ${opts.driverId}`);
    }
    return [profile];
  }

  if (opts.userId) {
    const profile = await profileRepo.findOne({
      where: { userId: opts.userId },
      relations: ['user'],
    });
    if (!profile) {
      throw new Error(`Профиль водителя не найден для userId=${opts.userId}`);
    }
    return [profile];
  }

  if (opts.phone) {
    const user = await manager.getRepository(User).findOne({ where: { phone: opts.phone } });
    if (!user) {
      throw new Error(`Пользователь с телефоном ${opts.phone} не найден`);
    }
    const profile = await profileRepo.findOne({
      where: { userId: user.id },
      relations: ['user'],
    });
    if (!profile) {
      throw new Error(`Профиль водителя не найден для ${opts.phone}`);
    }
    return [profile];
  }

  throw new Error('Укажите --phone, --user-id, --driver-id, --all-pending или --list');
}

async function listPendingDrivers(manager: EntityManager): Promise<void> {
  const profiles = await manager.getRepository(DriverProfile).find({
    where: {
      verificationStatus: In([
        VerificationStatus.Draft,
        VerificationStatus.Pending,
        VerificationStatus.InReview,
        VerificationStatus.Rejected,
      ]),
    },
    relations: ['user', 'documents'],
    order: { updatedAt: 'DESC' },
  });

  if (profiles.length === 0) {
    console.log('Нет водителей, ожидающих проверки.');
    return;
  }

  console.log('\nВодители, не прошедшие верификацию:\n');
  console.log('  Телефон       | Статус         | Документов | Имя');
  console.log('  --------------+----------------+------------+---------------------------');

  for (const profile of profiles) {
    const docsCount = profile.documents?.length ?? 0;
    const phone = profile.user?.phone ?? '—';
    console.log(
      `  ${phone.padEnd(13)} | ${profile.verificationStatus.padEnd(14)} | ${String(docsCount).padEnd(10)} | ${profile.fullName}`,
    );
    console.log(`    driver-id: ${profile.id}`);
    console.log(`    user-id:   ${profile.userId}`);
  }

  console.log('\nПодтвердить: npm run approve-driver -- --phone <номер>\n');
}

async function syncVerificationStatus(
  manager: EntityManager,
  driverId: string,
): Promise<VerificationStatus> {
  const profileRepo = manager.getRepository(DriverProfile);
  const documentRepo = manager.getRepository(DriverDocument);

  const profile = await profileRepo.findOneOrFail({ where: { id: driverId } });
  const docs = await documentRepo.find({ where: { driverId } });

  const uploadedTypes = new Set(docs.map((d) => d.type));
  const allUploaded = REQUIRED_DOCUMENT_TYPES.every((t) => uploadedTypes.has(t));

  if (!allUploaded) {
    const missing = REQUIRED_DOCUMENT_TYPES.filter((t) => !uploadedTypes.has(t));
    console.warn(`  ⚠ Не все документы загружены. Отсутствуют: ${missing.join(', ')}`);
    if (profile.verificationStatus !== VerificationStatus.Rejected) {
      profile.verificationStatus = VerificationStatus.Draft;
    }
    await profileRepo.save(profile);
    return profile.verificationStatus;
  }

  const allApproved = docs.every((d) => d.status === DocumentStatus.Approved);
  const anyRejected = docs.some((d) => d.status === DocumentStatus.Rejected);

  if (allApproved) {
    profile.verificationStatus = VerificationStatus.Approved;
    profile.rejectionReason = null;
  } else if (anyRejected) {
    profile.verificationStatus = VerificationStatus.Rejected;
  } else {
    profile.verificationStatus = VerificationStatus.Pending;
  }

  await profileRepo.save(profile);
  return profile.verificationStatus;
}

async function approveDriverDocuments(
  manager: EntityManager,
  profile: DriverProfile,
  moderatorId: string,
): Promise<VerificationStatus> {
  const documentRepo = manager.getRepository(DriverDocument);
  const docs = await documentRepo.find({ where: { driverId: profile.id } });

  if (docs.length === 0) {
    console.warn(`  ⚠ У водителя ${profile.fullName} нет загруженных документов`);
    return profile.verificationStatus;
  }

  const now = new Date();
  for (const doc of docs) {
    doc.status = DocumentStatus.Approved;
    doc.moderatorId = moderatorId;
    doc.rejectionReason = null;
    doc.verifiedAt = now;
    await documentRepo.save(doc);
  }

  const status = await syncVerificationStatus(manager, profile.id);
  return status;
}

async function run(opts: CliOptions): Promise<void> {
  await dataSource.initialize();

  try {
    if (opts.list) {
      await listPendingDrivers(dataSource.manager);
      return;
    }

    const profiles = await findDriverProfiles(dataSource.manager, opts);
    const moderatorId = await resolveModeratorId(dataSource.manager);

    console.log(`\nПодтверждение документов (${profiles.length} водитель(ей))...\n`);

    for (const profile of profiles) {
      const phone = profile.user?.phone ?? profile.userId;
      console.log(`→ ${profile.fullName} (${phone})`);

      const status = await approveDriverDocuments(dataSource.manager, profile, moderatorId);

      if (status === VerificationStatus.Approved) {
        console.log(`  ✓ verification_status = approved — можно выходить на линию\n`);
      } else {
        console.log(`  ✗ verification_status = ${status} — проверьте комплект документов\n`);
      }
    }
  } finally {
    await dataSource.destroy();
  }
}

const opts = parseArgs(process.argv.slice(2));

if (!opts.list && !opts.allPending && !opts.phone && !opts.userId && !opts.driverId) {
  printHelp();
  process.exit(1);
}

run(opts).catch((error: unknown) => {
  console.error('Ошибка:', error instanceof Error ? error.message : error);
  process.exit(1);
});
