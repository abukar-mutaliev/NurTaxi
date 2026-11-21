import { createAckWatch } from './ack-watch';

describe('createAckWatch', () => {
  it('верит каналу, пока сервер отвечает', () => {
    const watch = createAckWatch(5000);

    expect(watch.sent(0)).toBe(true);
    watch.acked();
    expect(watch.sent(60_000)).toBe(true);
  });

  it('терпит задержку ответа в пределах порога', () => {
    const watch = createAckWatch(5000);

    expect(watch.sent(0)).toBe(true);
    expect(watch.sent(2000)).toBe(true);
    expect(watch.sent(5000)).toBe(true);
  });

  it('перестаёт верить, когда ответа нет дольше порога', () => {
    const watch = createAckWatch(5000);

    expect(watch.sent(0)).toBe(true);
    expect(watch.sent(4000)).toBe(true);
    expect(watch.sent(6000)).toBe(false);
    expect(watch.sent(8000)).toBe(false);
  });

  it('снова верит после ответа', () => {
    const watch = createAckWatch(5000);

    watch.sent(0);
    expect(watch.sent(6000)).toBe(false);
    watch.acked();
    expect(watch.sent(7000)).toBe(true);
  });

  it('после пересоздания соединения отсчёт начинается заново', () => {
    const watch = createAckWatch(5000);

    watch.sent(0);
    expect(watch.sent(6000)).toBe(false);
    watch.reset();
    expect(watch.sent(6500)).toBe(true);
  });
});
