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
  | 'orders.mutate'
  | 'orders.export'
  | 'carriers.manage'
  | 'sites.manage'
  | 'analytics.view'
  | 'appeals.manage'
  | 'audit.view';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [R.SuperAdmin]: [
    'dashboard.view',
    'regions.manage',
    'tariffs.manage',
    'providers.manage',
    'staff.manage',
    'drivers.moderate',
    'orders.manage',
    'orders.mutate',
    'orders.export',
    'carriers.manage',
    'sites.manage',
    'analytics.view',
    'audit.view',
  ],
  [R.RegionalAdmin]: [
    'dashboard.view',
    'tariffs.manage',
    'drivers.moderate',
    'orders.manage',
    'orders.mutate',
    'orders.export',
    'carriers.manage',
    'analytics.view',
    'appeals.manage',
    'audit.view',
  ],
  [R.Operator]: [
    'dashboard.view',
    'drivers.moderate',
    'orders.manage',
    'orders.mutate',
    'carriers.manage',
    'analytics.view',
    'appeals.manage',
  ],
  [R.Regulator]: ['dashboard.view', 'orders.manage', 'orders.export', 'audit.view'],
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
  return (
    role === R.SuperAdmin ||
    role === R.RegionalAdmin ||
    role === R.Operator ||
    role === R.Regulator
  );
}

export function roleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    [R.SuperAdmin]: 'Супер-администратор',
    [R.RegionalAdmin]: 'Региональный админ',
    [R.Operator]: 'Оператор',
    [R.Regulator]: 'Уполномоченный орган',
    [R.Client]: 'Клиент',
    [R.Driver]: 'Водитель',
  };
  return labels[role] ?? role;
}
