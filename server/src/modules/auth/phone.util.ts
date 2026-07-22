/**
 * Нормализация телефона к формату E.164 для РФ (+7XXXXXXXXXX).
 * Принимает варианты 8XXXXXXXXXX, 7XXXXXXXXXX, +7XXXXXXXXXX, с пробелами/скобками/дефисами.
 */
export function normalizePhone(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }
  const digits = input.replace(/\D/g, '');

  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `+7${digits}`;
  }
  // Возвращаем как есть с ведущим "+", чтобы валидатор отбраковал некорректное значение.
  return input.startsWith('+') ? input : `+${digits}`;
}
