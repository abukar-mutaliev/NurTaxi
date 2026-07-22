/**
 * Роли пользователей системы (Req §7).
 * RBAC строится вокруг этих пяти ролей.
 */
export enum Role {
  Client = 'client',
  Driver = 'driver',
  Operator = 'operator',
  RegionalAdmin = 'regional_admin',
  SuperAdmin = 'super_admin',
}

export const ALL_ROLES: Role[] = Object.values(Role);
