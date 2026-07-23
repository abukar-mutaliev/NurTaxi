import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { UsersService } from '../users/users.service';

/**
 * Изоляция региональных админов и операторов (Req §7.3–7.4, Des §9).
 */
@Injectable()
export class AdminScopeService {
  constructor(private readonly usersService: UsersService) {}

  isSuperAdmin(actor: AuthenticatedUser): boolean {
    return actor.role === Role.SuperAdmin;
  }

  async getAssignedRegionId(actor: AuthenticatedUser): Promise<string> {
    const user = await this.usersService.getByIdOrThrow(actor.id);
    if (!user.assignedRegionId) {
      throw new ForbiddenException({
        code: 'NO_REGION_ASSIGNED',
        message: 'Для вашей роли не назначен регион',
      });
    }
    return user.assignedRegionId;
  }

  /** Фильтр region_id для списков: super — опционально, staff — только свой. */
  async resolveListRegionId(
    actor: AuthenticatedUser,
    queryRegionId?: string,
  ): Promise<string | undefined> {
    if (this.isSuperAdmin(actor)) {
      return queryRegionId;
    }
    const assigned = await this.getAssignedRegionId(actor);
    if (queryRegionId && queryRegionId !== assigned) {
      throw new ForbiddenException({
        code: 'REGION_FORBIDDEN',
        message: 'Нет доступа к указанному региону',
      });
    }
    return assigned;
  }

  async assertRegionAccess(actor: AuthenticatedUser, resourceRegionId: string): Promise<void> {
    if (this.isSuperAdmin(actor)) {
      return;
    }
    const assigned = await this.getAssignedRegionId(actor);
    if (assigned !== resourceRegionId) {
      throw new ForbiddenException({
        code: 'REGION_FORBIDDEN',
        message: 'Нет доступа к ресурсу этого региона',
      });
    }
  }

  assertSuperAdmin(actor: AuthenticatedUser): void {
    if (!this.isSuperAdmin(actor)) {
      throw new ForbiddenException({
        code: 'SUPER_ADMIN_REQUIRED',
        message: 'Требуются права супер-администратора',
      });
    }
  }

  assertStaffRole(actor: AuthenticatedUser): void {
    const staff: Role[] = [Role.Operator, Role.RegionalAdmin, Role.SuperAdmin];
    if (!staff.includes(actor.role)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Недостаточно прав' });
    }
  }

  assertCanManageTariffs(actor: AuthenticatedUser): void {
    if (![Role.SuperAdmin, Role.RegionalAdmin].includes(actor.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Управление тарифами недоступно',
      });
    }
  }

  validateStaffAssignment(role: Role, regionId?: string | null): void {
    const staffRoles = [Role.Operator, Role.RegionalAdmin];
    if (!staffRoles.includes(role)) {
      throw new BadRequestException({
        code: 'INVALID_STAFF_ROLE',
        message: 'Можно назначить только operator или regional_admin',
      });
    }
    if (!regionId) {
      throw new BadRequestException({
        code: 'REGION_REQUIRED',
        message: 'Для staff-роли необходимо указать regionId',
      });
    }
  }
}
