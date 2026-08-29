import { PermitStatus } from '../../../common/enums/compliance.enum';
import { derivePermitStatus } from './taxi-permit.entity';

describe('derivePermitStatus', () => {
  it('keeps revoked', () => {
    expect(derivePermitStatus(PermitStatus.Revoked, '2020-01-01')).toBe(PermitStatus.Revoked);
  });

  it('marks expired after date', () => {
    expect(derivePermitStatus(PermitStatus.Active, '2020-01-01', new Date('2026-08-27'))).toBe(
      PermitStatus.Expired,
    );
  });

  it('marks expiring within 30 days', () => {
    expect(derivePermitStatus(PermitStatus.Active, '2026-09-10', new Date('2026-08-27'))).toBe(
      PermitStatus.Expiring,
    );
  });
});
