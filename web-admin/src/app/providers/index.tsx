import '@/shared/i18n';
import type { ReactNode } from 'react';
import { ErrorBoundary } from './error-boundary';
import { StoreProvider } from './store-provider';
import { AppThemeProvider } from './theme-provider';
import { AuthBootstrap } from './auth-bootstrap';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <AppThemeProvider>
          <AuthBootstrap>{children}</AuthBootstrap>
        </AppThemeProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}
