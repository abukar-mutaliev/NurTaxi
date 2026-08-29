import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { S3StorageService } from '../storage/s3-storage.service';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
  User,
} from './entities/user.entity';
import { ConfirmProfilePhotoDto, PresignProfilePhotoDto } from './dto/profile-photo.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

export const CURRENT_CONSENT_VERSION = '1.0';

const PHOTO_CONTENT_TYPE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const ALLOWED_PHOTO_CONTENT_TYPES = new Set(Object.keys(PHOTO_CONTENT_TYPE_EXT));

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly storage: S3StorageService,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.users.findOne({ where: { phone } });
  }

  async getByIdOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Пользователь не найден' });
    }
    return user;
  }

  /**
   * Возвращает существующего пользователя по телефону или создаёт нового клиента.
   * Используется при подтверждении OTP (регистрация/вход единым флоу, Req §8.1).
   */
  async findOrCreateClient(phone: string): Promise<{ user: User; isNew: boolean }> {
    const existing = await this.findByPhone(phone);
    if (existing) {
      return { user: existing, isNew: false };
    }

    const user = this.users.create({
      phone,
      role: Role.Client,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      privacySettings: DEFAULT_PRIVACY_SETTINGS,
    });
    return { user: await this.users.save(user), isNew: true };
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.getByIdOrThrow(id);

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.photoUrl !== undefined) user.photoUrl = dto.photoUrl;
    if (dto.language !== undefined) user.language = dto.language;
    if (dto.notificationSettings) {
      user.notificationSettings = { ...user.notificationSettings, ...dto.notificationSettings };
    }
    if (dto.privacySettings) {
      user.privacySettings = { ...user.privacySettings, ...dto.privacySettings };
    }

    return this.users.save(user);
  }

  async createPhotoUploadUrl(userId: string, dto: PresignProfilePhotoDto) {
    await this.getByIdOrThrow(userId);

    if (!ALLOWED_PHOTO_CONTENT_TYPES.has(dto.contentType)) {
      throw new BadRequestException({
        code: 'INVALID_CONTENT_TYPE',
        message: 'Допустимы только JPEG, PNG и WebP',
      });
    }

    const extension =
      this.extensionFromFileName(dto.fileName) ?? PHOTO_CONTENT_TYPE_EXT[dto.contentType] ?? 'jpg';
    const storageKey = this.storage.buildUserPhotoKey(userId, extension);

    return this.storage.createUploadUrl(storageKey, dto.contentType);
  }

  async confirmPhotoUpload(userId: string, dto: ConfirmProfilePhotoDto): Promise<User> {
    const user = await this.getByIdOrThrow(userId);
    const expectedPrefix = `users/${userId}/photo/`;

    if (!dto.storageKey.startsWith(expectedPrefix)) {
      throw new BadRequestException({
        code: 'INVALID_STORAGE_KEY',
        message: 'Ключ объекта не принадлежит текущему пользователю',
      });
    }

    user.photoUrl = dto.storageKey;

    return this.withResolvedPhotoUrl(await this.users.save(user));
  }

  /** В БД храним storageKey; клиенту отдаём свежий presigned download URL. */
  async withResolvedPhotoUrl(user: User): Promise<User> {
    if (!user.photoUrl || user.photoUrl.startsWith('http')) {
      return user;
    }

    const { downloadUrl } = await this.storage.createDownloadUrl(user.photoUrl);
    return Object.assign(Object.create(Object.getPrototypeOf(user)), user, {
      photoUrl: downloadUrl,
    });
  }

  private extensionFromFileName(fileName?: string): string | null {
    if (!fileName) return null;
    const parts = fileName.split('.');
    if (parts.length < 2) return null;
    return parts[parts.length - 1] ?? null;
  }

  async setStatus(id: string, status: User['status']): Promise<User> {
    const user = await this.getByIdOrThrow(id);
    user.status = status;
    return this.users.save(user);
  }

  async recordConsent(id: string, version: string): Promise<User> {
    const user = await this.getByIdOrThrow(id);
    user.pdnConsentAt = new Date();
    user.pdnConsentVersion = version;
    return this.users.save(user);
  }
}
