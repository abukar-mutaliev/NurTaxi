import { useEffect, useState } from 'react';
import { useAppDispatch } from '@/app/store/hooks';
import { userApi } from '@/entities/user';
import { clearSession, setBootstrapped, setUser } from '@/features/auth';
import { sessionTokensRefreshed } from '@/features/auth/model/session-events';
import { appConfig } from '@/shared/config';
import { tokenStorage } from '@/shared/lib/token-storage';
import { isAdminRole } from '@/shared/rbac';
import { PageLoader } from '@/shared/ui';

interface AuthBootstrapProps {
  children: React.ReactNode;
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch(`${appConfig.apiUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) return false;

  const tokens = (await response.json()) as { accessToken: string; refreshToken: string };
  tokenStorage.save(tokens);
  return true;
}

export function AuthBootstrap({ children }: AuthBootstrapProps) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        dispatch(setBootstrapped(true));
        setLoading(false);
        return;
      }

      if (!tokenStorage.getAccessToken()) {
        const refreshed = await refreshAccessToken();
        if (cancelled) return;
        if (!refreshed) {
          tokenStorage.clear();
          dispatch(clearSession());
          dispatch(setBootstrapped(true));
          setLoading(false);
          return;
        }
        dispatch(
          sessionTokensRefreshed({
            accessToken: tokenStorage.getAccessToken()!,
            refreshToken: tokenStorage.getRefreshToken()!,
          }),
        );
      }

      const result = await dispatch(userApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }));
      if (cancelled) return;

      if ('data' in result && result.data) {
        if (!isAdminRole(result.data.role)) {
          tokenStorage.clear();
          dispatch(clearSession());
        } else {
          dispatch(setUser(result.data));
        }
      } else {
        tokenStorage.clear();
        dispatch(clearSession());
      }

      dispatch(setBootstrapped(true));
      setLoading(false);
    }

    void bootstrap().catch(() => {
      if (cancelled) return;
      tokenStorage.clear();
      dispatch(clearSession());
      dispatch(setBootstrapped(true));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  if (loading) {
    return <PageLoader tip="Проверка сессии…" />;
  }

  return <>{children}</>;
}
