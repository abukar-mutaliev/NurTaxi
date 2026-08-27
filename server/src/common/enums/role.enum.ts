/**
 * Роли пользователей системы (Req §7, FZ-10.1).
 * RBAC строится вокруг этих ролей; regulator — только чтение и выгрузка журнала.
 */
export enum Role {
  Client = 'client',
  Driver = 'driver',
  Operator = 'operator',
  RegionalAdmin = 'regional_admin',
  SuperAdmin = 'super_admin',
  /** Уполномоченный орган: просмотр и выгрузка журнала без прав на изменение (FZ-10.1). */
  Regulator = 'regulator',
}

export const ALL_ROLES: Role[] = Object.values(Role);

export const STAFF_ROLES: Role[] = [
  Role.Operator,
  Role.RegionalAdmin,
  Role.SuperAdmin,
  Role.Regulator,
];

export const MUTATING_STAFF_ROLES: Role[] = [Role.Operator, Role.RegionalAdmin, Role.SuperAdmin];
