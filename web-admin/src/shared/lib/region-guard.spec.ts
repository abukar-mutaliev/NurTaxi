import { describe, expect, it } from 'vitest';
import { Role } from '@/shared/model/enums';
import {
  assertRegionAccess,
  isRegionLockedRole,
  resolveScopedRegionId,
} from '@/shared/lib/region-guard';

describe('region-guard', () => {
  it('super_admin may filter by any region', () => {
    expect(resolveScopedRegionId(Role.SuperAdmin, null, 'region-a')).toBe('region-a');
    expect(resolveScopedRegionId(Role.SuperAdmin, null, undefined)).toBeUndefined();
  });

  it('operator is locked to assigned region regardless of query tampering', () => {
    expect(resolveScopedRegionId(Role.Operator, 'region-a', 'region-b')).toBe('region-a');
  });

  it('assertRegionAccess denies cross-region for staff', () => {
    expect(assertRegionAccess(Role.Operator, 'region-a', 'region-a')).toBe(true);
    expect(assertRegionAccess(Role.Operator, 'region-a', 'region-b')).toBe(false);
    expect(assertRegionAccess(Role.SuperAdmin, null, 'region-b')).toBe(true);
  });

  it('identifies locked roles', () => {
    expect(isRegionLockedRole(Role.Operator)).toBe(true);
    expect(isRegionLockedRole(Role.SuperAdmin)).toBe(false);
  });
});
