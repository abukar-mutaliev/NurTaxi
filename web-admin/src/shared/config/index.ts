export const appConfig = {
  apiUrl: import.meta.env.VITE_API_URL ?? '/api/v1',
  appName: import.meta.env.VITE_APP_NAME ?? 'Nur Taxi Admin',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  wsUrl:
    import.meta.env.VITE_WS_URL ??
    (typeof window !== 'undefined' ? `${window.location.origin}/ws` : 'http://localhost:3000/ws'),
} as const;
