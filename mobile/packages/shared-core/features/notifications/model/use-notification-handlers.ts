/**
 * Обработчики входящих push и tap-to-open (M10.2).
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { resolveNotificationHref } from './notification-router';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function navigateFromNotification(
  router: ReturnType<typeof useRouter>,
  content: Notifications.NotificationContent,
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

    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      // In-app badge обновится через polling/refetch unread count на экране профиля.
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromNotification(router, response.notification.request.content);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) {
        return;
      }
      navigateFromNotification(router, response.notification.request.content);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [enabled, router]);
}
