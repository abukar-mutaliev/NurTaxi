import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
  User,
} from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

export const CURRENT_CONSENT_VERSION = '1.0';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
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

  async recordConsent(id: string, version: string): Promise<User> {
    const user = await this.getByIdOrThrow(id);
    user.pdnConsentAt = new Date();
    user.pdnConsentVersion = version;
    return this.users.save(user);
  }
}
