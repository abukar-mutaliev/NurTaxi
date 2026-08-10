import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { RoleRoute } from '@/app/router/role-route';
import { sessionReducer } from '@/features/auth';
import { Role, UserStatus } from '@/shared/model/enums';

function renderWithRole(role: Role) {
  const store = configureStore({
    reducer: {
      session: sessionReducer,
    },
    preloadedState: {
      session: {
        user: {
          id: '1',
          phone: '+79000000002',
          role,
          assignedRegionId: null,
          name: null,
          photoUrl: null,
          language: 'ru',
          status: UserStatus.Active,
          pdnConsentGiven: true,
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
        isBootstrapped: true,
        selectedRegionId: null,
      },
    },
  });

  return render(
    <Provider store={store}>
      <RoleRoute permission="regions.manage">
        <div>Secret regions</div>
      </RoleRoute>
    </Provider>,
  );
}

describe('RoleRoute', () => {
  afterEach(() => cleanup());

  it('renders children when permission granted', () => {
    renderWithRole(Role.SuperAdmin);
    expect(screen.getByText('Secret regions')).toBeInTheDocument();
  });

  it('shows 403 when permission denied', () => {
    renderWithRole(Role.Operator);
    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.queryByText('Secret regions')).not.toBeInTheDocument();
  });
});
