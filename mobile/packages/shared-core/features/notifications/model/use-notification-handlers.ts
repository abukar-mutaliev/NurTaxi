/**
 * Обработчики входящих push и tap-to-open (M10.2).
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { loadExpoNotifications } from './expo-notifications-runtime';
import { resolveNotificationHref } from './notification-router';

let handlerInstalled = false;

function navigateFromNotification(
  router: ReturnType<typeof useRouter>,
  content: { data?: unknown },
): void {
  const data = (content.data ?? {}) as Record<string, unknown>;
  const type = typeof data.type === 'string' ? data.type : undefined;
  const href = resolveNotificationHref(type, data);
  if (!href) {
    return;
  }
  router.push(href);
}

export function useNotificationHandlers(enabled = true): void {
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
        navigateFromNotification(router, response.notification.request.content);
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
        navigateFromNotification(router, response.notification.request.content);
      });
    });

    return () => {
      cancelled = true;
      receivedSub?.remove();
      responseSub?.remove();
    };
  }, [enabled, router]);
}
