import { describe, expect, it } from 'vitest';
import { clearSession, sessionReducer, setUser } from '@/features/auth';
import { Role, UserStatus } from '@/shared/model/enums';

const baseUser = {
  photoUrl: null,
  language: 'ru',
  pdnConsentGiven: true,
  createdAt: new Date().toISOString(),
};

describe('session slice', () => {
  it('sets user and locks region for staff', () => {
    const state = sessionReducer(
      undefined,
      setUser({
        ...baseUser,
        id: '1',
        phone: '+79000000003',
        role: Role.Operator,
        assignedRegionId: 'region-1',
        name: null,
        status: UserStatus.Active,
      }),
    );

    expect(state.isAuthenticated).toBe(true);
    expect(state.selectedRegionId).toBe('region-1');
  });

  it('clears session on logout', () => {
    const loggedIn = sessionReducer(
      undefined,
      setUser({
        ...baseUser,
        id: '1',
        phone: '+79000000001',
        role: Role.SuperAdmin,
        assignedRegionId: null,
        name: null,
        status: UserStatus.Active,
      }),
    );
    const cleared = sessionReducer(loggedIn, clearSession());
    expect(cleared.user).toBeNull();
    expect(cleared.isAuthenticated).toBe(false);
  });
});
