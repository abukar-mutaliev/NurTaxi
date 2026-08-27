import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { normalizePhone } from '../auth/phone.util';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import type { AssignStaffDto } from './dto/admin.dto';
import { AdminScopeService } from './admin-scope.service';

const STAFF_ROLES = [Role.Operator, Role.RegionalAdmin, Role.Regulator];

@Injectable()
export class AdminStaffService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly usersService: UsersService,
    private readonly scope: AdminScopeService,
  ) {}

  listStaff(regionId?: string): Promise<User[]> {
    const where: Record<string, unknown> = {
      role: In(STAFF_ROLES),
    };
    if (regionId) {
      where.assignedRegionId = regionId;
    }
    return this.users.find({ where, order: { createdAt: 'DESC' } });
  }

  async assignStaff(dto: AssignStaffDto): Promise<User> {
    this.scope.validateStaffAssignment(dto.role, dto.regionId);

    const user = await this.resolveAssignTarget(dto);
    this.assertModifiableStaffTarget(user);

    user.role = dto.role;
    user.assignedRegionId = dto.regionId;
    if (dto.name !== undefined && dto.name.trim()) {
      user.name = dto.name.trim();
    }

    return this.users.save(user);
  }

  async revokeStaff(userId: string, actorId: string): Promise<User> {
    this.assertNotSelf(actorId, userId, 'Нельзя отозвать права у собственного аккаунта');
    const user = await this.getStaffMemberOrThrow(userId);
    user.role = Role.Client;
    user.assignedRegionId = null;
    return this.users.save(user);
  }

  async removeStaff(userId: string, actorId: string): Promise<void> {
    this.assertNotSelf(actorId, userId, 'Нельзя удалить собственный аккаунт');
    const user = await this.getStaffMemberOrThrow(userId);

    try {
      await this.users.remove(user);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new BadRequestException({
          code: 'USER_DELETE_CONFLICT',
          message:
            'Невозможно удалить аккаунт: есть связанные данные. Отзовите права администратора вместо удаления.',
        });
      }
      throw error;
    }
  }

  async setStaffStatus(userId: string, status: UserStatus): Promise<User> {
    const user = await this.getStaffMemberOrThrow(userId);
    user.status = status;
    return this.users.save(user);
  }

  private async resolveAssignTarget(dto: AssignStaffDto): Promise<User> {
    if (dto.userId) {
      const user = await this.users.findOne({ where: { id: dto.userId } });
      if (!user) {
        throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Пользователь не найден' });
      }
      return user;
    }

    if (dto.phone) {
      const phone = normalizePhone(dto.phone);
      if (!phone.startsWith('+7') || phone.length !== 12) {
        throw new BadRequestException({
          code: 'INVALID_PHONE',
          message: 'Укажите корректный номер телефона',
        });
      }

      const { user } = await this.usersService.findOrCreateClient(phone);
      return user;
    }

    throw new BadRequestException({
      code: 'USER_REFERENCE_REQUIRED',
      message: 'Укажите телефон или ID пользователя',
    });
  }

  private assertModifiableStaffTarget(user: User): void {
    if (user.role === Role.SuperAdmin) {
      throw new BadRequestException({
        code: 'CANNOT_MODIFY_SUPER_ADMIN',
        message: 'Нельзя изменять роль супер-администратора',
      });
    }
    if (user.role === Role.Driver) {
      throw new BadRequestException({
        code: 'USER_IS_DRIVER',
        message: 'Пользователь зарегистрирован как водитель',
      });
    }
  }

  private async getStaffMemberOrThrow(userId: string): Promise<User> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Пользователь не найден' });
    }
    if (!STAFF_ROLES.includes(user.role)) {
      throw new BadRequestException({
        code: 'NOT_STAFF_USER',
        message: 'Пользователь не является администратором',
      });
    }
    return user;
  }

  private assertNotSelf(actorId: string, targetId: string, message: string): void {
    if (actorId === targetId) {
      throw new ForbiddenException({ code: 'SELF_ACTION_FORBIDDEN', message });
    }
  }
}
