/**
 * Порог массового чтения ПДн: считает GET по спискам с персональными данными
 * и сигнализирует при превышении (FZ-08.3). Не блокирует запрос.
 */
export const PII_LIST_PATHS = [
  '/admin/orders',
  '/admin/drivers',
  '/admin/carriers',
  '/admin/staff',
  '/admin/audit-logs',
];

export class MassReadMonitor {
  private readonly counts = new Map<string, { windowStart: number; count: number }>();

  constructor(
    private readonly threshold = Number.parseInt(process.env.MASS_READ_ALERT_THRESHOLD ?? '200', 10),
    private readonly windowMs = 60 * 60 * 1000,
  ) {}

  isPiiListPath(path: string, method: string): boolean {
    if (method !== 'GET') return false;
    return PII_LIST_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}?`));
  }

  /**
   * @returns true, если порог превышен на этом запросе
   */
  record(actorId: string, path: string): boolean {
    const now = Date.now();
    const key = `${actorId}:${path.split('?')[0]}`;
    const current = this.counts.get(key);
    if (!current || now - current.windowStart >= this.windowMs) {
      this.counts.set(key, { windowStart: now, count: 1 });
      return false;
    }
    current.count += 1;
    return current.count === this.threshold + 1 || (current.count > this.threshold && current.count % 50 === 0);
  }

  getThreshold(): number {
    return this.threshold;
  }
}

export const massReadMonitor = new MassReadMonitor();
