/**
 * Обработчики входящих push и tap-to-open (M10.2).
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { loadExpoNotifications } from './expo-notifications-runtime';
import { ensurePushChannels } from './push-channels';
import { resolveNotificationHref, type NotificationHref } from './notification-router';

let handlerInstalled = false;

function navigateFromNotification(
  router: ReturnType<typeof useRouter>,
  content: { data?: unknown },
  resolveHref: (type: string | undefined, data: Record<string, unknown>) => NotificationHref | null,
): void {
  const data = (content.data ?? {}) as Record<string, unknown>;
  const type = typeof data.type === 'string' ? data.type : undefined;
  const href = resolveHref(type, data);
  if (!href) {
    return;
  }
  router.push(href as never);
}

export function useNotificationHandlers(
  enabled = true,
  resolveHref: (
    type: string | undefined,
    data: Record<string, unknown>,
  ) => NotificationHref | null = resolveNotificationHref,
): void {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let receivedSub: { remove: () => void } | undefined;
    let responseSub: { remove: () => void } | undefined;

    void loadExpoNotifications().then((Notifications) => {
      if (!Notifications || cancelled) {
        return;
      }

      void ensurePushChannels();

      if (!handlerInstalled) {
        handlerInstalled = true;
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
      }

      receivedSub = Notifications.addNotificationReceivedListener(() => {
        // In-app badge обновится через polling/refetch unread count на экране профиля.
      });
      responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
        navigateFromNotification(router, response.notification.request.content, resolveHref);
      });
      if (cancelled) {
        receivedSub?.remove();
        responseSub?.remove();
        return;
      }

      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!response || cancelled) {
          return;
        }
        navigateFromNotification(router, response.notification.request.content, resolveHref);
      });
    });

    return () => {
      cancelled = true;
      receivedSub?.remove();
      responseSub?.remove();
    };
  }, [enabled, resolveHref, router]);
}
