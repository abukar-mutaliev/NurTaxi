import { Tag } from 'antd';
import type { VerificationStatus, OrderStatus, DocumentStatus } from '../model/enums';
import {
  VerificationStatus as VS,
  OrderStatus as OS,
  DocumentStatus as DS,
} from '../model/enums';

const verificationColors: Record<string, string> = {
  [VS.Draft]: 'default',
  [VS.Pending]: 'gold',
  [VS.InReview]: 'processing',
  [VS.Approved]: 'green',
  [VS.Rejected]: 'red',
  [VS.Blocked]: 'default',
};

export const verificationLabels: Record<string, string> = {
  [VS.Draft]: 'Черновик',
  [VS.Pending]: 'На проверке',
  [VS.InReview]: 'На рассмотрении',
  [VS.Approved]: 'Одобрен',
  [VS.Rejected]: 'Отклонён',
  [VS.Blocked]: 'Заблокирован',
};

export function getVerificationStatusLabel(status: string): string {
  return verificationLabels[status] ?? status;
}

const orderColors: Record<string, string> = {
  [OS.Created]: 'blue',
  [OS.SearchingDriver]: 'processing',
  searching: 'processing',
  [OS.DriverAssigned]: 'cyan',
  [OS.DriverEnRoute]: 'geekblue',
  [OS.DriverArrived]: 'purple',
  [OS.InProgress]: 'orange',
  [OS.Completed]: 'green',
  [OS.Closed]: 'default',
  [OS.CancelledByClient]: 'red',
  [OS.CancelledByDriver]: 'red',
  [OS.CancelledSystem]: 'red',
  cancelled_by_system: 'red',
  [OS.FailedPayment]: 'volcano',
  no_drivers: 'warning',
};

export const orderLabels: Record<string, string> = {
  [OS.Created]: 'Создан',
  [OS.SearchingDriver]: 'Ищем водителя',
  searching: 'Ищем водителя',
  [OS.DriverAssigned]: 'Водитель назначен',
  [OS.DriverEnRoute]: 'Водитель в пути',
  [OS.DriverArrived]: 'Водитель на месте',
  [OS.InProgress]: 'В поездке',
  [OS.Completed]: 'Завершён',
  [OS.Closed]: 'Закрыт',
  [OS.CancelledByClient]: 'Отменён клиентом',
  [OS.CancelledByDriver]: 'Отменён водителем',
  [OS.CancelledSystem]: 'Отменён системой',
  cancelled_by_system: 'Отменён системой',
  [OS.FailedPayment]: 'Ошибка оплаты',
  no_drivers: 'Нет водителей',
};

export function getOrderStatusLabel(status: string): string {
  return orderLabels[status] ?? status;
}

export function getOrderStatusSelectOptions(): { value: string; label: string }[] {
  return Object.values(OS).map((value) => ({
    value,
    label: getOrderStatusLabel(value),
  }));
}

const documentColors: Record<DocumentStatus, string> = {
  [DS.Pending]: 'gold',
  [DS.Approved]: 'green',
  [DS.Rejected]: 'red',
};

const documentLabels: Record<DocumentStatus, string> = {
  [DS.Pending]: 'На проверке',
  [DS.Approved]: 'Одобрен',
  [DS.Rejected]: 'Отклонён',
};

export function VerificationStatusTag({ status }: { status: VerificationStatus | string }) {
  return <Tag color={verificationColors[status] ?? 'default'}>{getVerificationStatusLabel(status)}</Tag>;
}

export function OrderStatusTag({ status }: { status: OrderStatus | string }) {
  return <Tag color={orderColors[status] ?? 'default'}>{getOrderStatusLabel(status)}</Tag>;
}

export function DocumentStatusTag({ status }: { status: DocumentStatus }) {
  return <Tag color={documentColors[status]}>{documentLabels[status]}</Tag>;
}

export function ActiveTag({ active }: { active: boolean }) {
  return <Tag color={active ? 'green' : 'default'}>{active ? 'Активен' : 'Неактивен'}</Tag>;
}
