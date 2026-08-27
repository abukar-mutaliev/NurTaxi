import { describe, expect, it } from 'vitest';
import { Role } from '@/shared/model/enums';
import { can, getPermissions, isAdminRole } from '@/shared/rbac';

describe('RBAC permissions', () => {
  it('grants super_admin full admin permissions', () => {
    const perms = getPermissions(Role.SuperAdmin);
    expect(perms).toContain('regions.manage');
    expect(perms).toContain('orders.manage');
    expect(can(Role.SuperAdmin, 'providers.manage')).toBe(true);
  });

  it('restricts operator from regions and staff', () => {
    expect(can(Role.Operator, 'regions.manage')).toBe(false);
    expect(can(Role.Operator, 'orders.manage')).toBe(true);
    expect(can(Role.Operator, 'appeals.manage')).toBe(true);
  });

  it('allows regional_admin tariffs but not providers', () => {
    expect(can(Role.RegionalAdmin, 'tariffs.manage')).toBe(true);
    expect(can(Role.RegionalAdmin, 'providers.manage')).toBe(false);
  });

  it('grants regulator read/export without mutation', () => {
    expect(isAdminRole(Role.Regulator)).toBe(true);
    expect(can(Role.Regulator, 'orders.manage')).toBe(true);
    expect(can(Role.Regulator, 'orders.export')).toBe(true);
    expect(can(Role.Regulator, 'orders.mutate')).toBe(false);
    expect(can(Role.Regulator, 'audit.view')).toBe(true);
    expect(can(Role.Regulator, 'staff.manage')).toBe(false);
  });

  it('rejects client and driver from admin panel', () => {
    expect(isAdminRole(Role.Client)).toBe(false);
    expect(isAdminRole(Role.Driver)).toBe(false);
    expect(getPermissions(Role.Client)).toEqual([]);
  });
});
