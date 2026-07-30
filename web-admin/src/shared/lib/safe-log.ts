const PHONE_PATTERN = /(\+?\d[\d\s()-]{8,}\d)/g;
const TOKEN_PATTERN = /(Bearer\s+)?[A-Za-z0-9_-]{20,}/g;

function redactString(value: string): string {
  return value
    .replace(PHONE_PATTERN, '[REDACTED_PHONE]')
    .replace(TOKEN_PATTERN, '[REDACTED_TOKEN]');
}

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === 'object') return redactObject(value as Record<string, unknown>);
  return value;
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = new Set(['phone', 'token', 'accessToken', 'refreshToken', 'authorization']);
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.has(key)) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redactValue(value);
    }
  }

  return result;
}

/** Логирование без ПДн в production (Req §20). */
export function safeLogError(
  scope: string,
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const payload = {
    message: error instanceof Error ? error.message : String(error),
    ...context,
  };

  if (import.meta.env.PROD) {
    console.error(scope, redactObject(payload));
    return;
  }

  console.error(scope, error, context);
}
