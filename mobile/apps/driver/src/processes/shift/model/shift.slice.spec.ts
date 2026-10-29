import {
  KEEP_ONLINE_AFTER_BACKGROUND_MS,
  appBackgrounded,
  shiftReducer,
  shouldKeepOnlineOnLaunch,
} from './shift.slice';

describe('shouldKeepOnlineOnLaunch', () => {
  const now = Date.parse('2026-10-28T19:00:00.000Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('сохраняет линию, если приложение ушло в фон несколько минут назад', () => {
    const shift = { backgroundedAt: ago(3 * 60 * 1000), lastSentPosition: null };
    expect(shouldKeepOnlineOnLaunch(shift, now)).toBe(true);
  });

  it('сохраняет линию, если фоновая задача недавно отправляла координаты', () => {
    const shift = {
      backgroundedAt: ago(60 * 60 * 1000),
      lastSentPosition: { lat: 43.2, lng: 44.7, at: ago(30 * 1000) },
    };
    expect(shouldKeepOnlineOnLaunch(shift, now)).toBe(true);
  });

  it('снимает с линии, если приложение не открывали дольше окна', () => {
    const shift = {
      backgroundedAt: ago(KEEP_ONLINE_AFTER_BACKGROUND_MS + 1000),
      lastSentPosition: { lat: 43.2, lng: 44.7, at: ago(KEEP_ONLINE_AFTER_BACKGROUND_MS + 1000) },
    };
    expect(shouldKeepOnlineOnLaunch(shift, now)).toBe(false);
  });

  it('снимает с линии без отметок и при отметке из будущего', () => {
    expect(shouldKeepOnlineOnLaunch({ lastSentPosition: null }, now)).toBe(false);
    expect(
      shouldKeepOnlineOnLaunch(
        { backgroundedAt: new Date(now + 60 * 1000).toISOString(), lastSentPosition: null },
        now,
      ),
    ).toBe(false);
  });

  it('запоминает момент ухода в фон', () => {
    const at = ago(0);
    expect(shiftReducer(undefined, appBackgrounded(at)).backgroundedAt).toBe(at);
  });
});
