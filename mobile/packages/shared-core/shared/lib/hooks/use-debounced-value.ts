import { useEffect, useState } from 'react';

/**
 * Возвращает значение с задержкой. Нужен для поиска адресов (`M3.4`), чтобы не дёргать
 * `GET /geo/search` на каждое нажатие клавиши.
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
