import { REDACTED, scrubSentryEvent, scrubString, scrubValue } from './pii-scrubber';

describe('pii-scrubber', () => {
  it('redacts phones and plates in strings', () => {
    expect(scrubString('Звоните +7 928 000-00-00')).toContain(REDACTED);
  });

  it('redacts known keys in objects', () => {
    const scrubbed = scrubValue({ fullName: 'Ахмед', comment: 'ok' }) as Record<string, unknown>;
    expect(scrubbed.fullName).toBe(REDACTED);
    expect(scrubbed.comment).toBe('ok');
  });

  it('strips request bodies from sentry events', () => {
    const event = scrubSentryEvent({
      request: {
        url: '/api/v1/orders?phone=+79280000001',
        data: { pickupAddress: 'secret' },
        headers: { authorization: 'Bearer x' },
      },
      user: { id: 'u1', email: 'a@b.c' },
    });
    const request = event.request as Record<string, unknown>;
    expect(request.data).toBeUndefined();
    expect(request.url).toBe('/api/v1/orders');
    expect(event.user).toEqual({ id: REDACTED });
  });
});
