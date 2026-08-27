import { serializeExportFile } from './export-format';

describe('export format throughput (FZ-NF.5)', () => {
  it('serializes a year-scale CSV under the NFR budget', () => {
    const rows = Array.from({ length: 50_000 }, (_, i) => ({
      publicNumber: `NT-${String(100000 + i).padStart(8, '0')}`,
      status: 'completed',
      pickupAddress: 'Назрань, ул. Примерная, 1',
      dropoffAddress: 'Магас, пр. Центральный, 2',
      priceFinal: '450.00',
      paymentMethod: 'cash',
    }));
    const started = Date.now();
    const result = serializeExportFile(rows, 'csv', {
      periodFrom: '2025-08-27T00:00:00.000Z',
      periodTo: '2026-08-27T00:00:00.000Z',
      dateField: 'created',
      requestRef: 'load-test',
    });
    const elapsed = Date.now() - started;
    expect(result.rowCount).toBe(50_000);
    expect(result.checksum).toHaveLength(64);
    expect(result.body.length).toBeGreaterThan(1_000_000);
    // Целевое время генерации 50k строк — 10 с (docs/compliance/export-nfr.md).
    expect(elapsed).toBeLessThan(10_000);
  });
});
