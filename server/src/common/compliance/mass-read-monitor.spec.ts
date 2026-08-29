import { MassReadMonitor } from './mass-read-monitor';

describe('mass-read monitor (FZ-08.3)', () => {
  it('alerts when hourly threshold is exceeded', () => {
    const monitor = new MassReadMonitor(3, 60_000);
    expect(monitor.isPiiListPath('/admin/orders', 'GET')).toBe(true);
    expect(monitor.isPiiListPath('/admin/orders', 'POST')).toBe(false);
    expect(monitor.record('op', '/admin/orders')).toBe(false);
    expect(monitor.record('op', '/admin/orders')).toBe(false);
    expect(monitor.record('op', '/admin/orders')).toBe(false);
    expect(monitor.record('op', '/admin/orders')).toBe(true);
  });
});
