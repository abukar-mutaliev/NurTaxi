import type { Role } from '../model/enums';
import { Role as R } from '../model/enums';

export type Permission =
  | 'dashboard.view'
  | 'regions.manage'
  | 'tariffs.manage'
  | 'providers.manage'
  | 'staff.manage'
  | 'drivers.moderate'
  | 'orders.manage'
  | 'analytics.view'
  | 'appeals.manage';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [R.SuperAdmin]: [
    'dashboard.view',
    'regions.manage',
    'tariffs.manage',
    'providers.manage',
    'staff.manage',
    'drivers.moderate',
    'orders.manage',
    'analytics.view',
  ],
  [R.RegionalAdmin]: [
    'dashboard.view',
    'tariffs.manage',
    'drivers.moderate',
    'orders.manage',
    'analytics.view',
    'appeals.manage',
  ],
  [R.Operator]: [
    'dashboard.view',
    'drivers.moderate',
    'orders.manage',
    'analytics.view',
    'appeals.manage',
  ],
  [R.Client]: [],
  [R.Driver]: [],
};

export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function can(role: Role, permission: Permission): boolean {
  return getPermissions(role).includes(permission);
}

export function isAdminRole(role: Role): boolean {
  return role === R.SuperAdmin || role === R.RegionalAdmin || role === R.Operator;
}

export function roleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    [R.SuperAdmin]: 'Супер-администратор',
    [R.RegionalAdmin]: 'Региональный админ',
    [R.Operator]: 'Оператор',
    [R.Client]: 'Клиент',
    [R.Driver]: 'Водитель',
  };
  return labels[role] ?? role;
}
