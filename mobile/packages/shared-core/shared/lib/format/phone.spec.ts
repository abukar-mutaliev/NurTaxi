import { applyPhoneMask, isMobilePhone, isValidPhone } from './phone';

describe('applyPhoneMask', () => {
  it('расставляет разделители по мере ввода', () => {
    expect(applyPhoneMask('9')).toBe('+7 (9');
    expect(applyPhoneMask('988')).toBe('+7 (988');
    expect(applyPhoneMask('9888')).toBe('+7 (988) 8');
    expect(applyPhoneMask('9888222')).toBe('+7 (988) 822-2');
    expect(applyPhoneMask('988822289')).toBe('+7 (988) 822-28-9');
    expect(applyPhoneMask('9888222899')).toBe('+7 (988) 822-28-99');
  });

  it('принимает номер с кодом страны и вставку из буфера', () => {
    expect(applyPhoneMask('+7 (988) 822-28-99')).toBe('+7 (988) 822-28-99');
    expect(applyPhoneMask('89888222899')).toBe('+7 (988) 822-28-99');
    expect(applyPhoneMask('+7 (988) 822-28-991')).toBe('+7 (988) 822-28-99');
  });

  /** Стёртый разделитель не должен возвращаться: иначе номер «залипает» на нём. */
  it('корректно сокращается при удалении', () => {
    expect(applyPhoneMask('+7 (988) 822-28-')).toBe('+7 (988) 822-28');
    expect(applyPhoneMask('+7 (988) 822-')).toBe('+7 (988) 822');
    expect(applyPhoneMask('+7 (988) ')).toBe('+7 (988');
    expect(applyPhoneMask('+7 (')).toBe('+7 ');
  });

  it('каждое удаление укорачивает номер, пока он не опустеет', () => {
    let value = applyPhoneMask('9888222899');
    for (let step = 0; step < 30 && value !== '+7 '; step += 1) {
      const next = applyPhoneMask(value.slice(0, -1));
      expect(next.length).toBeLessThan(value.length);
      value = next;
    }
    expect(value).toBe('+7 ');
  });
});

describe('isMobilePhone', () => {
  it('принимает полный мобильный номер', () => {
    expect(isMobilePhone('+7 (988) 822-28-99')).toBe(true);
  });

  it('отвергает неполный номер и код не на 9', () => {
    expect(isMobilePhone('+7 (988) 822-28')).toBe(false);
    expect(isMobilePhone('+7 (873) 220-00-00')).toBe(false);
    // Для общей проверки такой номер годится — она не про SMS.
    expect(isValidPhone('+7 (873) 220-00-00')).toBe(true);
  });
});
