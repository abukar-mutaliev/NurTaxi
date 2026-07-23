import { ForbiddenException } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { AdminScopeService } from './admin-scope.service';

describe('AdminScopeService', () => {
  const usersService = {
    getByIdOrThrow: jest.fn(),
  };

  let service: AdminScopeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminScopeService(usersService as never);
  });

  it('super_admin видит любой регион', async () => {
    await expect(
      service.assertRegionAccess({ id: '1', role: Role.SuperAdmin, phone: '+7000' }, 'region-a'),
    ).resolves.toBeUndefined();
  });

  it('regional_admin ограничен assigned_region_id', async () => {
    usersService.getByIdOrThrow.mockResolvedValue({ assignedRegionId: 'region-a' });

    await expect(
      service.assertRegionAccess({ id: '2', role: Role.RegionalAdmin, phone: '+7111' }, 'region-b'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
