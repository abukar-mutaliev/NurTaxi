import { decryptField, encryptField } from './field-encryption';

describe('field encryption (FZ-08.16)', () => {
  it('round-trips permit numbers', () => {
    const plain = '06-ТАКСИ-001234';
    const enc = encryptField(plain);
    expect(enc).toMatch(/^enc:v1:/);
    expect(enc).not.toContain(plain);
    expect(decryptField(enc)).toBe(plain);
  });

  it('is deterministic for unique indexes', () => {
    expect(encryptField('ABC')).toBe(encryptField('ABC'));
  });

  it('leaves legacy plaintext readable', () => {
    expect(decryptField('06-ТАКСИ-99')).toBe('06-ТАКСИ-99');
  });

  it('does not double-encrypt', () => {
    const once = encryptField('X');
    expect(encryptField(once)).toBe(once);
  });
});
