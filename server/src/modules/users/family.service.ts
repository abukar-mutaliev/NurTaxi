import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomInt } from 'crypto';
import { FamilyMemberStatus } from '../../common/enums/phase8.enum';
import { SMS_PROVIDER, type SmsProvider } from '../auth/sms/sms-provider.interface';
import { Inject } from '@nestjs/common';
import { RegionsService } from '../regions/regions.service';
import { normalizePhone } from '../auth/phone.util';
import { FamilyMember } from './entities/family-member.entity';
import { UsersService } from './users.service';
import type { AddFamilyMemberDto } from './dto/family.dto';

@Injectable()
export class FamilyService {
  constructor(
    @InjectRepository(FamilyMember)
    private readonly family: Repository<FamilyMember>,
    private readonly usersService: UsersService,
    private readonly regionsService: RegionsService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  list(ownerId: string): Promise<FamilyMember[]> {
    return this.family.find({
      where: { ownerId, status: FamilyMemberStatus.Confirmed },
      order: { createdAt: 'DESC' },
    });
  }

  listPendingInvites(userId: string): Promise<FamilyMember[]> {
    return this.family.find({
      where: { memberUserId: userId, status: FamilyMemberStatus.Pending },
    });
  }

  async invite(ownerId: string, dto: AddFamilyMemberDto, regionId: string): Promise<FamilyMember> {
    await this.assertFamilyFeature(regionId);

    const phone = normalizePhone(dto.phone);
    const existing = await this.family.findOne({
      where: { ownerId, memberPhone: phone, status: FamilyMemberStatus.Confirmed },
    });
    if (existing) {
      throw new ConflictException({
        code: 'FAMILY_EXISTS',
        message: 'Этот контакт уже в семейном аккаунте',
      });
    }

    const memberUser = await this.usersService.findByPhone(phone);
    const code = String(randomInt(100000, 999999));

    const record = await this.family.save(
      this.family.create({
        ownerId,
        memberPhone: phone,
        memberUserId: memberUser?.id ?? null,
        relation: dto.relation,
        permissions: {
          track: dto.track ?? true,
          notify: dto.notify ?? true,
          pay: dto.pay ?? true,
        },
        status: FamilyMemberStatus.Pending,
        confirmCode: code,
      }),
    );

    await this.sms.sendMessage(phone, `Nur Taxi: код подтверждения семейного аккаунта ${code}`);
    return record;
  }

  async confirm(userId: string, memberId: string, code: string): Promise<FamilyMember> {
    const record = await this.family.findOne({ where: { id: memberId } });
    if (!record) {
      throw new NotFoundException({ code: 'FAMILY_NOT_FOUND', message: 'Приглашение не найдено' });
    }

    const user = await this.usersService.getByIdOrThrow(userId);
    if (record.memberUserId && record.memberUserId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа' });
    }
    if (!record.memberUserId && normalizePhone(user.phone) !== record.memberPhone) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа' });
    }
    if (record.confirmCode !== code) {
      throw new BadRequestException({ code: 'INVALID_CODE', message: 'Неверный код' });
    }

    record.status = FamilyMemberStatus.Confirmed;
    record.memberUserId = userId;
    record.confirmCode = null;
    record.confirmedAt = new Date();
    return this.family.save(record);
  }

  async revoke(ownerId: string, memberId: string): Promise<void> {
    const record = await this.family.findOne({ where: { id: memberId, ownerId } });
    if (!record) {
      throw new NotFoundException({ code: 'FAMILY_NOT_FOUND', message: 'Запись не найдена' });
    }
    record.status = FamilyMemberStatus.Revoked;
    await this.family.save(record);
  }

  async assertCanOrderForMember(ownerId: string, familyMemberId: string): Promise<FamilyMember> {
    const member = await this.family.findOne({
      where: {
        id: familyMemberId,
        ownerId,
        status: FamilyMemberStatus.Confirmed,
      },
    });
    if (!member) {
      throw new ForbiddenException({
        code: 'FAMILY_NOT_CONFIRMED',
        message: 'Семейный контакт не найден или не подтверждён',
      });
    }
    return member;
  }

  private async assertFamilyFeature(regionId: string): Promise<void> {
    const region = await this.regionsService.getRegionOrThrow(regionId);
    if (!region.featureFlags?.family_accounts) {
      throw new BadRequestException({
        code: 'FEATURE_DISABLED',
        message: 'Семейный аккаунт недоступен в этом регионе',
      });
    }
  }
}
