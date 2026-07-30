import type { Role } from '@/shared/model/enums';

export interface StaffMember {
  id: string;
  phone: string;
  name: string | null;
  role: Role;
  assignedRegionId: string | null;
  status: string;
  createdAt: string;
}

export interface AssignStaffDto {
  userId?: string;
  phone?: string;
  name?: string;
  role: Role;
  regionId: string;
}
