import type { ApiErrorBody } from '../model/api-types';

export function getErrorMessage(error: unknown, fallback = 'Произошла ошибка'): string {
  if (typeof error === 'object' && error !== null) {
    const data = (error as { data?: ApiErrorBody & { error?: ApiErrorBody } }).data;
    if (data?.error?.message) return data.error.message;
    if (data?.message) return data.message;
    const message = (error as { message?: string }).message;
    if (message) return message;
  }
  return fallback;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }
  return phone;
}

export function formatCurrency(amount: number, currency = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function normalizePhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.startsWith('8') && digits.length <= 11) {
    return `+7${digits.slice(1)}`;
  }
  if (digits.startsWith('7')) {
    return `+${digits}`;
  }
  if (digits.length <= 10) {
    return `+7${digits}`;
  }
  return `+${digits.slice(0, 11)}`;
}

export function createIdempotencyKey(): string {
  return crypto.randomUUID();
}
