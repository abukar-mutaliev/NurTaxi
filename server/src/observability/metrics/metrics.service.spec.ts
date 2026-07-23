import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('registers domain KPI metrics', async () => {
    const metrics = new MetricsService();
    metrics.observeDriverAssignment('region-1', 12);
    metrics.incOrder('closed', 'region-1');
    metrics.incPayment('succeeded', 'region-1');
    metrics.observeExternalCall('map', 'search', 120, true);

    const output = await metrics.metrics();
    expect(output).toContain('order_driver_assignment_duration_seconds');
    expect(output).toContain('orders_total');
    expect(output).toContain('payments_total');
    expect(output).toContain('external_call_duration_seconds');
  });
});
