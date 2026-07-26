/**
 * Работа с российскими телефонными номерами.
 * Сервер принимает и возвращает номера строго в формате `+7XXXXXXXXXX`.
 */

const DIGITS = /\d/g;

/** Оставляет только цифры и приводит ведущую 8 или 7 к коду страны. */
export function normalizePhone(input: string): string {
  const digits = (input.match(DIGITS) ?? []).join('');
  if (!digits) {
    return '';
  }
  const withoutCountry = digits.length >= 11 ? digits.slice(-10) : digits;
  return `+7${withoutCountry}`;
}

/** Проверяет, что номер пригоден для отправки на сервер. */
export function isValidPhone(input: string): boolean {
  return /^\+7\d{10}$/.test(normalizePhone(input));
}

/** Человекочитаемый вид: `+7 (928) 123-45-67`. */
export function formatPhone(input: string): string {
  const normalized = normalizePhone(input);
  const digits = normalized.slice(2);
  if (digits.length !== 10) {
    return input;
  }
  return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

/**
 * Маска для поля ввода: показывает частично введённый номер, не мешая правкам.
 * Возвращает строку вида `+7 (92` для незавершённого ввода.
 */
export function applyPhoneMask(input: string): string {
  const digits = (input.match(DIGITS) ?? []).join('');
  const local = (digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits).slice(
    0,
    10,
  );

  if (local.length === 0) {
    return '+7 ';
  }
  let masked = `+7 (${local.slice(0, 3)}`;
  if (local.length >= 3) {
    masked += `) ${local.slice(3, 6)}`;
  }
  if (local.length >= 6) {
    masked += `-${local.slice(6, 8)}`;
  }
  if (local.length >= 8) {
    masked += `-${local.slice(8, 10)}`;
  }
  return masked;
}

/** Скрывает номер в логах и на экранах совместного доступа (`requirements.md §20`). */
export function maskPhone(input: string): string {
  const normalized = normalizePhone(input);
  if (normalized.length !== 12) {
    return '•••';
  }
  return `+7 (${normalized.slice(2, 5)}) •••-••-${normalized.slice(10)}`;
}
