import { mapMobileIdStatus, preferStatus } from './mobile-id.status';

describe('mapMobileIdStatus', () => {
  it('раскладывает коды SMS Aero', () => {
    expect(mapMobileIdStatus(0)).toBe('pending');
    expect(mapMobileIdStatus(8)).toBe('pending');
    expect(mapMobileIdStatus(3)).toBe('otp_required');
    expect(mapMobileIdStatus(1)).toBe('confirmed');
    expect(mapMobileIdStatus(2)).toBe('failed');
    expect(mapMobileIdStatus(16)).toBe('failed');
  });

  it('не затирает уже полученный успех более ранним статусом', () => {
    expect(preferStatus('confirmed', 'otp_required')).toBe('confirmed');
    expect(preferStatus('pending', 'otp_required')).toBe('otp_required');
    expect(preferStatus('otp_required', 'confirmed')).toBe('confirmed');
  });
});
