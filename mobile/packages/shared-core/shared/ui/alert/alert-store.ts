/**
 * Очередь диалогов приложения — замена системного `Alert.alert`.
 *
 * Системный диалог Android выглядел чужим (серая карточка, бирюзовые кнопки) и рисовал не
 * больше трёх кнопок. Здесь только состояние: что показать и в каком порядке. Рисует диалог
 * `AlertHost`, смонтированный один раз в корне каждого приложения.
 *
 * Интерфейс повторяет `Alert.alert(title, message, buttons, options)`, чтобы замена была
 * механической. Диалоги не накладываются: следующий ждёт, пока закроют текущий.
 */
export interface AlertButton {
  text: string;
  onPress?: () => void;
  /** `cancel` — вторичное действие внизу; `destructive` — необратимое (удалить, выйти, SOS). */
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  /** Закрывать по тапу мимо окна и кнопке «Назад» — даже без кнопки отмены. */
  cancelable?: boolean;
  /** Окно закрыли не кнопкой (мимо окна или «Назад»). */
  onDismiss?: () => void;
}

export interface AlertRequest {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options: AlertOptions;
}

type Listener = () => void;

let queue: AlertRequest[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

/** Показать диалог в стиле приложения. Без кнопок — одна кнопка «OK». */
export function showAlert(
  title: string,
  message?: string,
  buttons: AlertButton[] = [],
  options: AlertOptions = {},
): void {
  queue = [...queue, { buttons, id: nextId++, message, options, title }];
  emit();
}

export function subscribeAlerts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Диалог, который сейчас на экране; `null` — показывать нечего. */
export function currentAlert(): AlertRequest | null {
  return queue[0] ?? null;
}

export function dismissAlert(id: number): void {
  queue = queue.filter((alert) => alert.id !== id);
  emit();
}
