import { resolveOrderExtras } from './order-extras';

describe('resolveOrderExtras', () => {
  it('берёт отдельные поля API', () => {
    expect(
      resolveOrderExtras({
        childSeat: true,
        passengerName: 'Амина',
        passengerPhone: '+79281234567',
        comment: 'код домофона 12',
      }),
    ).toEqual({
      childSeat: true,
      passengerName: 'Амина',
      passengerPhone: '+79281234567',
      comment: 'код домофона 12',
    });
  });

  it('разбирает пожелания из комментария, если отдельных полей нет', () => {
    expect(
      resolveOrderExtras({
        comment: 'Детское кресло. Пассажир: Амина, +7 (928) 123-45-67. код домофона 12',
      }),
    ).toEqual({
      childSeat: true,
      passengerName: 'Амина',
      passengerPhone: '+79281234567',
      comment: 'код домофона 12',
    });
  });

  it('не путает обычный комментарий с пожеланиями', () => {
    expect(resolveOrderExtras({ comment: 'У второго подъезда' })).toEqual({
      childSeat: false,
      passengerName: null,
      passengerPhone: null,
      comment: 'У второго подъезда',
    });
  });
});
