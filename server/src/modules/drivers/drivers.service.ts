import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { DocumentStatus } from '../../common/enums/document-status.enum';
import { DocumentType } from '../../common/enums/document-type.enum';
import {
  DriverRequirementKey,
  RequirementMode,
  isRequirementMandatory,
  requiredDocumentTypesFor,
  resolveDriverRequirements,
  type DriverRequirements,
} from '../../common/enums/driver-requirement.enum';
import { DriverOnlineStatus } from '../../common/enums/driver-online-status.enum';
import { VerificationStatus } from '../../common/enums/verification-status.enum';
import { EventBusService } from '../../messaging/event-bus.service';
import { S3StorageService } from '../storage/s3-storage.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { RegionsService } from '../regions/regions.service';
import { DriverLocationService } from './location/driver-location.service';
import { DriverProfile } from './entities/driver-profile.entity';
import { DriverDocument } from './entities/driver-document.entity';
import { DriverTaxiPermit, isPermitExpired } from './entities/driver-taxi-permit.entity';
import { Vehicle } from './entities/vehicle.entity';
import {
  DOCUMENT_AUTO_VERIFIER,
  type DocumentAutoVerifier,
} from './verification/document-auto-verifier.interface';
import type {
  RegisterDriverDto,
  RegisterDocumentDto,
  PresignDocumentDto,
  AdminUpdateDriverDto,
  TaxiPermitDto,
} from './dto/drivers.dto';
import type { WorkSchedule } from './entities/work-schedule.types';
import { LedgerService } from '../payments/ledger.service';
import { Payout } from '../payments/entities/payout.entity';
import { TaxiRegistryService } from '../taxi-registry/taxi-registry.service';

