import { notification } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { orderApi } from '@/entities/order';
import { driverApi } from '@/entities/driver';
import { API_TAGS } from '@/shared/api/tags';
import { Role } from '@/shared/model/enums';
import { realtimeClient } from './realtime-client';
import { RealtimeEvent } from './realtime-events';
import type {
  DocumentVerifiedEvent,
  OrderStatusEvent,
  PaymentFailedEvent,
  SosActivatedEvent,
} from './realtime-events';
import { realtimeStatusChanged, sosReceived } from './realtime.slice';

function matchesRegionFilter(
  eventRegionId: string | undefined,
  userRole: Role | undefined,
  activeRegionId: string | undefined,
): boolean {
  if (!eventRegionId) return true;
  if (userRole === Role.SuperAdmin && activeRegionId) {
    return eventRegionId === activeRegionId;
  }
  return true;
}

/** Подключение WebSocket на время авторизованной сессии. */
export function useRealtimeConnection(): void {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.session.isAuthenticated);

  useEffect(() => {
    const unsubscribeStatus = realtimeClient.onStatusChange((status) => {
      dispatch(realtimeStatusChanged(status));
    });

    if (!isAuthenticated) {
      realtimeClient.disconnect();
      return unsubscribeStatus;
    }

    realtimeClient.connect();

    return () => {
      unsubscribeStatus();
      realtimeClient.disconnect();
    };
  }, [dispatch, isAuthenticated]);
}

/** Глобальные обработчики событий для операторской панели. */
export function useStaffRealtimeEvents(): void {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.session.user);
  const selectedRegionId = useAppSelector((s) => s.session.selectedRegionId);
  const activeRegionId: string | undefined =
    user?.role === Role.SuperAdmin
      ? (selectedRegionId ?? undefined)
      : (user?.assignedRegionId ?? undefined);

  useEffect(() => {
    if (!user) return;

    const regionOk = (regionId?: string) =>
      matchesRegionFilter(regionId, user.role, activeRegionId);

    const handleOrderStatus = (event: OrderStatusEvent) => {
      if (!regionOk(event.regionId)) return;

      dispatch(
        orderApi.util.updateQueryData('getOrder', event.orderId, (draft) => {
          draft.status = event.toStatus;
        }),
      );
      dispatch(orderApi.util.invalidateTags([API_TAGS.Order]));
    };

    const handleSos = (event: SosActivatedEvent) => {
      if (!regionOk(event.regionId)) return;

      dispatch(sosReceived(event));
      notification.error({
        message: t('realtime.sosTitle'),
        description: t('realtime.sosDescription', {
          address: event.pickup.address,
          driver: event.driver?.fullName ?? t('realtime.noDriver'),
        }),
        duration: 0,
        placement: 'topRight',
        onClick: () => navigate(`/orders/${event.orderId}`),
        style: { borderLeft: '4px solid #ff4d4f' },
      });
    };

    const handlePaymentFailed = (event: PaymentFailedEvent) => {
      if (!regionOk(event.regionId)) return;

      notification.warning({
        message: t('realtime.paymentFailedTitle'),
        description: t('realtime.paymentFailedDescription', { orderId: event.orderId.slice(0, 8) }),
        placement: 'topRight',
        onClick: () => navigate(`/orders/${event.orderId}`),
      });
      dispatch(orderApi.util.invalidateTags([API_TAGS.Order]));
    };

    const handleDocumentVerified = (event: DocumentVerifiedEvent) => {
      if (!regionOk(event.regionId)) return;

      notification.info({
        message: t('realtime.documentVerifiedTitle'),
        description: t('realtime.documentVerifiedDescription'),
        placement: 'topRight',
        onClick: () => navigate(`/drivers/${event.driverId}`),
      });
      dispatch(driverApi.util.invalidateTags([API_TAGS.Driver]));
    };

    const offStatus = realtimeClient.on(RealtimeEvent.OrderStatus, handleOrderStatus);
    const offSos = realtimeClient.on(RealtimeEvent.SosActivated, handleSos);
    const offPayment = realtimeClient.on(RealtimeEvent.PaymentFailed, handlePaymentFailed);
    const offDocument = realtimeClient.on(RealtimeEvent.DocumentVerified, handleDocumentVerified);

    return () => {
      offStatus();
      offSos();
      offPayment();
      offDocument();
    };
  }, [activeRegionId, dispatch, navigate, t, user]);
}
