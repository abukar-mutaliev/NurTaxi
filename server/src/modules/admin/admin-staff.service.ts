import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import type { AssignStaffDto } from './dto/admin.dto';
import { AdminScopeService } from './admin-scope.service';

@Injectable()
export class AdminStaffService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly scope: AdminScopeService,
  ) {}

  listStaff(regionId?: string): Promise<User[]> {
    const where: Record<string, unknown> = {
      role: In([Role.Operator, Role.RegionalAdmin]),
    };
    if (regionId) {
      where.assignedRegionId = regionId;
    }
    return this.users.find({ where, order: { createdAt: 'DESC' } });
  }

  async assignStaff(dto: AssignStaffDto): Promise<User> {
    this.scope.validateStaffAssignment(dto.role, dto.regionId);
    const user = await this.users.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Пользователь не найден' });
    }
    user.role = dto.role;
    user.assignedRegionId = dto.regionId;
    return this.users.save(user);
  }
}
