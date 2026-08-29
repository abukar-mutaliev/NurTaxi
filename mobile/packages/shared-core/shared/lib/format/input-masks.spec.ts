import { PLATE_PATTERN, formatIsoDateInput, formatPlateInput } from './input-masks';

describe('formatIsoDateInput', () => {
  it('расставляет тире по мере ввода', () => {
    expect(formatIsoDateInput('1')).toBe('1');
    expect(formatIsoDateInput('1990')).toBe('1990');
    expect(formatIsoDateInput('19900')).toBe('1990-0');
    expect(formatIsoDateInput('199001')).toBe('1990-01');
    expect(formatIsoDateInput('19900111')).toBe('1990-01-11');
  });

  it('терпит уже расставленные разделители и вставку из буфера', () => {
    expect(formatIsoDateInput('1990-01-11')).toBe('1990-01-11');
    expect(formatIsoDateInput('11.01.1990')).toBe('1101-19-90');
  });

  it('отбрасывает буквы и лишние цифры', () => {
    expect(formatIsoDateInput('19a90b0111')).toBe('1990-01-11');
    expect(formatIsoDateInput('199001119999')).toBe('1990-01-11');
  });

  /** Удаление тире должно стирать цифру перед ним, а не «залипать» на разделителе. */
  it('корректно сокращается при удалении', () => {
    expect(formatIsoDateInput('1990-01-')).toBe('1990-01');
    expect(formatIsoDateInput('1990-0')).toBe('1990-0');
  });
});

describe('formatPlateInput', () => {
  it('собирает номер и ставит пробел перед кодом региона', () => {
    expect(formatPlateInput('а123вс06')).toBe('А123ВС 06');
  });

  it('принимает трёхзначный код региона', () => {
    expect(formatPlateInput('а123вс102')).toBe('А123ВС 102');
  });

  it('переводит латиницу в кириллицу', () => {
    expect(formatPlateInput('a123bc06')).toBe('А123ВС 06');
  });

  it('отбрасывает символы не на своём месте', () => {
    // Цифра там, где ожидается буква, и буква там, где ожидается цифра.
    expect(formatPlateInput('1а123вс06')).toBe('А123ВС 06');
    expect(formatPlateInput('аб123вс06')).toBe('А123ВС 06');
  });

  it('не пускает больше трёх цифр в коде региона', () => {
    expect(formatPlateInput('а123вс0612')).toBe('А123ВС 061');
  });

  it('строится по частям без скачков', () => {
    expect(formatPlateInput('а')).toBe('А');
    expect(formatPlateInput('а123')).toBe('А123');
    expect(formatPlateInput('а123в')).toBe('А123В');
    expect(formatPlateInput('а123вс')).toBe('А123ВС');
    expect(formatPlateInput('а123вс0')).toBe('А123ВС 0');
  });
});

describe('PLATE_PATTERN', () => {
  it('принимает полный номер', () => {
    expect(PLATE_PATTERN.test('А123ВС 06')).toBe(true);
    expect(PLATE_PATTERN.test('А123ВС 102')).toBe(true);
  });

  it('отвергает незаконченный и неверный', () => {
    expect(PLATE_PATTERN.test('А123ВС')).toBe(false);
    expect(PLATE_PATTERN.test('А123ВС 0')).toBe(false);
    expect(PLATE_PATTERN.test('А123ВС06')).toBe(false);
    // Буквы, которых нет на российских знаках.
    expect(PLATE_PATTERN.test('Б123ГД 06')).toBe(false);
  });
});
