/**
 * Связь водителя и пассажира по телефону: звонок или SMS на выбор.
 *
 * Чата в приложении пока нет, поэтому «Связаться» открывает системные звонилку и SMS.
 * Номера может не быть (сервер отдаёт его только на активной поездке) — тогда говорим
 * об этом, а не оставляем кнопку молча не работать.
 */
import { Linking } from 'react-native';

import { formatPhone, isValidPhone, normalizePhone } from '@nurtaxi/shared-core/shared/lib';
import { showAlert } from '@nurtaxi/shared-core/shared/ui';

export interface PhoneContactLabels {
  /** Заголовок диалога: «Связаться с водителем». */
  title: string;
  call: string;
  sms: string;
  cancel: string;
  /** Номер не пришёл или приложение звонков недоступно. */
  unavailable: string;
}

export function contactByPhone(phone: string | null | undefined, labels: PhoneContactLabels): void {
  const number = phone && isValidPhone(phone) ? normalizePhone(phone) : null;
  if (!number) {
    showAlert(labels.title, labels.unavailable);
    return;
  }

  const open = (url: string) => {
    Linking.openURL(url).catch(() => showAlert(labels.title, labels.unavailable));
  };

  showAlert(labels.title, formatPhone(number), [
    { text: labels.cancel, style: 'cancel' },
    { text: labels.sms, onPress: () => open(`sms:${number}`) },
    { text: labels.call, onPress: () => open(`tel:${number}`) },
  ]);
}