const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(DriverProfile)
    private readonly drivers: Repository<DriverProfile>,
    @InjectRepository(DriverDocument)
    private readonly documents: Repository<DriverDocument>,
    @InjectRepository(Vehicle)
    private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(DriverTaxiPermit)
    private readonly taxiPermits: Repository<DriverTaxiPermit>,
    private readonly regionsService: RegionsService,
    private readonly driverLocation: DriverLocationService,
    private readonly usersService: UsersService,
    private readonly storage: S3StorageService,
    private readonly eventBus: EventBusService,
    @Inject(DOCUMENT_AUTO_VERIFIER)
    private readonly autoVerifier: DocumentAutoVerifier,
    private readonly ledgerService: LedgerService,
    @Optional() private readonly taxiRegistry?: TaxiRegistryService,
  ) {}

  listActiveRegions() {
    return this.regionsService.listActiveRegions();
  }

  async getProfileByUserId(userId: string): Promise<DriverProfile> {
    const profile = await this.drivers.findOne({
      where: { userId },
      relations: ['user', 'vehicles', 'documents', 'region', 'taxiPermit'],
    });
    if (!profile) {
      throw new NotFoundException({
        code: 'DRIVER_PROFILE_NOT_FOUND',
        message: 'Профиль водителя не найден. Заполните анкету через POST /driver/register',
      });
    }
    return profile;
  }

  /**
   * Регистрация / обновление анкеты водителя (Req §8.2, этап 2).
   */
  async register(userId: string, dto: RegisterDriverDto): Promise<DriverProfile> {
    const user = await this.usersService.getByIdOrThrow(userId);

    if (user.status === UserStatus.Blocked) {
      throw new ForbiddenException({
        code: 'USER_BLOCKED',
        message: 'Аккаунт заблокирован',
      });
    }

    if (user.role !== Role.Client && user.role !== Role.Driver && user.role !== Role.SuperAdmin) {
      throw new ForbiddenException({
        code: 'INVALID_ROLE',
        message: 'Регистрация водителя доступна только клиентам',
      });
    }

    const region = await this.regionsService.getRegionOrThrow(dto.regionId);
    const requirements = resolveDriverRequirements(region.driverRequirements);

    let profile = await this.drivers.findOne({
      where: { userId },
      relations: ['vehicles'],
    });

    if (
      profile &&
      profile.verificationStatus === VerificationStatus.Approved &&
      user.role === Role.Driver
    ) {
      throw new ConflictException({
        code: 'PROFILE_LOCKED',
        message: 'Верифицированный профиль нельзя изменить без обращения в поддержку',
      });
    }

    // Проверяем разрешение до сохранения анкеты, чтобы отказ не оставлял профиль изменённым.
    await this.assertTaxiPermitAcceptable(requirements, profile?.id, dto.taxiPermit);

    if (!profile) {
      profile = this.drivers.create({
        userId,
        fullName: dto.fullName,
        birthDate: dto.birthDate,
        residenceAddress: dto.residenceAddress,
        drivingExperienceYears: dto.drivingExperienceYears,
        regionId: dto.regionId,
        verificationStatus: VerificationStatus.Draft,
        onlineStatus: DriverOnlineStatus.Offline,
      });
    } else {
      profile.fullName = dto.fullName;
      profile.birthDate = dto.birthDate;
      profile.residenceAddress = dto.residenceAddress;
      profile.drivingExperienceYears = dto.drivingExperienceYears;
      profile.regionId = dto.regionId;
      if (profile.verificationStatus === VerificationStatus.Rejected) {
        profile.verificationStatus = VerificationStatus.Draft;
        profile.rejectionReason = null;
      }
    }

    profile = await this.drivers.save(profile);

    await this.upsertPrimaryVehicle(profile.id, dto.vehicle);

    if (
      dto.taxiPermit &&
      requirements[DriverRequirementKey.TaxiPermit] !== RequirementMode.Hidden
    ) {
      await this.upsertTaxiPermit(profile.id, dto.taxiPermit);
    }

    if (user.role === Role.Client) {
      user.role = Role.Driver;
      await this.drivers.manager.getRepository(User).save(user);
    }

    return this.getProfileByUserId(userId);
  }

  private async upsertPrimaryVehicle(
    driverId: string,
    vehicleDto: RegisterDriverDto['vehicle'],
  ): Promise<void> {
    let vehicle = await this.vehicles.findOne({ where: { driverId, isPrimary: true } });

    if (!vehicle) {
      vehicle = this.vehicles.create({ driverId, isPrimary: true, ...vehicleDto });
    } else {
      Object.assign(vehicle, vehicleDto);
    }

    await this.vehicles.save(vehicle);
  }

  // --- Разрешение на деятельность такси (Req §8.2; обязательность — по региону) ---

  /** Режимы требований региона: анкета и комплект документов строятся по ним. */
  private async requirementsForRegion(regionId: string): Promise<DriverRequirements> {
    const region = await this.regionsService.findById(regionId);
    return resolveDriverRequirements(region?.driverRequirements);
  }

  /**
   * Проверяет, что регион либо не требует разрешение, либо оно приходит в анкете
   * (или уже сохранено ранее), и что даты разрешения непротиворечивы.
   */
  private async assertTaxiPermitAcceptable(
    requirements: DriverRequirements,
    driverId: string | undefined,
    dto: TaxiPermitDto | undefined,
  ): Promise<void> {
    if (dto) {
      this.assertPermitDatesValid(dto);
    }

    if (!isRequirementMandatory(requirements, DriverRequirementKey.TaxiPermit) || dto) {
      return;
    }

    const existing = driverId ? await this.taxiPermits.findOne({ where: { driverId } }) : null;
    if (!existing) {
      throw new BadRequestException({
        code: 'TAXI_PERMIT_REQUIRED',
        message: 'В выбранном регионе нужно указать разрешение на деятельность такси',
      });
    }
    if (isPermitExpired(existing.expiresAt)) {
      throw new BadRequestException({
        code: 'TAXI_PERMIT_EXPIRED',
        message: 'Срок действия разрешения истёк — укажите действующее разрешение',
      });
    }
  }

  private assertPermitDatesValid(dto: TaxiPermitDto): void {
    const today = new Date().toISOString().slice(0, 10);
    const issuedAt = dto.issuedAt.slice(0, 10);
    const expiresAt = dto.expiresAt ? dto.expiresAt.slice(0, 10) : null;

    if (issuedAt > today) {
      throw new BadRequestException({
        code: 'TAXI_PERMIT_INVALID_DATES',
        message: 'Дата выдачи разрешения не может быть в будущем',
      });
    }
    if (expiresAt && expiresAt <= issuedAt) {
      throw new BadRequestException({
        code: 'TAXI_PERMIT_INVALID_DATES',
        message: 'Срок действия должен быть позже даты выдачи',
      });
    }
    if (expiresAt && expiresAt < today) {
      throw new BadRequestException({
        code: 'TAXI_PERMIT_EXPIRED',
        message: 'Срок действия разрешения истёк',
      });
    }
  }

  /** Выход на линию в регионе с обязательным разрешением требует действующего разрешения. */
  private async assertTaxiPermitValidForWork(profile: DriverProfile): Promise<void> {
    const requirements = await this.requirementsForRegion(profile.regionId);
    if (!isRequirementMandatory(requirements, DriverRequirementKey.TaxiPermit)) {
      return;
    }

    const permit = await this.taxiPermits.findOne({ where: { driverId: profile.id } });
    if (!permit || isPermitExpired(permit.expiresAt)) {
      throw new ForbiddenException({
        code: 'TAXI_PERMIT_EXPIRED',
        message: 'Обновите разрешение на деятельность такси, чтобы выйти на линию',
        details: { expiresAt: permit?.expiresAt ?? null },
      });
    }
  }

  private async upsertTaxiPermit(driverId: string, dto: TaxiPermitDto): Promise<DriverTaxiPermit> {
    const values = {
      number: dto.number.trim(),
      issuingRegion: dto.issuingRegion.trim(),
      issuedAt: dto.issuedAt.slice(0, 10),
      expiresAt: dto.expiresAt ? dto.expiresAt.slice(0, 10) : null,
    };

    const existing = await this.taxiPermits.findOne({ where: { driverId } });
    const permit = existing
      ? Object.assign(existing, values)
      : this.taxiPermits.create({ driverId, ...values });

    return this.taxiPermits.save(permit);
  }

  async createDocumentUploadUrl(userId: string, dto: PresignDocumentDto) {
    const profile = await this.getProfileByUserId(userId);
    this.assertCanUploadDocuments(profile);

    const extension =
      this.extensionFromFileName(dto.fileName) ?? CONTENT_TYPE_EXT[dto.contentType] ?? 'bin';

    const storageKey = this.storage.buildDriverDocumentKey(profile.id, dto.type, extension);

    return this.storage.createUploadUrl(storageKey, dto.contentType);
  }

  /**
   * Регистрация загруженного документа (Req §8.2, этап 3).
   */
  async registerDocument(userId: string, dto: RegisterDocumentDto): Promise<DriverDocument> {
    const profile = await this.getProfileByUserId(userId);
    this.assertCanUploadDocuments(profile);

    if (!dto.storageKey.startsWith(`drivers/${profile.id}/`)) {
      throw new BadRequestException({
        code: 'INVALID_STORAGE_KEY',
        message: 'Ключ объекта не принадлежит текущему водителю',
      });
    }

    let document = await this.documents.findOne({
      where: { driverId: profile.id, type: dto.type },
    });

    if (document) {
      document.storageKey = dto.storageKey;
      document.contentType = dto.contentType;
      document.status = DocumentStatus.Pending;
      document.moderatorId = null;
      document.rejectionReason = null;
      document.verifiedAt = null;
    } else {
      document = this.documents.create({
        driverId: profile.id,
        type: dto.type,
        storageKey: dto.storageKey,
        contentType: dto.contentType,
        status: DocumentStatus.Pending,
      });
    }

    document = await this.documents.save(document);

    // Хук OCR+AI (Фаза 2.7): если реализация вернёт результат — применяем автоматически.
    const autoResult = await this.autoVerifier.verify(document);
    if (autoResult?.approved) {
      document.status = DocumentStatus.Approved;
      document.verifiedAt = new Date();
      await this.documents.save(document);
    }

    await this.syncVerificationStatus(profile.id);

    if (dto.type === DocumentType.CarPhoto || dto.type === DocumentType.InteriorPhoto) {
      await this.syncVehiclePhotos(profile.id, dto.type, dto.storageKey);
    }

    return document;
  }

  private async syncVehiclePhotos(
    driverId: string,
    type: DocumentType,
    storageKey: string,
  ): Promise<void> {
    const vehicle = await this.vehicles.findOne({ where: { driverId, isPrimary: true } });
    if (!vehicle) return;

    const { downloadUrl } = await this.storage.createDownloadUrl(storageKey);

    if (type === DocumentType.CarPhoto) {
      vehicle.photoUrl = downloadUrl;
    } else if (type === DocumentType.InteriorPhoto) {
      vehicle.interiorPhotoUrl = downloadUrl;
    }

    await this.vehicles.save(vehicle);
  }

  private assertCanUploadDocuments(profile: DriverProfile): void {
    if (
      profile.verificationStatus === VerificationStatus.Approved ||
      profile.verificationStatus === VerificationStatus.InReview
    ) {
      throw new ConflictException({
        code: 'DOCUMENTS_LOCKED',
        message: 'Документы уже на проверке или верифицированы',
      });
    }
  }

  /**
   * Чего не хватает анкете для отправки на проверку с учётом требований региона:
   * комплект документов и реквизиты разрешения считаются вместе, чтобы обязательность
   * блока в регионе задавалась в одном месте.
   */
  private async collectMissingRequirements(
    profile: DriverProfile,
    docs: DriverDocument[],
  ): Promise<{ documents: DocumentType[]; taxiPermit: boolean }> {
    const requirements = await this.requirementsForRegion(profile.regionId);
    const uploadedTypes = new Set(docs.map((d) => d.type));

    const permitMandatory = isRequirementMandatory(requirements, DriverRequirementKey.TaxiPermit);
    const permit = permitMandatory
      ? await this.taxiPermits.findOne({ where: { driverId: profile.id } })
      : null;

    return {
      documents: requiredDocumentTypesFor(requirements).filter((t) => !uploadedTypes.has(t)),
      taxiPermit: permitMandatory && (!permit || isPermitExpired(permit.expiresAt)),
    };
  }

  /** Пересчитывает статус верификации после загрузки/модерации документов. */
  async syncVerificationStatus(driverId: string): Promise<VerificationStatus> {
    const profile = await this.drivers.findOneOrFail({ where: { id: driverId } });
    const docs = await this.documents.find({ where: { driverId } });

    const missing = await this.collectMissingRequirements(profile, docs);

    if (missing.documents.length > 0 || missing.taxiPermit) {
      if (profile.verificationStatus !== VerificationStatus.Rejected) {
        profile.verificationStatus = VerificationStatus.Draft;
      }
      await this.drivers.save(profile);
      return profile.verificationStatus;
    }

    const allApproved = docs.every((d) => d.status === DocumentStatus.Approved);
    const anyRejected = docs.some((d) => d.status === DocumentStatus.Rejected);

    if (allApproved) {
      profile.verificationStatus = VerificationStatus.Approved;
      profile.rejectionReason = null;
      this.eventBus.publish('document.verified', {
        driverId,
        userId: profile.userId,
        regionId: profile.regionId,
      });
    } else if (anyRejected) {
      profile.verificationStatus = VerificationStatus.Rejected;
    } else {
      profile.verificationStatus = VerificationStatus.Pending;
    }

    await this.drivers.save(profile);
    return profile.verificationStatus;
  }

  /** Отправка комплекта документов на ручную проверку. */
  async submitForReview(userId: string): Promise<DriverProfile> {
    const profile = await this.getProfileByUserId(userId);
    const docs = await this.documents.find({ where: { driverId: profile.id } });

    const missing = await this.collectMissingRequirements(profile, docs);

    if (missing.taxiPermit) {
      throw new BadRequestException({
        code: 'TAXI_PERMIT_REQUIRED',
        message: 'Укажите действующее разрешение на деятельность такси',
      });
    }

    if (missing.documents.length > 0) {
      throw new BadRequestException({
        code: 'DOCUMENTS_INCOMPLETE',
        message: 'Загрузите все обязательные документы',
        details: { missing: missing.documents },
      });
    }

    profile.verificationStatus = VerificationStatus.InReview;
    await this.drivers.save(profile);

    return this.getProfileByUserId(userId);
  }

  /**
   * Переключение статуса «на линии / офлайн» (Req §8.2, §12.3).
   */
  async updateOnlineStatus(userId: string, status: 'online' | 'offline'): Promise<DriverProfile> {
    const profile = await this.getProfileByUserId(userId);
    const user = await this.usersService.getByIdOrThrow(userId);

    if (user.status === UserStatus.Blocked) {
      throw new ForbiddenException({
        code: 'USER_BLOCKED',
        message: 'Аккаунт заблокирован',
      });
    }

    if (status === 'online') {
      if (profile.verificationStatus !== VerificationStatus.Approved) {
        throw new ForbiddenException({
          code: 'NOT_VERIFIED',
          message: 'Выход на линию доступен только после верификации документов',
          details: { verificationStatus: profile.verificationStatus },
        });
      }

      if (profile.onlineStatus === DriverOnlineStatus.Busy) {
        throw new ConflictException({
          code: 'DRIVER_BUSY',
          message: 'Нельзя изменить статус во время активной поездки',
        });
      }

      // Верификация могла пройти до истечения разрешения — проверяем срок на каждом выходе.
      await this.assertTaxiPermitValidForWork(profile);
      if (this.taxiRegistry) {
        const gate = await this.taxiRegistry.isDriverAllowedOnLine(profile.id, profile.regionId);
        if (!gate.allowed) {
          throw new ForbiddenException({
            code: 'REGISTRY_CHECK_FAILED',
            message: gate.reason ?? 'Выход на линию запрещён: нет подтверждённого разрешения',
          });
        }
      }

      profile.onlineStatus = DriverOnlineStatus.Online;
    } else {
      if (profile.onlineStatus === DriverOnlineStatus.Busy) {
        throw new ConflictException({
          code: 'DRIVER_BUSY',
          message: 'Нельзя выйти офлайн во время активной поездки',
        });
      }
      profile.onlineStatus = DriverOnlineStatus.Offline;
    }

    await this.drivers.save(profile);

    // Уход в офлайн должен убирать водителя из Redis GEO, иначе подбор продолжит
    // предлагать заказы по последней известной точке (`§15.3`).
    if (status === 'offline') {
      await this.driverLocation.removeLocation(profile.regionId, profile.id);
    }

    return this.getProfileByUserId(userId);
  }

  async updateWorkSchedule(userId: string, workSchedule: WorkSchedule): Promise<DriverProfile> {
    const profile = await this.getProfileByUserId(userId);
    profile.workSchedule = workSchedule;
    await this.drivers.save(profile);
    return this.getProfileByUserId(userId);
  }

  async getEarnings(userId: string) {
    const profile = await this.getProfileByUserId(userId);
    const balance = await this.ledgerService.getDriverBalance(profile.id);

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [today, week, month] = await Promise.all([
      this.ledgerService.sumDriverCreditsSince(profile.id, startOfDay),
      this.ledgerService.sumDriverCreditsSince(profile.id, startOfWeek),
      this.ledgerService.sumDriverCreditsSince(profile.id, startOfMonth),
    ]);

    return { balance, today, week, month };
  }

  async listDocuments(
    userId: string,
    includeViewUrls = false,
  ): Promise<DriverDocument[] | Array<{ doc: DriverDocument; viewUrl: string }>> {
    const profile = await this.getProfileByUserId(userId);
    const docs =
      profile.documents ?? (await this.documents.find({ where: { driverId: profile.id } }));

    if (!includeViewUrls) {
      return docs;
    }

    return Promise.all(
      docs.map(async (doc) => ({
        doc,
        viewUrl: (await this.storage.createDownloadUrl(doc.storageKey)).downloadUrl,
      })),
    );
  }

  // --- Модерация (Req §8.2, этап 4; §7.3) ---

  async listDriversForModeration(
    verificationStatus?: VerificationStatus,
    regionId?: string,
  ): Promise<DriverProfile[]> {
    const where: Record<string, unknown> = {};
    if (verificationStatus) where.verificationStatus = verificationStatus;
    if (regionId) where.regionId = regionId;

    return this.drivers.find({
      where,
      relations: ['user', 'vehicles', 'documents', 'region', 'taxiPermit'],
      order: { updatedAt: 'DESC' },
    });
  }

  async assertDriverInRegion(driverId: string, regionId: string): Promise<DriverProfile> {
    const profile = await this.getDriverForModeration(driverId);
    if (profile.regionId !== regionId) {
      throw new ForbiddenException({
        code: 'REGION_FORBIDDEN',
        message: 'Водитель из другого региона',
      });
    }
    return profile;
  }

  async getDriverForModeration(driverId: string): Promise<DriverProfile> {
    const profile = await this.drivers.findOne({
      where: { id: driverId },
      relations: ['user', 'vehicles', 'documents', 'region', 'taxiPermit'],
    });
    if (!profile) {
      throw new NotFoundException({ code: 'DRIVER_NOT_FOUND', message: 'Водитель не найден' });
    }
    return profile;
  }

  async moderateDocument(
    moderatorId: string,
    driverId: string,
    documentId: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string,
  ): Promise<DriverDocument> {
    if (status === 'rejected' && !rejectionReason?.trim()) {
      throw new BadRequestException({
        code: 'REJECTION_REASON_REQUIRED',
        message: 'Укажите причину отклонения документа',
      });
    }

    const document = await this.documents.findOne({
      where: { id: documentId, driverId },
    });
    if (!document) {
      throw new NotFoundException({ code: 'DOCUMENT_NOT_FOUND', message: 'Документ не найден' });
    }

    document.status = status === 'approved' ? DocumentStatus.Approved : DocumentStatus.Rejected;
    document.moderatorId = moderatorId;
    document.rejectionReason = status === 'rejected' ? rejectionReason!.trim() : null;
    document.verifiedAt = status === 'approved' ? new Date() : null;

    const saved = await this.documents.save(document);
    const profile = await this.getDriverForModeration(driverId);

    if (status === 'rejected') {
      profile.rejectionReason = rejectionReason!.trim();
      profile.verificationStatus = VerificationStatus.Rejected;
      profile.onlineStatus = DriverOnlineStatus.Offline;
      await this.drivers.save(profile);
    } else {
      await this.syncVerificationStatus(driverId);
    }

    return saved;
  }

  /** Блокировка/разблокировка аккаунта водителя (Req §7.4, §12.3). */
  async setDriverAccountStatus(
    driverId: string,
    status: 'active' | 'blocked',
    reason?: string,
  ): Promise<DriverProfile> {
    const profile = await this.getDriverForModeration(driverId);
    const user = profile.user;
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Пользователь не найден' });
    }

    user.status = status === 'blocked' ? UserStatus.Blocked : UserStatus.Active;
    await this.usersService.setStatus(user.id, user.status);

    if (status === 'blocked') {
      profile.onlineStatus = DriverOnlineStatus.Offline;
      profile.rejectionReason = reason?.trim() ?? profile.rejectionReason;
      await this.drivers.save(profile);
    }

    return this.getDriverForModeration(driverId);
  }

  async updateDriverForAdmin(driverId: string, dto: AdminUpdateDriverDto): Promise<DriverProfile> {
    const profile = await this.getDriverForModeration(driverId);

    if (dto.regionId !== undefined) {
      await this.regionsService.getRegionOrThrow(dto.regionId);
      profile.regionId = dto.regionId;
    }
    if (dto.fullName !== undefined) profile.fullName = dto.fullName;
    if (dto.birthDate !== undefined) profile.birthDate = dto.birthDate;
    if (dto.residenceAddress !== undefined) profile.residenceAddress = dto.residenceAddress;
    if (dto.drivingExperienceYears !== undefined) {
      profile.drivingExperienceYears = dto.drivingExperienceYears;
    }

    await this.drivers.save(profile);

    if (dto.vehicle) {
      const vehicle = await this.vehicles.findOne({ where: { driverId, isPrimary: true } });
      if (vehicle) {
        if (dto.vehicle.make !== undefined) vehicle.make = dto.vehicle.make;
        if (dto.vehicle.model !== undefined) vehicle.model = dto.vehicle.model;
        if (dto.vehicle.plateNumber !== undefined) vehicle.plateNumber = dto.vehicle.plateNumber;
        if (dto.vehicle.color !== undefined) vehicle.color = dto.vehicle.color;
        if (dto.vehicle.year !== undefined) vehicle.year = dto.vehicle.year;
        await this.vehicles.save(vehicle);
      }
    }

    if (dto.taxiPermit) {
      this.assertPermitDatesValid(dto.taxiPermit);
      await this.upsertTaxiPermit(driverId, dto.taxiPermit);
    }

    return this.getDriverForModeration(driverId);
  }

  async approveDriverVerification(moderatorId: string, driverId: string): Promise<DriverProfile> {
    const pending = await this.documents.find({
      where: { driverId, status: DocumentStatus.Pending },
    });

    if (pending.length === 0) {
      throw new BadRequestException({
        code: 'NO_PENDING_DOCUMENTS',
        message: 'Нет документов, ожидающих проверки',
      });
    }

    const now = new Date();
    for (const document of pending) {
      document.status = DocumentStatus.Approved;
      document.moderatorId = moderatorId;
      document.rejectionReason = null;
      document.verifiedAt = now;
    }
    await this.documents.save(pending);
    await this.syncVerificationStatus(driverId);

    return this.getDriverForModeration(driverId);
  }

  async deleteDriverForAdmin(driverId: string): Promise<void> {
    const profile = await this.getDriverForModeration(driverId);

    if (profile.onlineStatus === DriverOnlineStatus.Busy) {
      throw new ConflictException({
        code: 'DRIVER_BUSY',
        message: 'Нельзя удалить водителя во время активной поездки',
      });
    }

    const payoutCount = await this.drivers.manager.getRepository(Payout).count({
      where: { driverId },
    });
    if (payoutCount > 0) {
      throw new BadRequestException({
        code: 'DRIVER_HAS_PAYOUTS',
        message: 'Нельзя удалить водителя с историей выплат. Заблокируйте аккаунт.',
      });
    }

    const userId = profile.userId;
    await this.drivers.remove(profile);

    const user = await this.usersService.getByIdOrThrow(userId);
    if (user.role === Role.Driver) {
      user.role = Role.Client;
      await this.drivers.manager.getRepository(User).save(user);
    }
  }

  async getDocumentDownloadUrl(driverId: string, documentId: string) {
    const document = await this.documents.findOne({
      where: { id: documentId, driverId },
    });
    if (!document) {
      throw new NotFoundException({ code: 'DOCUMENT_NOT_FOUND', message: 'Документ не найден' });
    }
    return this.storage.createDownloadUrl(document.storageKey);
  }

  private extensionFromFileName(fileName?: string): string | null {
    if (!fileName) return null;
    const parts = fileName.split('.');
    if (parts.length < 2) return null;
    return parts[parts.length - 1] ?? null;
  }

  async getProfileByDriverId(driverId: string): Promise<DriverProfile> {
    const profile = await this.drivers.findOne({
      where: { id: driverId },
      relations: ['user', 'vehicles'],
    });
    if (!profile) {
      throw new NotFoundException({ code: 'DRIVER_NOT_FOUND', message: 'Водитель не найден' });
    }
    return profile;
  }

  async updateRating(driverId: string, rating: number): Promise<void> {
    const profile = await this.getProfileByDriverId(driverId);
    profile.rating = String(Math.round(rating * 100) / 100);
    await this.drivers.save(profile);
  }

  /** ID водителей со статусом ONLINE в регионе (для матчинга, Des §6). */
  async getOnlineDriverIds(regionId: string): Promise<Set<string>> {
    const online = await this.drivers.find({
      where: {
        regionId,
        onlineStatus: DriverOnlineStatus.Online,
        verificationStatus: VerificationStatus.Approved,
      },
      select: ['id'],
    });
    return new Set(online.map((d) => d.id));
  }

  async updateLocation(userId: string, lat: number, lng: number): Promise<void> {
    const profile = await this.getProfileByUserId(userId);
    // `busy` — водитель уже в заказе: именно тогда клиент должен видеть машину на карте.
    if (
      profile.onlineStatus !== DriverOnlineStatus.Online &&
      profile.onlineStatus !== DriverOnlineStatus.Busy
    ) {
      throw new ConflictException({
        code: 'DRIVER_NOT_ONLINE',
        message: 'Обновление позиции доступно только на линии',
      });
    }
    await this.driverLocation.updateLocation(
      profile.regionId,
      profile.id,
      userId,
      lat,
      lng,
      Number(profile.rating),
    );
  }

  async getCachedLocation(
    regionId: string,
    driverId: string,
  ): Promise<{ lat: number; lng: number } | null> {
    return this.driverLocation.getLocation(regionId, driverId);
  }

  async markBusy(userId: string): Promise<void> {
    const profile = await this.getProfileByUserId(userId);
    profile.onlineStatus = DriverOnlineStatus.Busy;
    await this.drivers.save(profile);
  }

  async markOnlineAfterTrip(userId: string): Promise<void> {
    const profile = await this.getProfileByUserId(userId);
    if (profile.verificationStatus === VerificationStatus.Approved) {
      profile.onlineStatus = DriverOnlineStatus.Online;
      await this.drivers.save(profile);
    }
  }

  async incrementTripsCount(driverId: string): Promise<void> {
    const profile = await this.getProfileByDriverId(driverId);
    profile.tripsCount += 1;
    await this.drivers.save(profile);
  }

  async hasActiveTrip(userId: string): Promise<boolean> {
    const profile = await this.getProfileByUserId(userId);
    return profile.onlineStatus === DriverOnlineStatus.Busy;
  }
}
