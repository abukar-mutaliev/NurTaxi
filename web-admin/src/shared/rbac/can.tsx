import type { ReactNode } from 'react';
import { useCan } from './use-can';
import type { Permission } from './permissions';

interface CanProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

/** Скрывает UI-действия без нужного разрешения (Des §9). */
export function Can({ permission, children, fallback = null }: CanProps) {
  const allowed = useCan(permission);
  return allowed ? children : fallback;
}
