import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Ограничивает доступ к маршруту перечисленными ролями (RBAC, Req §7, Des §9).
 * Применяется вместе с JwtAuthGuard и RolesGuard.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
