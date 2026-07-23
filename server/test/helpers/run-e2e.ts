/** Запускать e2e в CI или при E2E_ENABLED=true (нужны PostgreSQL + Redis). */
export const shouldRunE2e = (): boolean =>
  process.env.CI === 'true' || process.env.E2E_ENABLED === 'true';
