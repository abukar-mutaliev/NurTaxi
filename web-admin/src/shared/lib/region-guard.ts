import { Role } from '@/shared/model/enums';

/**
 * Клиентская изоляция region_id для staff-ролей (Req §7.4, W11.3).
 * Сервер остаётся источником истины; здесь игнорируем подмену query-параметра.
 */
export function resolveScopedRegionId(
  role: Role,
  assignedRegionId: string | null | undefined,
  requestedRegionId?: string,
): string | undefined {
  if (role === Role.SuperAdmin) {
    return requestedRegionId;
  }
  return assignedRegionId ?? undefined;
}

export function assertRegionAccess(
  role: Role,
  assignedRegionId: string | null | undefined,
  resourceRegionId: string,
): boolean {
  if (role === Role.SuperAdmin) return true;
  return Boolean(assignedRegionId && assignedRegionId === resourceRegionId);
}

export function isRegionLockedRole(role: Role): boolean {
  return role === Role.Operator || role === Role.RegionalAdmin;
}
